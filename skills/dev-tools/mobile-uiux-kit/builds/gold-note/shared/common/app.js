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

/* 启用涟漪动画 —— 事件委托方式，动态渲染元素自动生效（每个页面调用一次） */
function enableRipple() {
  document.addEventListener('click', function (event) {
    const el = event.target.closest('.ripple-btn');
    if (el) createRipple(el, event);
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

/* ---------- 通用模态框 ---------- */
function createModal(options) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-card">' +
      '<button class="modal-close"><i class="fa-solid fa-xmark"></i></button>' +
      (options.title ? '<div class="modal-title">' + options.title + '</div>' : '') +
      '<div class="modal-body">' + (options.bodyHTML || '') + '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var card = overlay.querySelector('.modal-card');
  var closeBtn = overlay.querySelector('.modal-close');

  function open() {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (options.onOpen) options.onOpen(overlay);
  }
  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (options.onClose) options.onClose(overlay);
    setTimeout(function () { overlay.remove(); }, 300);
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  return { open: open, close: close, el: overlay };
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

/* 打开作者二维码弹窗 */
function openQrcodeModal() {
  createModal({
    title: '扫码联系作者',
    bodyHTML:
      '<img class="modal-qrcode" src="data:image/jpeg;base64,' + QRCODE_DATA + '" alt="二维码">' +
      '<div class="modal-author">作者：江枫，前端、AI应用工程师</div>'
  }).open();
}

/* ---------- 数字滚动动画（金记专用工具） ----------
   el: 目标元素，data-target 为最终数值；支持 prefix/suffix
   例：<span class="num" data-target="86520">0</span> */
function animateNumber(el, options) {
  if (!el) return;
  var target = parseFloat(el.dataset.target || '0');
  var duration = (options && options.duration) || 900;
  var prefix = (options && options.prefix) || '';
  var suffix = (options && options.suffix) || '';
  var decimals = (options && options.decimals) || 0;
  var start = null;

  function step(timestamp) {
    if (!start) start = timestamp;
    var progress = Math.min((timestamp - start) / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3);
    var current = target * eased;
    el.textContent =
      prefix +
      current.toLocaleString('zh-CN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }) +
      suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- 进度条填充动画（金记专用工具） ----------
   el: .progress-fill 元素，data-percent 为目标百分比 */
function animateProgress(el) {
  if (!el) return;
  var target = parseFloat(el.dataset.percent || '0');
  setTimeout(function () {
    el.style.width = target + '%';
  }, 200);
}

/* ---------- 轻提示 Toast ---------- */
function showToast(message) {
  var toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText =
    'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);' +
    'background:rgba(28,39,71,0.92);color:#fff;font-size:13px;' +
    'padding:10px 18px;border-radius:999px;z-index:1000;' +
    'box-shadow:0 8px 20px rgba(0,0,0,0.25);' +
    'opacity:0;transition:opacity 0.25s ease;' +
    'pointer-events:none;';
  document.body.appendChild(toast);
  requestAnimationFrame(function () {
    toast.style.opacity = '1';
  });
  setTimeout(function () {
    toast.style.opacity = '0';
    setTimeout(function () { toast.remove(); }, 300);
  }, 1800);
}
