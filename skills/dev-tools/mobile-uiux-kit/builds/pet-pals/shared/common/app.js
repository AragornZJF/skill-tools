/* =========================================================
   PetPals 宠物社交 · 共享脚本
   规范：驼峰命名、职责单一、addEventListener 动态绑定
   ========================================================= */

/* 初始化底部 Tab 导航 -- index.html 调用 */
function initTabNavigation() {
  const tabBar = document.getElementById('tabBar');
  const appFrame = document.getElementById('appFrame');
  if (!tabBar || !appFrame) return;

  const tabItems = tabBar.querySelectorAll('.tab-item');
  tabItems.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var targetPage = tab.dataset.page;
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

/* 启用涟漪动画 */
function enableRipple() {
  var rippleEls = document.querySelectorAll('.ripple-btn');
  rippleEls.forEach(function (el) {
    el.addEventListener('click', function (event) {
      createRipple(el, event);
    });
  });
}

/* 创建单次涟漪 */
function createRipple(el, event) {
  var circle = document.createElement('span');
  var diameter = Math.max(el.clientWidth, el.clientHeight);
  var rect = el.getBoundingClientRect();
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
  var loginBtn = document.getElementById('loginBtn');
  if (!loginBtn) return;
  loginBtn.addEventListener('click', function () {
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value.trim();
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
  var logoutBtn = document.getElementById('logoutBtn');
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

/* 简单错误抖动反馈 */
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

/* ---------- PetPals 专属交互 ---------- */

/* 点赞切换 + 爪印动画 */
function bindPostLikes() {
  var likeBtns = document.querySelectorAll('.post-action[data-like]');
  likeBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      btn.classList.toggle('liked');
      var icon = btn.querySelector('i');
      var countEl = btn.querySelector('.like-count');
      if (btn.classList.contains('liked')) {
        icon.className = 'fa-solid fa-heart';
        if (countEl) {
          countEl.textContent = parseInt(countEl.textContent) + 1;
        }
        spawnPaw(e.clientX, e.clientY);
      } else {
        icon.className = 'fa-regular fa-heart';
        if (countEl) {
          countEl.textContent = parseInt(countEl.textContent) - 1;
        }
      }
    });
  });
}

/* 生成浮动爪印 */
function spawnPaw(x, y) {
  var paw = document.createElement('i');
  paw.className = 'fa-solid fa-paw paw-float';
  paw.style.left = (x - 12) + 'px';
  paw.style.top = (y - 12) + 'px';
  document.body.appendChild(paw);
  setTimeout(function () { paw.remove(); }, 1200);
}

/* 日常打卡爪印动画 */
function bindCheckIn() {
  var checkInBtn = document.getElementById('checkInBtn');
  if (!checkInBtn) return;
  checkInBtn.addEventListener('click', function (e) {
    createModal({
      title: '今日打卡',
      bodyHTML:
        '<div style="font-size:48px;color:var(--primary);margin-bottom:12px;"><i class="fa-solid fa-paw"></i></div>' +
        '<p style="font-size:15px;font-weight:600;color:var(--text-main);">打卡成功！</p>' +
        '<p style="font-size:13px;color:var(--text-sub);margin-top:6px;">已连续打卡 7 天，再坚持 3 天可获得徽章</p>'
    }).open();
    spawnPaw(e.clientX, e.clientY);
  });
}

/* ---------- 子页面导航 ---------- */

/* 页面跳转（兼容 iframe 和独立打开） */
function navigateTo(page) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ action: 'navigate', page: page }, '*');
  } else {
    window.location.href = page;
  }
}

/* 返回上一页 */
function bindBackBtn() {
  var backBtn = document.getElementById('backBtn');
  if (!backBtn) return;
  backBtn.addEventListener('click', function () {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'back' }, '*');
    } else {
      window.history.back();
    }
  });
}

/* ---------- 宠物详情页：Tab 切换 ---------- */
function bindDetailTabs() {
  var tabs = document.querySelectorAll('.detail-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var panels = document.querySelectorAll('.detail-panel');
      panels.forEach(function (p) { p.classList.remove('active'); });
      var target = document.getElementById('panel-' + tab.dataset.panel);
      if (target) target.classList.add('active');
    });
  });
}

/* ---------- 消息页：Tab 切换 ---------- */
function bindMsgTabs() {
  var tabs = document.querySelectorAll('.msg-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var panels = document.querySelectorAll('.msg-panel');
      panels.forEach(function (p) { p.classList.remove('active'); });
      var target = document.getElementById('panel-' + tab.dataset.panel);
      if (target) target.classList.add('active');
    });
  });
}

/* ---------- 发布动态页：发布提交 ---------- */
function bindPublishSubmit() {
  var btn = document.getElementById('publishSubmitBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    createModal({
      title: '发布成功',
      bodyHTML:
        '<div style="font-size:48px;color:var(--mint);margin-bottom:12px;"><i class="fa-solid fa-circle-check"></i></div>' +
        '<p style="font-size:15px;font-weight:600;color:var(--text-main);">动态已发布！</p>' +
        '<p style="font-size:13px;color:var(--text-sub);margin-top:6px;">毛孩子的可爱瞬间已分享给好友</p>'
    }).open();
    setTimeout(function () {
      navigateTo('home.html');
    }, 1500);
  });
}

/* ---------- 悬浮发布按钮 ---------- */
function bindFab() {
  var fab = document.getElementById('fab');
  if (!fab) return;
  fab.addEventListener('click', function () {
    navigateTo('publish.html');
  });
}

/* ---------- 消息入口 ---------- */
function bindMsgEntry() {
  var entries = document.querySelectorAll('[data-nav="messages"]');
  entries.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      navigateTo('messages.html');
    });
  });
}

/* ---------- 宠物详情入口 ---------- */
function bindPetDetailEntry() {
  var entries = document.querySelectorAll('[data-nav="pet-detail"]');
  entries.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      navigateTo('pet-detail.html');
    });
  });
}
