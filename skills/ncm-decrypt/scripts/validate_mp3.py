# -*- coding: utf-8 -*-
"""Audio structure validator for decrypted NCM outputs.

Module API:
    validate_file(path) -> {
        "verdict": "VALID" | "SUSPECT" | "INVALID",
        "format":  "mp3" | "flac" | "unknown",
        "bitrate": int | None,       # bps (mp3 only)
        "samplerate": int | None,
        "tag_size": int | None,      # ID3 tag size (mp3 only)
        "chain": int,                # consecutive valid frames (mp3 only)
        "reason": str,
        "detail": str,
    }

CLI:
    python validate_mp3.py <audio file>

Verdict rules
- MP3: needs a valid MPEG-1 Layer III header AND >= 10 consecutive frames
  chained by computed frame lengths (rejects FF-FF style false syncs).
- FLAC: needs fLaC magic, sane STREAMINFO, and a clean metadata block walk.
"""
import os
import struct
import sys

MP3_BR = {9: 128000, 10: 160000, 11: 192000, 12: 224000, 13: 256000, 14: 320000}
MP3_SR = {0: 44100, 1: 48000, 2: 32000}


def _valid_mp3_header(hdr: bytes):
    """Return (bitrate, samplerate) for a strict MPEG-1 Layer III header."""
    if len(hdr) < 4 or hdr[0] != 0xFF or (hdr[1] & 0xE0) != 0xE0:
        return None
    ver = (hdr[1] >> 3) & 3        # 3 = MPEG-1
    layer = (hdr[1] >> 1) & 3      # 1 = Layer III
    br_idx = (hdr[2] >> 4) & 0xF
    sr_idx = (hdr[2] >> 2) & 3
    if ver != 3 or layer != 1 or br_idx not in MP3_BR or sr_idx not in MP3_SR:
        return None
    return MP3_BR[br_idx], MP3_SR[sr_idx]


def _mp3_frame_len(hdr: bytes, samplerate: int):
    br_idx = (hdr[2] >> 4) & 0xF
    br = MP3_BR.get(br_idx)
    if not br:
        return None
    pad = (hdr[2] >> 1) & 1
    return int(br * 1152 / (samplerate * 8)) + pad


def _chain_from(plain: bytes, start: int, samplerate: int) -> int:
    """Count consecutive valid frames starting at `start` (incl. first)."""
    pos = start
    chain = 0
    while pos + 4 <= len(plain):
        flen = _mp3_frame_len(plain[pos:pos + 4], samplerate)
        if not flen:
            break
        nxt = pos + flen
        if nxt + 4 <= len(plain) and _valid_mp3_header(plain[nxt:nxt + 4]):
            chain += 1
            pos = nxt
        else:
            break
    return chain


def _validate_mp3(plain: bytes) -> dict:
    res = {"format": "mp3", "verdict": "INVALID", "bitrate": None,
           "samplerate": None, "tag_size": None, "chain": 0, "reason": ""}
    audio0 = 0
    if plain[:3] == b"ID3":
        ver = plain[3]
        if ver == 3:
            tag_size = struct.unpack(">I", plain[6:10])[0]
        elif ver == 4:
            tag_size = (((plain[6] & 0x7F) << 21) | ((plain[7] & 0x7F) << 14)
                        | ((plain[8] & 0x7F) << 7) | (plain[9] & 0x7F))
        else:
            res["reason"] = "unsupported ID3 version v2.%d" % ver
            return res
        res["tag_size"] = tag_size
        audio0 = 10 + tag_size
        res["detail"] = "ID3v2.%d tag %dB" % (ver, tag_size)

    # scan for a start whose header is valid AND chains >= 10 frames
    search_end = min(audio0 + 30000, len(plain) - 4)
    best = None
    i = audio0
    while i < search_end:
        if plain[i] == 0xFF:
            v = _valid_mp3_header(plain[i:i + 4])
            if v:
                br, sr = v
                chain = _chain_from(plain, i, sr)
                if chain >= 10:
                    best = (i, br, sr, chain)
                    break
        i += 1

    if best:
        i, br, sr, chain = best
        res.update({"verdict": "VALID", "bitrate": br, "samplerate": sr,
                    "chain": chain,
                    "reason": "valid frame chain x%d from @%d" % (chain, i)})
    else:
        res["reason"] = "no valid MPEG-1 L3 frame chain after offset %d" % audio0
    return res


def _validate_flac(plain: bytes) -> dict:
    res = {"format": "flac", "verdict": "INVALID", "bitrate": None,
           "samplerate": None, "tag_size": None, "chain": 0, "reason": ""}
    pos = 4
    try:
        # first block must be STREAMINFO (type 0), 34 bytes
        hdr = plain[pos:pos + 4]
        if len(hdr) < 4:
            res["reason"] = "truncated header"
            return res
        last = hdr[0] & 0x80
        btype = hdr[0] & 0x7F
        blen = int.from_bytes(hdr[1:4], "big")
        if btype != 0 or blen < 34:
            res["reason"] = "first metadata block is not STREAMINFO"
            return res
        si = plain[pos + 4:pos + 4 + 34]
        (min_bs, max_bs) = struct.unpack(">HH", si[0:4])
        sr = int.from_bytes(si[10:13], "big") >> 4
        channels = ((si[12] >> 1) & 0x07) + 1
        bits = (((si[12] & 0x01) << 4) | (si[13] >> 4)) + 1
        if not (1 <= sr <= 655350) or not (1 <= channels <= 8):
            res["reason"] = "STREAMINFO fields implausible (sr=%d ch=%d)" % (sr, channels)
            return res
        res["samplerate"] = sr
        res["detail"] = "STREAMINFO sr=%d ch=%d bits=%d blocksize=%d-%d" % (
            sr, channels, bits, min_bs, max_bs)
        pos += 4 + blen
        blocks = 1
        while not last and pos + 4 <= len(plain):
            hdr = plain[pos:pos + 4]
            last = hdr[0] & 0x80
            blen = int.from_bytes(hdr[1:4], "big")
            if blen > len(plain):
                res["reason"] = "metadata block overruns file"
                return res
            pos += 4 + blen
            blocks += 1
        if pos + 2 > len(plain):
            res["reason"] = "no audio frames after metadata"
            return res
        res.update({"verdict": "VALID",
                    "reason": "clean metadata walk (%d blocks), audio @%d" % (blocks, pos)})
        return res
    except Exception as e:
        res["reason"] = "flac parse error: %s" % e
        return res


def validate_file(path: str) -> dict:
    with open(path, "rb") as f:
        plain = f.read()
    res = {"format": "unknown", "verdict": "INVALID", "bitrate": None,
           "samplerate": None, "tag_size": None, "chain": 0,
           "reason": "empty file", "detail": ""}
    if plain[:4] == b"fLaC":
        return _validate_flac(plain)
    if plain[:3] == b"ID3" or plain[:2] == b"\xff\xfb" or plain[:2] == b"\xff\xf3":
        return _validate_mp3(plain)
    res["reason"] = "unrecognized audio magic: %s" % plain[:8].hex()
    return res


def _main():
    for p in sys.argv[1:]:
        r = validate_file(p)
        line = "[%s] %s (%s" % (r["verdict"], p, r["format"])
        if r["bitrate"]:
            line += ", %dkbps" % (r["bitrate"] // 1000)
        if r["samplerate"]:
            line += ", %dHz" % r["samplerate"]
        line += ") " + r["reason"]
        if r.get("detail"):
            line += " | " + r["detail"]
        print(line, flush=True)
        if r["verdict"] != "VALID":
            sys.exit(1)

if __name__ == "__main__":
    _main()
