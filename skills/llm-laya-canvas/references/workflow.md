# AI 设计流水线使用手册

> **DeepSeek 出图 → Laya 常驻裁决 → 画布桥写入 → 受控评审**
>
> 一套经过实战打磨的「AI 生成 + 模型裁决 + 实时画布」工作流，
> 本文档记录全部架构、性能数据、使用守则与踩坑经验。

---

## 一、流程总览

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  DeepSeek    │     │  Laya 常驻    │     │  画布桥      │     │  受控评审     │
│  SVG 出图    │ ──→ │  落点裁决     │ ──→ │  写入画布    │ ──→ │  迭代优化     │
│  (1~3.5s)   │     │  (0.4~5s)   │     │  (0.5~1s)  │     │  (3~17s)    │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

**四步各做什么：**

| 步骤 | 做什么 | 产出 |
|------|--------|------|
| ① DeepSeek 出图 | 按文字 brief 生成 SVG 矢量素材（线稿/图标/场景） | data URL |
| ② Laya 裁决 | 对 3~4 个候选落点打分（0~1 校准概率），选出最优位置 | `{ranked: [{id, score}]}` |
| ③ 画布桥写入 | 把 SVG 按选定坐标写入真实编辑器画布（fabric.js） | 图层 id |
| ④ 受控评审 | 用 Laya 对成品做受控对比打分，指导下一轮迭代 | 评分报告 |

**核心设计原则：** 四步各自独立、可并行（①②无依赖）、可降级（每步都有 fallback）、可复现（句子全存档）。

---

## 二、架构与组件

### 2.1 系统拓扑

```
┌──────────────────────────────────────────────────────────┐
│                    浏览器（canva-editor 页面）              │
│                                                          │
│  ┌────────────────┐   ┌──────────────────────────────┐   │
│  │ Vue 组件        │   │ canvasRelayClient.ts          │   │
│  │ (home/index)   │   │ 长轮询领任务 → 执行 → 回贴结果  │   │
│  └───────┬────────┘   └──────────────┬───────────────┘   │
│          │                           │                    │
│  ┌───────▼────────┐   ┌──────────────▼───────────────┐   │
│  │ designAdapter  │   │ fabric.js                     │   │
│  │ (通用画布接口)   │   │ (canvas.add / set / fire)     │   │
│  └────────────────┘   └──────────────────────────────┘   │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP (localhost:3000)
┌─────────────────────────▼────────────────────────────────┐
│              Vite Dev Server (Node 进程)                   │
│  ┌──────────────────────────────────────────────────┐    │
│  │ canvasBridge.ts (中间件)                          │    │
│  │ 任务队列 + 长轮询分发 + 结果回传                     │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ DeepSeek API │  │ laya_server  │  │ Python 脚本   │
│ (SVG 生成)    │  │ (127.0.0.1:  │  │ (pipeline_   │
│              │  │     8765)    │  │  fast.py)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 2.2 组件职责

| 组件 | 文件 | 进程 | 职责 | 是否碰 fabric |
|------|------|------|------|:---:|
| **designAdapter.ts** | canva-editor/src/agent/ | 浏览器 | 通用画布接口 → fabric.js | ✓ 唯一 |
| **canvasRelayClient.ts** | canva-editor/src/agent/ | 浏览器 | 长轮询领任务 → 执行 → 回贴 | ✗ |
| **canvasBridge.ts** | canva-editor/src/agent/ | Node (Vite) | HTTP 中间件 + 任务队列 | ✗ |
| **agentState.ts** | canva-editor/src/agent/ | 浏览器 | 适配器持有者（桥与页面的中转） | ✗ |
| **laya_server.py** | poster_assets/ | Python (分离) | Laya 常驻推理服务 :8765 | ✗ |
| **pipeline_fast.py** | poster_assets/ | Python | 编排：DeepSeek ∥ Laya → 写入 | ✗ |

### 2.3 为什么需要"中继"而不是直接调用

**关键架构约束：Node 进程与浏览器页面的模块状态永不互通。**

```
vite.config.ts ──→ canvasBridge.ts ──→ getAdapter() 永远是 null
                                            ↑
