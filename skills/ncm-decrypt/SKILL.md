---
name: ncm-decrypt
description: 把网易云音乐下载的 NCM 专属加密格式还原为可播放的 MP3/FLAC。支持单文件与整文件夹批量转换，每个产物自动做帧链结构校验并输出报告。纯 Python 零依赖。触发词：ncm转mp3、ncm解密、ncm转换、ncm破解、网易云专属格式、批量转换ncm、convert ncm to mp3、VipSongsDownload、下载的歌其他播放器放不了。仅限个人已购/已下载歌曲的本地格式转换备份，不用于分发受版权保护的内容。
---

# NCM 解密转换（ncm-decrypt）

## 什么时候用

用户有 `.ncm` 文件（网易云下载的专属加密格式），想要能在其他播放器/设备播放的
MP3 或 FLAC。支持单文件和批量两种方式。

## 快速用法

单文件转换（在源文件所在目录运行，输出同目录同名 .mp3/.flac + 封面 jpg）：

```bash
python <skill>/scripts/ncm_convert.py "歌名.ncm"
```

批量转换 + 自动校验 + 报告（推荐）：

```bash
python <skill>/scripts/batch_convert.py "音乐文件夹"            # 已有同名 mp3/flac 会跳过
python <skill>/scripts/batch_convert.py "音乐文件夹" --overwrite  # 全部重转
```

批量结果分类：OK（转换+校验通过）/ WARN（转换成功但校验存疑）/ FAIL（失败，含原因）/
SKIP（已有产物）。汇总表打印到终端，明细写入 `<文件夹>/batch_report.txt`。

单独校验某个产物：

```bash
python <skill>/scripts/validate_mp3.py "歌名.mp3"
```

## 工作流

1. 确认目标是用户自己下载的 .ncm 文件，输出目录可写；
2. 跑 batch_convert.py（多文件）或 ncm_convert.py（单文件）；
3. 看 summary 与 batch_report.txt：只有 OK 才算完成；WARN/FAIL 需人工复查，
   失败原因与排障见 reference/ncm-format-notes.md；
4. 抽查一个产物：validate_mp3.py 应显示 VALID（MP3 要求 ≥10 帧链式校验通过）。

## 技术要点（详见 reference/ncm-format-notes.md）

- 双路径解密：先试经典 RC4 密钥盒算法；失败则利用"密钥流固定 256 字节循环 +
  ID3 零填充区"做实证密钥流恢复，不依赖已知算法；
- 版本差异（长度字段掩码、元数据 AES/base64 顺序）已做候选回退自动适配；
- AES-128 为纯 Python 实现，无需安装任何第三方库。

## 边界

- 仅限个人已购/已下载歌曲的本地格式转换备份用途，不用于分发受版权保护内容；
- 输出文件与源文件同目录，覆盖已有产物需要显式 --overwrite。
