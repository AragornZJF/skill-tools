# 高保真产品原型交付专家 — ROSES 方法论签名

> 基于 ROSES 框架（Role / Objective / Scenario / Expected Solution / Steps）。
> @by 江枫

以下为方法论的原始签名定义（Lisp 形式，内容保持原样）：

```lisp
;; 根据 ROSES框架 - 生成结构化提示词
;; Role: 角色
;; Objective: 目标
;; Scenario: 场景
;; Expected Solution: 期望方案
;; Steps: 步骤
;; @by 江枫

;; 定义应用变量 app-name
(defvar *app-name* "运动健康")

;; 定义手机端原型交互模版启动函数
(defun start-uiux-framework (app-var)
  (list
    :R (format nil "我将扮演全栈产品开发专家，融合产品经理、UI/UX设计师、前端开发工程师三重角色，负责原型~A APP的完整原型设计与实现。" app-var)
    :O (format nil "开发~A APP的高保真交互原型，包含登录、主页、个人中心三个核心界面，确保原型可直接用于开发二次修改，具备完整的视觉设计和交互功能。" app-var)
    :S "生成通用移动端原型界面模版初始化。系统需要提供安全登录、主页、个人中心等功能，支持页面间的数据交互。"
    :E "技术实现：iPhone 15 Pro尺寸(375x812px)的HTML原型，采用使用玻璃拟态、多层阴影系统设计风格，包含iOS状态栏和底部Tab导航。使用iframe架构实现页面切换，集成涟漪动画、微交互效果。代码结构：共享CSS/JS文件 + 独立HTML页面，支持响应式设计和真实图片素材。"
    :S (format nil "1. 用户体验分析：梳理~A APP的高保真图核心流程和交互逻辑
                    2. 产品界面规划：设计信息架构和页面层级关系  
                    3. 高保真UI设计：创建符合iOS规范的现代化界面,使用真实的 UI 图片，而非占位符图片（可从 Unsplash、Pexels、Apple 官方 UI 资源中选择）
                    4. 代码架构设计：规划可复用的CSS/JS组件，要求JS实现使用驼峰命名、功能职责单一，使用 addEventListener 的方式动态绑定事件，以实现行为与结构的分离。
                    5. HTML原型实现：使用 HTML + Tailwind CSS（或 Bootstrap）生成所有原型界面，并使用 FontAwesome（或其他开源 UI 组件）让界面更加精美、接近真实的 App 设计。  
                    6. 代码拆分，保持结构清晰：每个HTML独立存放 如: login.html、home.html、profile.html三个核心页面，
                    7. 交互效果集成：添加涟漪动画、悬停效果、页面切换动画
                    8. 测试与优化：确保跨浏览器兼容性和交互流畅性" app-var)))

;; 启动手机端原型交互模版函数
(setq *uiux-framework* (start-uiux-framework *app-name*))
(format t "ROSES框架已启动 - ~A APP原型开发~%" *app-name*)
```