浏览器 index.vue ──→ setCanvasAdapter(a) ────┘ （但只在浏览器进程里）
```

解决方案：**HTTP 长轮询中继**

```
Python ──POST /canvas/layer──→ Node 队列 ←──GET /canvas/poll── 浏览器领取
                                       │                        │ 执行
                                       ↓                        ↓
Python ←─────HTTP 响应────────── Node 队列 ←──POST /canvas/result── 回贴结果
```

---

## 三、环境准备（一次性）

### 3.1 前置要求

| 组件 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥ 18 | Vite dev server |
| Python | **3.10~3.12，64 位** | Laya + 流水线脚本 |
| DeepSeek API Key | — | SVG 生成 |
| canva-editor | vue-fabric-editor 分支 | 画布宿主 |

> ⚠️ **不要用 32 位 Python 或 3.13+**：torch 没有 32 位轮子，3.13+ 的兼容性未验证。

### 3.2 Python 环境安装（如果需要）

```bash
# 方式一：直接下载官方安装包（推荐，华为云镜像）
curl -o python-3.11.9-amd64.exe https://mirrors.huaweicloud.com/python/3.11.9/python-3.11.9-amd64.exe
python-3.11.9-amd64.exe /quiet InstallAllUsers=0 TargetDir=C:\devtools\py311 PrependPath=0 Include_pip=1

# 方式二：用 pyenv-win
pyenv install 3.11.9
```

### 3.3 安装 Laya + 依赖

```bash
# 清华镜像（torch 在 Windows PyPI 上就是 CPU 版，~200MB，无需 CUDA 版的 2GB）
C:\devtools\py311\python.exe -m pip install laya -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 3.4 配置 DeepSeek API Key

写入文件 `~/.deepchat/skills/llm-laya-canvas/.env`：
```
DEEPSEEK_API_KEY=sk-xxxxxxxx
```

> 流水线脚本会自动加载此文件到进程环境变量。

### 3.5 启动 Laya 常驻服务

```bash
# WMI 分离启动（不受终端会话回收影响）+ 日志落盘
cmd /c "set HF_ENDPOINT=https://hf-mirror.com&& python -u laya_server.py > laya_server.log 2>&1"
```

- 模型加载约 **95~120s**（首次），之后**常驻内存（~2.9GB）**
- 就绪探测：`curl http://127.0.0.1:8765/health` → `{"ready": true}`

### 3.6 启动 Vite Dev Server

```bash
cd canva-editor && npx vite serve
# 确认 config 里 server.open = false（防止多标签页僵尸）
```

---

## 四、使用方法

### 4.1 单元素流水线（最常用）

```bash
# 语法
python -u pipeline_fast.py --brief "元素描述" --label LABEL [--spots 落点.json] [--dry]

# 示例：生成松枝线稿并放到 Laya 选定的最佳位置
python -u pipeline_fast.py --brief \
  "minimal hand-drawn pine sprig line art, deep forest green #2F5D46, thin brush strokes" \
  --label PINE --spots spots_pine.json
```

- `--dry`：只测速，不写画布
- `--spots`：自定义候选位 JSON（缺省用右上角四点）
- 候选位 JSON 格式：
```json
[
  {"id": "spot_a", "x": 630, "y": 950, "w": 90,
   "sentence": "The compass sits in the right-middle whitespace, clear of all text.",
   "features": {"overlap": 0.0, "margin": 0.9, "alignment": 0.45, "centered": 0.6}}
]
```

> ⚠️ **`sentence` 和 `features` 必填**——漏掉会导致 Laya 对空输入打出全 0.5 的均匀分。

### 4.2 批量元素

```bash
# 串行调用（每个元素 ~4s）
for spot_file in spots_compass.json spots_campfire.json; do
  python -u pipeline_fast.py --brief "..." --spots $spot_file --label ...
done
```

### 4.3 画布备份与恢复

```bash
# 备份（把当前画布全部可见层存为 JSON）
python fix_and_backup.py

# 恢复（隐藏当前 → 按备份重放）
python canvas_restore.py
```

> 备份文件 `canvas_backup.json` 包含全部图层的类型/坐标/属性/图片 data URL，可跨实例恢复。

