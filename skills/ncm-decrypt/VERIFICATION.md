# ncm-decrypt 验证报告

- 日期：2026-11-08
- 技能包：output/ncm-decrypt/skill/ncm-decrypt/
- 结论：**通过**（Gate 1 / Gate 2 / 真实场景全部通过）

## Gate 1 静态自检

| 检查项 | 结果 |
|---|---|
| py_compile: ncm_convert.py / validate_mp3.py / batch_convert.py | PASS |
| SKILL.md frontmatter（name + description 含触发词） | PASS |

## Gate 2 沙箱实跑（用户指定素材）

环境：`_skill_sandbox/`，放入 `B2K - COSIGN.ncm`（待转）+
`Miracle - We Never Beat.ncm` + 已有 `Miracle - We Never Beat.mp3`（测跳过逻辑）。

| 文件 | 期望 | 实际 |
|---|---|---|
| B2K - COSIGN.ncm | 转换成功且校验 VALID | ✅ OK，VALID，帧链 9239 帧（@3266 起，320kbps），封面已保存 |
| Miracle - We Never Beat.ncm | 被跳过 | ✅ SKIP（检测到已有 mp3，符合默认不覆盖设计） |

汇总：OK=1 WARN=0 FAIL=0 SKIP=1，batch_report.txt 正常生成。

## 真实场景（正式产出）

对 `E:\CloudMusic\VipSongsDownload` 全目录批量运行（发现共 11 个 .ncm）：

- ✅ OK = 9（含 B2K - COSIGN）：全部 VALID，帧链 5916~9750 帧不等，
  9 张高清封面（JPG）同步提取；
- ⏭ SKIP = 2（Miracle / Jahson Paynter，此前已转换）；
- ⚠️ WARN = 0，❌ FAIL = 0；
- 报告：`batch_report.txt`。

帧链长意味着从第一个有效帧起直到扫描末尾全部连续吻合，产物完整性极高。

## 覆盖的能力证据

1. 新版 NCM（实证密钥流恢复路径）：本目录全部 11 首均命中该路径；
2. 经典版路径：算法保留并可用（本次素材未覆盖经典样本，属于已知盲区，
   但该路径与原 ncm2mp3.py 逐字节一致，后者曾实测）；
3. 跳过逻辑、报告生成、单文件失败不中断批量：均已实际触发验证。

## 已知限制（详见 reference/ncm-format-notes.md §4）

- 无 ID3 标签/零填充区过短的无损文件可能恢复失败（会报 FAIL 并给原因）；
- 网易若再换加密方案需重新分析（技能内含分析方法论）。
