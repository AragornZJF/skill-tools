/* =========================================================
   共享脚本：Tab 导航、涟漪动画、登录/登出交互
   规范：驼峰命名、职责单一、addEventListener 动态绑定
         （行为与结构分离，不使用内联 onclick）
   ========================================================= */

/* 初始化底部 Tab 导航（iframe 页面切换）—— 仅 index.html 调用 */
function initTabNavigation() {
  const tabBar = document.getElementById('tabBar');
  const appFrame = document.getElementById('appFrame');
  if (!tabBar || !appFrame) return;

  const tabItems = tabBar.querySelectorAll('.tab-item');
  tabItems.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const targetPage = tab.dataset.page;
      switchPage(appFrame, targetPage);
      setActiveTab(tabItems, tab);
    });
  });
}

/* 切换 iframe 页面，带淡入动画 */
function switchPage(frame, page) {
  frame.style.opacity = '0';
  setTimeout(function () {
    frame.src = page;
    frame.addEventListener('load', function onLoad() {
      frame.style.opacity = '1';
      frame.removeEventListener('load', onLoad);
    });
  }, 150);
}

/* 设置当前激活 Tab */
function setActiveTab(tabItems, activeTab) {
  tabItems.forEach(function (tab) {
    tab.classList.remove('active');
  });
  activeTab.classList.add('active');
}

/* 启用涟漪动画 —— 每个页面调用 */
function enableRipple() {
  const rippleEls = document.querySelectorAll('.ripple-btn');
  rippleEls.forEach(function (el) {
    el.addEventListener('click', function (event) {
      createRipple(el, event);
    });
  });
}

/* 创建单次涟漪 */
function createRipple(el, event) {
  const circle = document.createElement('span');
  const diameter = Math.max(el.clientWidth, el.clientHeight);
  const rect = el.getBoundingClientRect();
  circle.style.width = circle.style.height = diameter + 'px';
  circle.style.left = (event.clientX - rect.left - diameter / 2) + 'px';
  circle.style.top = (event.clientY - rect.top - diameter / 2) + 'px';
  circle.classList.add('ripple');
  el.appendChild(circle);
  setTimeout(function () {
    circle.remove();
  }, 600);
}

/* 绑定登录按钮 —— login.html 调用 */
function bindLogin() {
  const loginBtn = document.getElementById('loginBtn');
  if (!loginBtn) return;
  loginBtn.addEventListener('click', function () {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) {
      shakeElement(loginBtn);
      return;
    }
    // 原型模拟：在 iframe 内通知父窗口切换；独立打开时直接跳转
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'login-success' }, '*');
    } else {
      window.location.href = 'home.html';
    }
  });
}

/* 绑定退出按钮 —— profile.html 调用 */
function bindLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', function () {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'logout' }, '*');
    } else {
      window.location.href = 'login.html';
    }
  });
}

/* 简单的错误抖动反馈 */
function shakeElement(el) {
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(0)' }
  ], { duration: 300, easing: 'ease-in-out' });
}
