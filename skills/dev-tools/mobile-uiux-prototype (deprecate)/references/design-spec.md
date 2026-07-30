# 设计规范 (Design Spec)

供 uiux-prototype-generator 生成高保真原型时遵循。

## 一、尺寸与设备

- 设备：iPhone 15 Pro
- 视口：375 × 812 px（逻辑像素）
- 手机外壳：圆角 ~55px，深色边框，可选灵动岛（Dynamic Island）
- 安全区：顶部状态栏 44px，底部 Tab 栏 ~83px（含安全区 34px）

## 二、iOS 状态栏

顶部固定，高度 44px，包含：
- 左：时间（如 9:41，Apple 经典时间）
- 右：信号、Wi-Fi、电池图标（用 FontAwesome）

## 三、底部 Tab 导航

- 高度 ~83px，玻璃拟态背景（半透明 + 模糊）
- 3-4 个 Tab，图标 + 文字，选中态高亮主题色
- 用于 iframe 页面切换（首页/发现/我的等按主题命名）

## 四、玻璃拟态 (Glassmorphism)

核心样式参数：

```css
background: rgba(255, 255, 255, 0.65);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.3);
border-radius: 16px;
```

## 五、多层阴影系统

```css
/* 卡片 */
box-shadow:
  0 1px 2px rgba(0,0,0,0.04),
  0 4px 8px rgba(0,0,0,0.06),
  0 12px 24px rgba(0,0,0,0.08);

/* 浮起按钮 */
box-shadow:
  0 2px 4px rgba(0,0,0,0.08),
  0 8px 16px rgba(0,0,0,0.12);
```

## 六、配色（按主题调整）

- 主色：根据 APP 主题选（运动健康→活力橙/绿；记账→稳重蓝；社交→紫粉渐变）
- 背景：浅灰白渐变 `#f5f5f7 → #ffffff`（iOS 风格）
- 文字：主 `#1d1d1f`，次 `#86868b`
- 渐变常用于 CTA 按钮和顶部 Header

## 七、字体

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
             "PingFang SC", "Helvetica Neue", sans-serif;
```

## 八、真实图片素材源

**严禁灰色占位符**。按主题从以下源选择免费可商用图片：

| 源 | 用途 | 示例 URL 形式 |
|----|------|-------------|
| Unsplash | 高质量摄影图（头像、Banner、内容图） | `https://images.unsplash.com/photo-xxx?w=400` |
| Pexels | 同上 | `https://images.pexels.com/photos/xxx/...` |
| Apple 官方 UI 资源 | SF Symbols 风格图标参考 | - |
| UI Avatars | 生成字母头像（兜底） | `https://ui-avatars.com/api/?name=XX` |

选图原则：与 APP 主题强相关（运动健康选健身/食物/自然图）。

## 九、交互动效

- **涟漪动画 (ripple)**：点击按钮/卡片时从点击点扩散的半透明圆，见 `scaffold/shared/app.js`。
- **悬停效果**：`transform: translateY(-2px)` + 阴影加深，`transition: 0.2s ease`。
- **页面切换**：iframe 切换时淡入 + 轻微上移（`opacity` + `translateY`）。
- **微交互**：按钮按下 `scale(0.97)`、Tab 切换图标弹性缩放。

## 十、CDN 引用

```html
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
```
