# -*- coding: utf-8 -*-
"""NCM (NetEase Cloud Music encrypted format) -> original audio converter.

Pure Python, no third-party dependencies (built-in pure AES-128-ECB).

Handles two audio-cipher generations:
1. Classic RC4-like key box (validated by decrypted-key prefix).
2. Newer variant with a non-standard fixed 256-byte repeating keystream,
   recovered empirically via period-consistency analysis
   (self-correlation test -> zero/padding runs -> keystream bytes).

Layout (all verified against real files):
  [8B magic "CTENFDAM"][2B gap][4B key len][key data]
  [4B meta len][meta data][4B crc32][1B gap][4B img len][4B img len dup]
  [img data][audio]
Key blob: XOR 0x64 -> AES-128-ECB(core key) -> strip "neteasecloudmusic"
Meta (new): XOR 0x63 -> strip "163 key(Don't modify):" -> base64
            -> AES-128-ECB(META_KEY) -> PKCS7 unpad -> strip "music:" -> JSON

CLI:
    python ncm_convert.py <file.ncm> [more.ncm ...]
API:
    convert(path, log=None) -> {"ok","out","cover","meta","ext","size"}
"""
import base64
import json
import os
import struct
import sys

CORE_KEY = b"hzHRAmso5kInbaxW"
META_KEY = b'#14ljk_!\\]&0U<\'('
KEY_PREFIX = b"neteasecloudmusic"

# ---------------- pure-python AES-128 decrypt ----------------
def _gen_sbox():
    sbox = [0] * 256
    p = q = 1
    while True:
        p = p ^ ((p << 1) & 0xFF) ^ (0x1B if p & 0x80 else 0)
        q ^= (q << 1) & 0xFF
        q ^= (q << 2) & 0xFF
        q ^= (q << 4) & 0xFF
        q &= 0xFF
        if q & 0x80:
            q ^= 0x09
        x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) \
              ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4))
        sbox[p] = (x ^ 0x63) & 0xFF
        if p == 1:
            break
    sbox[0] = 0x63
    return sbox

SBOX = _gen_sbox()
INV_SBOX = [0] * 256
for _i in range(256):
    INV_SBOX[SBOX[_i]] = _i
RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36]

def _xtime(a):
    hi = a & 0x80
    a = (a << 1) & 0xFF
    return a ^ 0x1B if hi else a

def _gmul(a, b):
    r = 0
    for _ in range(8):
        if b & 1:
            r ^= a
        a = _xtime(a)
        b >>= 1
    return r & 0xFF