### 4.4 画布桥 REST API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/canvas/snapshot` | GET | 画布快照（全部图层规格） |
| `/canvas/capabilities` | GET | 适配器能力声明 |
| `/canvas/layer` | POST | 单动作：`{"action":"add","layer":{...}}` |
| `/canvas/layer` | POST | 批量：`{"actions":[{...},...]}` |
| `/canvas/poll` | GET | 浏览器领任务（内部） |
| `/canvas/result` | POST | 浏览器回贴结果（内部） |
| `/canvas/status` | GET | 桥诊断（领导者/队列/连接） |

### 4.5 Laya 推理服务 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | `{"ready": bool}` |
| `/score` | POST | `{"candidates":[...], "question":"..."}` → `{"ranked":[...]}` |

---

## 五、性能实测

### 5.1 各环节耗时

| 环节 | 冷启动 | 热状态（常驻服务） | 说明 |
|------|--------|------------------|------|
| DeepSeek 生成 | 1~3.5s | 1~3.5s | API 网络延迟为主 |
| Laya 打分（4 候选） | 115s | **0.4~5s** | 115s = 进程冷启动加载 2.26GB 模型 |
| 画布写入（批量） | — | **0.5~1.5s** | 逐层 1s/层；批量一次事务 |
| **全流水线（并行）** | — | **3~4s/元素** | DeepSeek ∥ Laya，取 max |

### 5.2 Laya 推理性能

| 指标 | 数值 | 条件 |
|------|------|------|
| 单次推理 | ~300ms | CPU、Router 路由模式（多检查点） |
| 12 次预测（3 问法×4 候选） | ~3.6s | 常驻热状态 |
| 模型加载 | 95~120s | 仅首次（2.26GB 检查点） |
| 确定性 | **0.0000 方差** | 同句同批必同分 |

> 35ms 是 GPU + 单检查点的理论值；CPU + Router 模式实测 ~300ms/次。

---

## 六、Laya 使用守则

> 从实战中总结的五条铁律，违反任何一条都会导致错误判断。

### 规则 1：只做受控对比

**逐字相同、只改一个变量。** Laya 的分数只在同族句子内有解释力。

```
✅ 正确："The ridge sits below the sun with a clear gap."  vs
         "The ridge overlaps the lower half of the sun."   （只改位置关系）

❌ 错误："The ridge sits below the sun with a clear gap."  vs
        "A majestic mountain landscape dominates the scene." （句式和内容全变了）
```

### 规则 2：几何在代码里算，结论用文字喂

**Laya 不会算数。** 坐标、重叠面积、边距必须由代码预先计算，然后转成一句状态描述：

```json
{
  "sentence": "The element sits in the right-middle whitespace beside the third row, clear of all text.",
  "features": {"overlap": 0.0, "margin": 0.9, "alignment": 0.45, "centered": 0.65}
}
```

### 规则 3：相信方向与量级，不信小差距

| 分差 | 可信度 | 示例 |
|------|--------|------|
| ≥ 0.3 | **强信号** | 0.83 vs 0.35（背景纹理）；0.66 vs 0.17（山峰重叠） |
| 0.05~0.15 | **中等信号** | 0.66 vs 0.55（同区域两个候选位） |
| < 0.05 | **噪声级别** | 忽略，不要据此做设计决定 |

### 规则 4：不要跨句子、跨问题比绝对值

同一背景在"干净透气"问法下 **0.83**、在"整体构图"问法下 **0.57** ——分数取决于问法，**只在同问题内可比**。

### 规则 5：记录每次用的完整句子

存档到 `review_sentences.json`。下次复验用逐字相同的句子，零漂移复现。

---

## 七、踩坑记录与修复（按严重性排序）

