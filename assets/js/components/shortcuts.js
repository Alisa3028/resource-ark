/* ==========================================================================
   components/shortcuts.js —— 全局键盘快捷键 + 帮助面板
   --------------------------------------------------------------------------
   设计要点：
     · 单键快捷键（r / t / g / h）只在「没有焦点在输入框、没有按住修饰键」时生效，
       否则用户打字时会误触发；用 Alt/Ctrl/Meta + 键的组合则一律放行给浏览器。
     · 帮助面板沿用「hidden 与 class 同步切换」的写法：
       hidden 负责不参与布局，open 负责淡入，两者不同步就会永远看不见。
     · 面板打开时阻断单键快捷键，Esc 优先关闭面板而不是清空搜索框。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.shortcuts = (function () {
  var U = Ark.utils;
  var I = Ark.icons;

  /** 帮助面板里逐条列出的快捷键（顺序即展示顺序） */
  var KEYS = [
    ['/',      '聚焦搜索框',        'search'],
    ['?',      '打开 / 关闭本面板',  'keyboard'],
    ['Ctrl K', '聚焦搜索框（全局）', 'search'],
    ['r',      '随机推荐一条资源',   'dice'],
    ['t',      '切换深色 / 浅色',    'contrast'],
    ['g',      '回到页面顶部',      'top'],
    ['h',      '回到首页',          'home'],
    ['Esc',    '关闭浮层 / 取消聚焦', 'close']
  ];

  var panel = null;
  var opened = false;

  /** 是否正在输入：输入框、文本域、下拉、可编辑区域一律不响应单键快捷键 */
  function typing(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return !!el.isContentEditable;
  }

  function navInput() { return U.$('#ark-nav .nav-search input'); }

  /* ------------------------------------------------------------ 帮助面板 */
  function build() {
    // 外层复用通用 .modal / .modal-box，只额外补 .kbd-* 的内部排版
    var card = U.el('div.modal-box.kbd-card', { role: 'dialog', 'aria-modal': 'true', 'aria-label': '键盘快捷键' }, [
      U.el('div.kbd-head', {}, [
        U.el('div', {}, [
          I.el('keyboard', { size: 18, cls: 'kbd-hi' }),
          U.el('strong', { text: '键盘快捷键' })
        ]),
        U.el('button.btn.btn-xs.btn-ghost', { type: 'button', 'aria-label': '关闭', onclick: close }, [
          I.el('close', { size: 13 })
        ])
      ]),
      U.el('div.kbd-list', {}, KEYS.map(function (k) {
        return U.el('div.kbd-row', {}, [
          U.el('span.kbd-keys', {}, U.el('kbd', { text: k[0] })),
          I.el(k[2], { size: 14, cls: 'kbd-ri' }),
          U.el('span.kbd-desc', { text: k[1] })
        ]);
      })),
      U.el('p.kbd-foot.tiny.dim', { text: '在输入框中打字时，单键快捷键会自动让路；组合键始终交给浏览器。' })
    ]);

    var overlay = U.el('div.modal.kbd-modal', { hidden: true }, card);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  function open() {
    if (!panel) panel = build();
    panel.hidden = false;
    // 让淡入动画能播出来：先落到布局，再加 open
    void panel.offsetWidth;
    panel.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    opened = true;
  }

  function close() {
    if (!panel) return;
    panel.classList.remove('open');
    panel.hidden = true;
    document.documentElement.style.overflow = '';
    opened = false;
  }

  function toggle() { opened ? close() : open(); }

  /* ------------------------------------------------------------ 快捷键分发 */
  function onKey(e) {
    var k = e.key;

    // Esc：优先关面板，其次收起导航联想并让输入框失焦
    if (k === 'Escape') {
      if (opened) { e.preventDefault(); close(); return; }
      var inp = navInput();
      if (inp && document.activeElement === inp) inp.blur();
      return;
    }

    // Ctrl/⌘ + K：聚焦搜索（这个即使在输入框里也允许）
    if ((e.ctrlKey || e.metaKey) && String(k).toLowerCase() === 'k') {
      e.preventDefault();
      var target = navInput();
      if (target) { target.focus(); target.select(); }
      return;
    }

    // 其余快捷键：带修饰键的不管、正在打字的不管
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (typing(e.target)) return;

    if (k === '/') {
      e.preventDefault();
      var box = navInput();
      if (box) { box.focus(); box.select(); }
      return;
    }

    if (k === '?') { e.preventDefault(); toggle(); return; }

    if (opened) return;   // 面板开着时，单键不再触发页面动作

    var low = String(k).toLowerCase();
    if (low === 'r') {
      e.preventDefault();
      Ark.navbar.randomGo();
    } else if (low === 't') {
      e.preventDefault();
      Ark.theme.toggleDark();
    } else if (low === 'g') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: Ark.store.getMotion() ? 'smooth' : 'auto' });
    } else if (low === 'h') {
      e.preventDefault();
      Ark.router.go(Ark.router.href('home'));
    }
  }

  function init() {
    document.addEventListener('keydown', onKey);
  }

  return { init: init, open: open, close: close, toggle: toggle, KEYS: KEYS };
})();
