/* ==========================================================================
   components/pagination.js —— 分页组件
   --------------------------------------------------------------------------
   页码过多时自动折叠为「1 … 4 5 6 … 20」，并支持上一页/下一页与快速跳页。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.pagination = (function () {
  var U = Ark.utils;
  var I = Ark.icons;

  /** 计算需要展示的页码序列，0 代表省略号 */
  function sequence(cur, total, span) {
    span = span || 1;
    if (total <= 7) {
      var a = [];
      for (var i = 1; i <= total; i++) a.push(i);
      return a;
    }
    var out = [1];
    var start = Math.max(2, cur - span);
    var end = Math.min(total - 1, cur + span);
    if (start > 2) out.push(0);
    for (var j = start; j <= end; j++) out.push(j);
    if (end < total - 1) out.push(0);
    out.push(total);
    return out;
  }

  /**
   * @param {Element} host 容器
   * @param {object} cfg { page, pages, total, size, onChange(page) }
   */
  function render(host, cfg) {
    if (!host) return;
    host.classList.add('pager');
    host.innerHTML = '';
    var page = cfg.page, pages = cfg.pages;

    /**
     * 只有一页时分页器没有意义：条数已经由工具条的 count-badge 给出，
     * 虚拟滚动状态也有独立胶囊提示，这里整块收起，避免页尾孤零零挂一行文字。
     */
    if (pages <= 1) { host.hidden = true; return; }
    host.hidden = false;

    function btn(label, target, opts) {
      opts = opts || {};
      var b = U.el('button.pager-btn', {
        type: 'button',
        'aria-label': opts.label || String(target),
        disabled: opts.disabled || false,
        title: opts.title || ''
      }, label);
      if (opts.current) { b.setAttribute('aria-current', 'page'); b.classList.add('on'); }
      if (!opts.disabled && !opts.current) {
        b.addEventListener('click', function () {
          cfg.onChange(target);
          window.scrollTo({ top: cfg.scrollTop != null ? cfg.scrollTop : 0, behavior: 'smooth' });
        });
      }
      return b;
    }

    host.appendChild(btn([I.el('left', { size: 14 }), U.el('span', { text: '上一页' })], page - 1,
      { disabled: page <= 1, label: '上一页' }));

    sequence(page, pages).forEach(function (n) {
      if (n === 0) { host.appendChild(U.el('span.pager-ellipsis', { text: '…' })); return; }
      host.appendChild(btn(String(n), n, { current: n === page }));
    });

    host.appendChild(btn([U.el('span', { text: '下一页' }), I.el('right', { size: 14 })], page + 1,
      { disabled: page >= pages, label: '下一页' }));

    /* 快速跳页 */
    var jump = U.el('input.field', {
      type: 'number', min: 1, max: pages, placeholder: String(page),
      style: { width: '72px', padding: '7px 10px', textAlign: 'center' },
      'aria-label': '跳转到页码'
    });
    var goBtn = U.el('button.btn.btn-xs.btn-soft', { type: 'button' }, '跳转');
    function doJump() {
      var v = parseInt(jump.value, 10);
      if (v >= 1 && v <= pages) { cfg.onChange(v); window.scrollTo({ top: cfg.scrollTop || 0, behavior: 'smooth' }); }
    }
    goBtn.addEventListener('click', doJump);
    jump.addEventListener('keydown', function (e) { if (e.key === 'Enter') doJump(); });

    host.appendChild(U.el('span.pager-info', {
      style: { marginLeft: '8px' },
      text: '第 ' + page + ' / ' + pages + ' 页 · 共 ' + cfg.total + ' 条'
    }));
    host.appendChild(U.el('span', { style: { display: 'inline-flex', gap: '6px', marginLeft: '10px' } }, [jump, goBtn]));
  }

  return { render: render, sequence: sequence };
})();
