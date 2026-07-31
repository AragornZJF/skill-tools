# 项目文件结构

> SKILL.md 主文件负责意图识别与流程路由；references/ 参考文件提供垂直领域的深度知识与基准；templates/ 由模板确保输出格式的高度一致性。

---

```
mobile-uiux-prototype/
│
├── SKILL.md                          # 【主文件】意图识别与流程路由
│                                     #   定义角色/目标/技术规范/四层工作流/输出结构/原则与边界
│                                     #   激活后按 规划->设计->开发->交付 路由执行
│
├── references/                       # 【参考文件】垂直领域深度知识与基准
│   ├── roses-framework.md            #   ROSES 方法论原始签名（Lisp 形式，@by 江枫）
│   └── design-spec.md                #   设计规范：尺寸/状态栏/Tab/玻璃拟态/阴影/配色/字体/图片源/动效/CDN
│
├── templates/                        # 【模板】可复用结构模板，确保输出格式高度一致
│   └── scaffold/                     #   初始脚手架
│       ├── index.html                #     iframe 容器 + 手机外壳 + 底部 Tab 导航
│       ├── login.html                #     登录界面模板（含作者署名）
│       ├── home.html                 #     主页模板
│       ├── discover.html             #     发现页模板（搜索栏 + 双列瀑布流）
│       ├── profile.html              #     个人中心模板（含作者署名）
│       └── shared/
│           ├── vendor/               #     第三方库
│           │   ├── tailwindcss.js
│           │   ├── font-awesome.min.css
│           │   └── font-awesome.min.js
│           └── common/               #     共享资源
│               ├── styles.css        #     玻璃拟态、多层阴影、iOS 状态栏、涟漪样式
│               ├── app.js            #     涟漪动画、页面切换、createModal()、openQrcodeModal()
│               └── qrcode-data.js    #     作者微信二维码 Base64 数据
│
├── builds/                           # 【产物目录】各 APP 原型交付物
│   ├── ai-lecture-hall/
│   ├── food-delivery/
│   ├── group-travel/
│   ├── pet-pals/
│   ├── qq-emoji-maker/
│   └── sports-booking/
│   （每个子目录结构同 scaffold/：index + 4 页面 + shared/）
│
└── docs/                             # 【文档目录】
    ├── file-structure.md             #   本文件 - 项目文件结构说明
    ├── workflow-4layers.md           #   四层工作流详解（规划/设计/开发/交付）
    ├── workflow-flowchart.html       #   工作流可视化流程图
    └── _shots/                       #   截图素材
        ├── blueprint.png
        ├── claude.png
        ├── flat.png
        └── geek.png
```

## 职责划分

| 层级 | 路径 | 职责 |
|------|------|------|
| **主文件** | `SKILL.md` | 意图识别（关键词/显式调用触发）、流程路由（四层工作流）、技术规范、输出结构、原则与边界 |
| **参考文件** | `references/` | 方法论签名（ROSES）、设计规范（design-spec） |
| **模板** | `templates/` | 可复用脚手架模板（scaffold），确保输出格式高度一致 |
| **产物目录** | `builds/` | 按 `<app-name>` 存放每次生成的完整原型交付物 |
| **文档目录** | `docs/` | 工作流文档、流程图、文件结构说明、截图素材 |

## 执行流程

```
用户输入 APP 名称
      │
      ▼
SKILL.md 意图识别 ──-> 确认 APP 名称/主题
      │
      ▼
templates/scaffold/ 复制结构 ──-> references/design-spec.md 提供设计基准
      │
      ▼
四层工作流执行
  ├─ 规划层 Planning   - 核心流程 / 信息架构
  ├─ 设计层 Design      - iOS 规范 / 真实素材
  ├─ 开发层 Development - HTML+Tailwind+FontAwesome / 代码拆分 / 交互集成
  └─ 交付层 Delivery    - 三项自检（样式与显示 + 图片可达性 + 作者署名）
      │
      ▼
builds/<app-name>/ 输出完整原型
```