def _expand_key(key: bytes):
    w = [list(key[4*i:4*i+4]) for i in range(4)]
    for i in range(4, 44):
        t = list(w[i-1])
        if i % 4 == 0:
            t = [SBOX[t[1]] ^ RCON[i//4 - 1], SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]]
        w.append([w[i-4][j] ^ t[j] for j in range(4)])
    return [sum(w[4*r:4*r+4], []) for r in range(11)]

def _inv_shift_rows(s):
    for r in range(1, 4):
        row = [s[r + 4*i] for i in range(4)]
        row = row[-r:] + row[:-r]
        for i in range(4):
            s[r + 4*i] = row[i]

def _inv_mix_columns(s):
    for c in range(4):
        a = s[4*c:4*c+4]
        s[4*c+0] = _gmul(a[0], 14) ^ _gmul(a[1], 11) ^ _gmul(a[2], 13) ^ _gmul(a[3], 9)
        s[4*c+1] = _gmul(a[0], 9)  ^ _gmul(a[1], 14) ^ _gmul(a[2], 11) ^ _gmul(a[3], 13)
        s[4*c+2] = _gmul(a[0], 13) ^ _gmul(a[1], 9)  ^ _gmul(a[2], 14) ^ _gmul(a[3], 11)
        s[4*c+3] = _gmul(a[0], 11) ^ _gmul(a[1], 13) ^ _gmul(a[2], 9)  ^ _gmul(a[3], 14)

def aes128_ecb_decrypt(data: bytes, key: bytes) -> bytes:
    rks = _expand_key(key)
    out = bytearray()
    for off in range(0, len(data), 16):
        s = list(data[off:off+16])
        for i in range(16):
            s[i] ^= rks[10][i]
        for r in range(9, 0, -1):
            _inv_shift_rows(s)
            for i in range(16):
                s[i] = INV_SBOX[s[i]]
            for i in range(16):
                s[i] ^= rks[r][i]
            _inv_mix_columns(s)
        _inv_shift_rows(s)
        for i in range(16):
            s[i] = INV_SBOX[s[i]]
        for i in range(16):
            s[i] ^= rks[0][i]
        out.extend(s)
    return bytes(out)

def unpad(data: bytes) -> bytes:
    return data[:-data[-1]] if data else data

def len_candidates(raw: bytes):
    v0 = struct.unpack("<I", bytes(raw))[0]
    m = bytearray(raw); m[1] ^= 0x80
    v1 = struct.unpack("<I", bytes(m))[0]
    seen = []
    for v in (v0, v1):
        if v not in seen:
            seen.append(v)
    return seen

def read_key(f, log) -> bytes:
    raw = f.read(4)
    for klen in len_candidates(raw):
        if not (32 <= klen <= 4096 and klen % 16 == 0):
            continue
        kd = bytearray(f.read(klen))
        if len(kd) < klen:
            continue
        for i in range(klen):
            kd[i] ^= 0x64
        key = unpad(aes128_ecb_decrypt(bytes(kd), CORE_KEY))
        if key.startswith(KEY_PREFIX):
            return key[len(KEY_PREFIX):]
        f.seek(-(4 + klen), 1)
    raise ValueError("key decrypt failed for all length candidates")

def read_meta(f, log):
    raw = f.read(4)
    if raw == b"\x00\x00\x00\x00":
        return {}
    for mlen in len_candidates(raw):
        if not (0 < mlen <= 65536):
            continue
        md = bytearray(f.read(mlen))
        if len(md) < mlen:
            continue
        for i in range(mlen):
            md[i] ^= 0x63
        # variant NEW: XOR-0x63 -> strip prefix -> base64 -> AES -> JSON
        if bytes(md).startswith(b"163 key(Don't modify):"):
            try:
                payload = base64.b64decode(md[22:])
                dec = unpad(aes128_ecb_decrypt(payload, META_KEY))
                meta = json.loads(dec[6:].decode("utf-8", "replace"))
                log("[step] metadata ok (b64->aes), len=%d" % mlen)
                return meta
            except Exception:
                log("[warn] metadata block matched but decode failed, len=%d" % mlen)
                return {}
        # variant CLASSIC: XOR-0x63 -> AES -> strip prefix -> base64 -> JSON
        try:
            dec = unpad(aes128_ecb_decrypt(bytes(md), META_KEY))
            if dec.startswith(b"163 key(Don't modify):"):
                md2 = base64.b64decode(dec[22:])
                meta = json.loads(md2[6:])
                log("[step] metadata ok (aes->b64), len=%d" % mlen)
                return meta
        except Exception:
            pass
        f.seek(-(4 + mlen), 1)
    log("[warn] metadata unreadable, skipping")
    return {}

# ---------------- classic key box (old NCM) ----------------
def build_key_box(key: bytes):
    box = list(range(256))
    c = last_byte = key_offset = 0
    for i in range(256):
        swap = box[i]
        c = (swap + last_byte + key[key_offset]) & 0xFF
        key_offset += 1
        if key_offset >= len(key):
            key_offset = 0
        box[i] = box[c]
        box[c] = swap
        last_byte = c
    return box

def xor_classic(data: bytes, box) -> bytes:
    out = bytearray(len(data))
    for i in range(len(data)):
        j = (i + 1) & 0xFF
        swap = box[j]
        cc = (swap + j) & 0xFF
        box[j] = box[cc]
        box[cc] = swap
        out[i] = data[i] ^ box[(box[j] + 1) & 0xFF]
    return bytes(out)

def looks_like_audio(b: bytes) -> bool:
    return (b[:4] == b"fLaC" or b[:3] == b"ID3"
            or (len(b) >= 2 and b[0] == 0xFF and (b[1] & 0xE0) == 0xE0))

# ---------------- empirical keystream recovery (new NCM) ----------------
def recover_keystream(c: bytes, log) -> bytes:
    """Find longest run near the start where c[i]==c[i+256]==c[i+512]
    (period-256 keystream + zero padding plaintext). Those bytes ARE the
    keystream."""
    n = len(c)
    best_len, best_pos = 0, -1
    run_start = None
    limit = min(n - 512, 4096)      # zero-padding lives near file start (ID3 tag)
    for i in range(limit):
        if c[i] == c[i + 256] and c[i] == c[i + 512]:
            if run_start is None:
                run_start = i
        else:
            if run_start is not None and i - run_start > best_len:
                best_len, best_pos = i - run_start, run_start
            run_start = None
    if run_start is not None and limit - run_start > best_len:
        best_len, best_pos = limit - run_start, run_start
    if best_len < 256:
        raise ValueError("keystream recovery failed (longest run=%d)" % best_len)
    ks = bytearray(256)
    for i in range(best_len):
        ks[(best_pos + i) & 0xFF] = c[best_pos + i]
    log("[step] keystream recovered from run len=%d @%d" % (best_len, best_pos))
    return bytes(ks)

def xor_fixed(data: bytes, ks: bytes) -> bytes:
    n = len(data)
    reps = (n + 255) // 256
    mask = (ks * reps)[:n]
    return (int.from_bytes(data, "big") ^ int.from_bytes(mask, "big")).to_bytes(n, "big")

# ---------------- main ----------------
def convert(path: str, log=None) -> dict:
    """Convert one NCM file. Returns dict with output info; raises on failure."""
    def _noop(*a):
        pass
    log = log or _noop
    with open(path, "rb") as f:
        if f.read(8) != b"CTENFDAM":
            raise ValueError("Not an NCM file")
        f.seek(2, 1)  # 2-byte gap
        key = read_key(f, log)
        meta = read_meta(f, log)

        f.read(4)      # crc32
        f.seek(1, 1)   # 1-byte gap
        image_size = struct.unpack("<I", f.read(4))[0]
        f.read(4)      # duplicate image size field
        if not (0 < image_size < 4 * 1024 * 1024):
            raise ValueError("implausible image size: %d" % image_size)
        image = f.read(image_size)
        c = f.read()
        log("[step] image_size=%d audio bytes=%d" % (image_size, len(c)))

        # path 1: classic RC4 key box
        audio = xor_classic(c[:65536], build_key_box(key))
        if looks_like_audio(audio[:16]):
            audio = xor_classic(c, build_key_box(key))
            log("[step] decrypted with classic RC4 key box")
        else:
            # path 2: empirically recovered fixed keystream
            ks = recover_keystream(c, log)
            audio = xor_fixed(c, ks)
            log("[step] decrypted with recovered fixed keystream")

        if not looks_like_audio(audio[:16]):
            raise ValueError("decrypted head still not audio: %s" % audio[:16].hex())

        ext = "flac" if audio[:4] == b"fLaC" else "mp3"
        out = os.path.splitext(path)[0] + "." + ext
        with open(out, "wb") as o:
            o.write(audio)

        cover = None
        if image[:3] == b"\xff\xd8\xff":
            cover = os.path.splitext(path)[0] + "-cover.jpg"
            with open(cover, "wb") as o:
                o.write(image)

        artist = "/".join(a[0] for a in meta.get("artist", [])) or "?"
        return {
            "ok": True,
            "out": out,
            "cover": cover,
            "meta": meta,
            "ext": ext,
            "size": len(audio),
            "title": meta.get("musicName", "?"),
            "artist": artist,
            "album": meta.get("album", "?"),
        }

if __name__ == "__main__":
    def _log(*a):
        print(*a, flush=True)
    for p in sys.argv[1:]:
        print("-> converting:", p, flush=True)
        r = convert(p, _log)
        print("[done]", r["out"], "| title=%s | artist=%s | %.2f MB"
              % (r["title"], r["artist"], r["size"] / 1048576), flush=True)