| # | 问题 | 根因 | 修复 | 教训 |
|---|------|------|------|------|
| 1 | **Node/浏览器状态不互通** | vite.config 在 Node 进程，适配器在浏览器进程 | HTTP 长轮询中继架构 | 前后端模块状态永不共享 |
| 2 | **ESLint 阻断页面** | 空箭头函数 `() => {}` 触发 `no-empty-function`，vite-plugin-eslint 将转换整体 500 | 改为 `() => undefined` | **服务端转译失败 = 页面静默运行旧代码** |
| 3 | **背景跑到最上层** | 恢复脚本按"顶层在前"的备份顺序重放 | 倒序重放（底层先加） | 备份顺序决定 z-order |
| 4 | **多标签页抢任务** | HMR 残留循环 + Vite open:true 弹新标签 | 领导者粘性路由 + 协议版本号选举 | 每次重启弹的新标签=僵尸 |
| 5 | **HMR 后 rAF 死锁** | 被遮挡标签页 `requestAnimationFrame` 永不触发 | `Promise.race([rAF, setTimeout(120)])` | 批量事务的 ready() 不能纯依赖 rAF |
| 6 | **文字 add 报 500** | 备份缺 fontFamily → 显式传 `undefined` 覆盖 fabric 默认 → `.toLowerCase()` 崩溃 | 客户端补默认字体 | fabric 对 `fontFamily: undefined` 零容忍 |
| 7 | **图片 update 后缩放丢失** | `obj.set({width})` 改的是原始宽度，不是显示缩放 | 用 addLayer 重放置（scaleToWidth 正确） | **图片层不要用 update 改尺寸** |
| 8 | **服务被会话回收** | 后台子进程随终端会话一起被杀 | WMI 分离启动（`Invoke-CimMethod`） | 长驻服务必须脱离父进程树 |
| 9 | **控制器 Page.reload 无效** | CDP reload 静默失败（标记实验证实） | `location.hash` 切路由 或 WMI 重启 server | 别信任 CDP reload，用标记实验验证 |

---

## 八、文件清单

```
poster_assets/
├── pipeline_fast.py          # ⭐ 参数化并行流水线（一条命令一个元素）
├── laya_server.py            # ⭐ Laya 常驻推理服务
├── canvas_restore.py         # ⭐ 画布一键恢复（从备份）
├── fix_and_backup.py         # 备份当前画布到 JSON
├── build_seven2.py           # 七日海报底版生成（渐变+清单+文字）
├── build_starry.py           # 星空夜风格素材生成
├── build_sun.py              # 太阳元素生成
├── build_laya_element.py     # 单元素全链路（旧版，串行）
├── comprehensive_review.py   # Laya 整体评审（7 维 + 9 元素）
├── laya_audit.py             # Laya 元素体检（9 项现状打分）
├── laya_review.py            # Laya 双组评审（设计决策 + 元素落点）
├── review_sentences.json     # 评审句子存档（可复现）
├── canvas_backup.json        # 画布备份（最新快照）
├── bg_seven2.svg             # 绿色海报背景
├── spots_*.json              # 各元素候选位配置
├── ai_*.svg                  # DeepSeek 生成的 SVG 素材
└── *.svg                     # 其他设计素材
```

---

## 九、历史评分记录

### 设计迭代轨迹

| 轮次 | 版本 | A组均分 | B组均分 | 关键改动 |
|------|------|---------|---------|---------|
| R1 | 奶油底 + 黑体等距列表 | — | — | 初始版 |
| R2 | 衬线双行标题 + 红印章 + 幽灵数字 | — | — | 编辑级排版 |
| R3 | 去标点 + 双声部副题 + 高亮回声 | — | — | 批评家反馈闭环 |
| R4 | + AI 松枝（Laya 选位） | — | — | 首个 AI 元素 |
| R5 | 呼吸绿色系全量换色 | — | — | 色彩统一 |
| R6 | 三项精修 | — | — | 收官 |
| — | 星空夜版（历史版本，可恢复） | — | — | 隐藏保留 |
| — | **最终版**（简化背景 + 去重复） | — | — | **Laya 全维通过** |

### Laya 关键受控对比记录

| 对比 | 结果 | 结论 |
|------|------|------|
| 山峰：不重叠 vs 轻触 vs 重叠 | **0.66 > 0.36 > 0.17** | 单调递减，重叠=不干净 |
| 背景：纯渐变 vs 折中 vs 全纹理 | **0.83 > 0.36 ≈ 0.34** | 二元断崖，纹理减半无效 |
| 印章位置：右下 vs 右上 | 0.80 vs 0.77 | 均可，差距在噪声带内 |
| 徽章 vs 印章位 | 0.86 vs 0.77 | 均可 |
| **确定性校准** | 同句 ×3 | **极差 = 0.0000** |
