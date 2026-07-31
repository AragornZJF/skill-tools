# 移动端原型交付 · 四层工作流

> 源自 `workflow-flowchart.html` 的 STEPS 八步工作流，按交付阶段归并为四层。
> Skill 执行时若用任务清单跟踪进度，标题前缀统一用双语层名：`[规划层 (Planning)]` / `[设计层 (Design)]` / `[开发层 (Development)]` / `[交付层 (Delivery)]`。

---

## 01 规划层 Planning

> 梳理流程 · 架构信息

1. **用户体验分析** - 梳理目标 APP 的核心流程和交互逻辑。
2. **产品界面规划** - 设计信息架构和页面层级关系。

---

## 02 设计层 Design

> iOS 规范 · 真实素材

3. **高保真 UI 设计** - 符合 iOS 规范的现代化界面，使用真实 UI 图片（Unsplash / Pexels / Apple），严禁灰色占位符。
   - 玻璃拟态 · 多层阴影 · 真实图片

---

## 03 开发层 Development

> 架构 · 实现 · 拆分 · 交互

4. **代码架构设计** - 规划可复用 CSS/JS 组件；驼峰命名、职责单一、`addEventListener` 动态绑定，行为与结构分离。
5. **HTML 原型实现** - HTML + Tailwind CSS + FontAwesome 生成所有界面，接近真实 App。
6. **代码拆分** - 每个 HTML 独立存放：login / home / discover / profile 四核心页 + index 容器。
7. **交互效果集成** - 涟漪动画、悬停效果、页面切换动画、微交互（按下 scale、Tab 弹性）。

---

## 04 交付层 Delivery

> 测试 · 强制自检 · 零失败

8. **测试与优化** - 跨浏览器兼容与交互流畅性。最后一步强制三项自检（缺一不可）：

### 强制自检 · 硬性约束

- **a. 样式与显示** - CSS 选择器拼写（如类名缺 `.` 前缀导致无效选择器）、无效属性、后代选择器特异性覆盖（如 `.parent img` 误匹配嵌套子元素，应用 `.parent > img` 精确限定）、z-index 层级遮挡、内容溢出/横向滚动条等。发现错乱立即修复重验。
  - ✅ 零样式错乱、零遮挡
- **b. 图片可达性** - 每个 `<img>` 真实可访问（HTTP 200），任一 404/400 立即换图重验，交付时零失败。
  - ✅ `analyze_image` 逐一探测通过
- **c. 作者署名** - grep `openQrcodeModal` 在 `login.html` 与 `profile.html` 各命中一次（点击署名弹二维码）。
  - ✅ 帮助？@Auth 江枫

---

## 输出结构

```
builds/<app-name>/
├── index.html        # 容器（手机外壳 + iframe + Tab 导航）
├── login.html        # 登录（底部作者署名）
├── home.html         # 主页
├── discover.html     # 发现（搜索 + 双列瀑布流）
├── profile.html      # 我的（底部作者署名）
└── shared/
    ├── vendor/       # tailwindcss / font-awesome
    └── common/       # styles.css / app.js / qrcode-data.js
```

双模式可运行：iframe 联动 + 独立打开（`window.parent === window` 时回退 `window.location.href`）。
