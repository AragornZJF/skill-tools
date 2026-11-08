# NCM 格式笔记（ncm-decrypt 技能参考）

记录自 2026-11 对真实文件的逆向分析。NCM 的头部结构是公开知识，但音频加密存在
两代实现，新版（2024+ 常见）的密钥流不属于任何公开算法，需要实证恢复。

## 1. 文件布局（已对真实文件逐字节验证）

```
偏移      大小        内容
0         8           magic "CTENFDAM"
8         2           gap（经典版 2 字节；个别版本 1 字节，解析时做候选回退）
10        4           key 长度（u32 LE；经典版高位字节 ^0x80，新版无掩码→候选回退）
14        key_len     密钥数据：逐字节 XOR 0x64 → AES-128-ECB(CORE_KEY) → PKCS7 unpad
                      → 前缀 "neteasecloudmusic"(17B) → 歌曲级密钥（约 98 字节）
...       4           meta 长度（同上候选回退）
...       meta_len    元数据（两种封装，见 §2）
...       4           crc32
...       1           gap（新版 1 字节；经典版描述为 5，实为 1+4 即 imglen 重复字段）
...       4           图片长度 u32 LE
...       4           图片长度重复一次（新版）
...       img_len     封面 JPEG（明文！FF D8 FF 开头，FF D9 结尾）
...       其余        加密音频
```

两个固定密钥：CORE_KEY = `hzHRAmso5kInbaxW`，META_KEY = `#14ljk_!\]&0U<'(`。

## 2. 元数据（两种版本）

- 新版：XOR 0x63 → 前缀 `163 key(Don't modify):` → base64 解码
  → AES-128-ECB(META_KEY) → PKCS7 unpad → 去掉 `music:` → JSON
  （JSON 含 musicId/musicName/artist/album/format/bitrate/duration）。
- 经典版：XOR 0x63 → AES-128-ECB(META_KEY) → 同前缀 → base64 → JSON。
  解析器对两种顺序都做尝试（validate 前缀决定走哪条）。

## 3. 音频加密：两代实现

### 3.1 经典版（RC4 密钥盒）

KSA：`c = (swap + last_byte + key[ko]) & 0xFF`（标准 RC4 密钥调度）。
解密流：`j=(i+1)&0xFF; swap=box[j]; c=(swap+j)&0xFF; 交换 box[j],box[c];
输出 ^= box[(box[j]+1)&0xFF]`，box 状态跨 256 块持续演进。
先试解前 64KB，命中 ID3/fLaC/0xFF-Ex 同步即认定走此路径。

### 3.2 新版（实证密钥流恢复）

新版的密钥流仍为 **固定 256 字节循环**（经自相关检验证实：密文
`c[i]⊕c[i+256]` 在 ID3 零填充区出现约 3.6 倍的 0x00 过载，而 lag=255/257
正常），但其内容不来自上述任何公开变体（尝试过主流 (swap+j) 家族、PRGA、
数十种置换/提取组合、AES-CBC/CTR/ECB、DocId/musicId 派生种子，全部不中）。

**实证恢复法**（不依赖知道算法）：

1. 在音频区开头 4KB 内找最长 run：`c[i]==c[i+256]==c[i+512]`
   （密文跨周期自一致 ⇔ 明文为 0 ⇒ 该处密文就是密钥流本身）；
2. run 长度 ≥256 即可覆盖全部 256 个残差，取 `ks[(pos+i)&0xFF] = c[pos+i]`；
3. 全文件按 `plain[i] = c[i] ^ ks[i&0xFF]` 解密。

ID3 标签尾部的零填充区通常有 500+ 字节，网易云 MP3（FFmpeg/Lavf 封装）
几乎必带，故 MP3 命中率极高。

## 3.3 版本差异速查表

| 差异点 | 经典版 | 新版 |
|---|---|---|
| 长度字段 | 高位字节 ^0x80 | 无掩码 |
| gap | 描述不一（1/2 字节） | 2 字节（解析时回退） |
| 元数据封装 | XOR→AES→b64 | XOR→b64→AES |
| 图片长度 | 1 次 | 前后各 1 次（共 2 次） |
| 音频密钥流 | RC4 密钥盒 | 未知算法，固定 256B 循环，实证恢复 |

解析器（ncm_convert.py）对所有差异点做候选回退 + 解密结果前缀校验，
因此两代都能自动处理。

## 4. 排障

- `keystream recovery failed (longest run=N)`：音频开头没有足够长的零填充区
  （常见于无 ID3 标签的 FLAC）。可把 recover_keystream 的 limit 调大到全文件
  再试，或对该文件走人工分析。
- `decrypted head still not audio`：两代算法都不命中，可能网易又出新变体，
  需重新做自相关检验分析（方法见 §3.2）。
- `key decrypt failed`：头部布局对不上，先 hexdump 前 64 字节核对 magic/gap。
- 校验显示 `no valid MPEG-1 L3 frame chain`：产物可疑，勿直接使用，
  检查报告里的 reason 字段。

## 5. 验证方法（validate_mp3.py）

- MP3：严格帧头（MPEG-1 Layer III，码率/采样率在表内）+ 沿帧长字段链式走
  ≥10 帧。FF FF 开头的假帧头会被码率表过滤掉。
- FLAC：fLaC magic + STREAMINFO（采样率 1..655350、声道 1..8）+ 元数据块
  完整遍历到 last-block 标志。
