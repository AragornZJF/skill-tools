/* =========================================================
   共享脚本：Tab 导航、涟漪动画、登录/登出交互、书友匹配
   阅伴 ReadPal
   规范：驼峰命名、职责单一、addEventListener 动态绑定
         （行为与结构分离，不使用内联 onclick）
   ========================================================= */

/* 初始化底部 Tab 导航（iframe 页面切换）-- 仅 index.html 调用 */
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

/* 启用涟漪动画 -- 每个页面调用 */
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

/* 绑定登录按钮 -- login.html 调用 */
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
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'login-success' }, '*');
    } else {
      window.location.href = 'home.html';
    }
  });
}

/* 绑定退出按钮 -- profile.html 调用 */
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

/* ---------- 书友匹配交互 -- discover.html 调用 ---------- */
var matchIndex = 0;

function initMatchCards() {
  var skipBtn = document.querySelector('.match-btn.skip');
  var likeBtn = document.querySelector('.match-btn.like');
  var superBtn = document.querySelector('.match-btn.super');
  var matchCard = document.querySelector('.match-card');

  if (!matchCard) return;

  if (skipBtn) {
    skipBtn.addEventListener('click', function () {
      swipeCard(matchCard, 'left');
    });
  }
  if (likeBtn) {
    likeBtn.addEventListener('click', function () {
      swipeCard(matchCard, 'right');
    });
  }
  if (superBtn) {
    superBtn.addEventListener('click', function () {
      swipeCard(matchCard, 'right');
    });
  }
}

function swipeCard(card, direction) {
  if (direction === 'left') {
    card.classList.add('swipe-left');
  } else {
    card.classList.add('swipe-right');
    setTimeout(function () {
      showMatchSuccess(card);
    }, 300);
  }
  setTimeout(function () {
    card.classList.remove('swipe-left', 'swipe-right');
    card.classList.add('fade-in');
    setTimeout(function () {
      card.classList.remove('fade-in');
    }, 400);
  }, 400);
}

function showMatchSuccess(card) {
  var name = card.querySelector('.match-name');
  var nameText = name ? name.textContent : '书友';
  createModal({
    title: '匹配成功！',
    bodyHTML:
      '<div style="text-align:center;">' +
        '<i class="fa-solid fa-heart match-success-icon"></i>' +
        '<div class="match-success-text">你和 ' + nameText + ' 匹配成功</div>' +
        '<div class="match-success-sub">你们有相似的阅读口味</div>' +
      '</div>'
  }).open();
}
