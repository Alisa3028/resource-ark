/* ==========================================================================
   components/toast.js —— 轻提示
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.toast = (function () {
  var U = Ark.utils;
  var box = null;

  function ensure() {
    if (!box) {
      box = U.el('div.toasts', { role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(box);
    }
    return box;
  }

  /**
   * 图标参数兼容两种写法：
   *   · 图标名（如 'copy'）→ 直接渲染内联 SVG
   *   · 旧式表情（如 '⧉'）→ 自动映射成同语义图标，映射不到才退回文本
   */
  function iconNode(v) {
    if (!v) return null;
    var name = Ark.icons.has(v) ? v : Ark.icons.forEmoji(v);
    if (name) return Ark.icons.el(name, { size: 16 });
    return U.el('span.ico', { text: v });
  }

  /**
   * @param {string} msg 文案
   * @param {string} ico 图标名或表情字符
   * @param {number} dur 持续时间
   */
  function show(msg, ico, dur) {
    var host = ensure();
    var t = U.el('div.toast', {}, [
      iconNode(ico),
      U.el('span', { text: msg })
    ]);
    host.appendChild(t);
    // 最多同时显示 3 条
    while (host.children.length > 3) host.removeChild(host.firstChild);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 300);
    }, dur || 1900);
    return t;
  }

  return { show: show };
})();
