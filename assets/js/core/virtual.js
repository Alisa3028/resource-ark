/* ==========================================================================
   core/virtual.js —— 虚拟滚动（按行窗口化）
   --------------------------------------------------------------------------
   原理：容器撑出完整高度，只把「可视区 + 缓冲」内的若干行真实渲染出来，
        其余行不存在于 DOM 中。1300+ 条数据下内存与节点数始终恒定。
   用法：
     Ark.virtual.create({
       mount: 容器元素,
       items: 数据数组,
       columns: 3,                     // 或 function(width){ return n }
       rowHeight: 268, gap: 18,
       renderRow: function(rowItems, rowIndex){ return 行元素 }
     })
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.virtual = (function () {
  var U = Ark.utils;

  function create(o) {
    var mount = o.mount;
    var gap = o.gap || 18;
    var rowH = o.rowHeight || 260;
    var bufferRows = o.bufferRows || 3;

    mount.classList.add('vlist');
    mount.innerHTML = '';
    var sizer = U.el('div.vlist-sizer');
    var abs = U.el('div.vlist-abs');
    sizer.appendChild(abs);
    mount.appendChild(sizer);

    var items = [];
    var colCount = 1;
    var lastKey = '';

    function colCountFor(width) {
      if (typeof o.columns === 'function') return Math.max(1, o.columns(width));
      return Math.max(1, o.columns || 1);
    }

    function render() {
      if (!items.length) { abs.innerHTML = ''; sizer.style.height = '0px'; return; }

      var rows = Math.ceil(items.length / colCount);
      sizer.style.height = (rows * (rowH + gap) - gap) + 'px';

      var vh = window.innerHeight || document.documentElement.clientHeight;
      var top = mount.getBoundingClientRect().top;
      var first = Math.floor((Math.max(0, -top) - bufferRows * (rowH + gap)) / (rowH + gap));
      var last = Math.ceil((vh - top + bufferRows * (rowH + gap)) / (rowH + gap));
      first = Math.max(0, Math.min(first, rows - 1));
      last = Math.max(first, Math.min(last, rows - 1));

      var key = first + ':' + last + ':' + colCount + ':' + items.length;
      if (key === lastKey) return;         // 可视窗口没变就不重绘
      lastKey = key;

      var frag = document.createDocumentFragment();
      for (var r = first; r <= last; r++) {
        var slice = items.slice(r * colCount, r * colCount + colCount);
        var row = o.renderRow(slice, r);
        row.classList.add('vlist-row');
        row.style.gap = gap + 'px';
        row.style.marginBottom = gap + 'px';
        if (o.rowClass) row.classList.add(o.rowClass);
        frag.appendChild(row);
      }
      abs.innerHTML = '';
      abs.appendChild(frag);
      abs.style.transform = 'translateY(' + (first * (rowH + gap)) + 'px)';

      // 行高自适应：真实内容高度与估算值偏差较大时校正一次，避免滚动错位
      if (o.autoMeasure) measureRow();
    }

    var measuring = false;
    function measureRow() {
      if (measuring) return;
      var first = abs.firstElementChild;
      if (!first) return;
      measuring = true;
      window.requestAnimationFrame(function () {
        var h = first.offsetHeight;
        measuring = false;
        if (h > 24 && Math.abs(h - rowH) > 2) {
          rowH = h;
          lastKey = '';
          render();
        }
      });
    }

    var schedule = U.throttle(function () {
      var w = mount.clientWidth;
      var c = colCountFor(w);
      if (c !== colCount) { colCount = c; lastKey = ''; }
      render();
    }, 16);

    function onScroll() { schedule(); }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', U.debounce(function () { lastKey = ''; schedule(); }, 120));

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { lastKey = ''; schedule(); });
      ro.observe(mount);
    }

    /** 供外部在 DOM 尺寸变化后强制刷新 */
    function refresh() { lastKey = ''; schedule(); }

    function setItems(list) {
      items = list || [];
      lastKey = '';
      colCount = colCountFor(mount.clientWidth || 1000);
      render();
      // 立即渲染一次，避免首屏空白
      window.requestAnimationFrame(refresh);
    }

    function destroy() {
      window.removeEventListener('scroll', onScroll);
      mount.innerHTML = '';
    }

    setItems(o.items);

    return { setItems: setItems, refresh: refresh, destroy: destroy, mount: mount };
  }

  /**
   * 渐进式渲染（用于瀑布流这类无法按行窗口化的布局）
   * 首屏渲染 batch 条，滚动到底部再追加下一批，兼顾流畅度与完整性。
   */
  function progressive(o) {
    var mount = o.mount;
    var batch = o.batch || 36;
    var items = [];
    var shown = 0;
    var loading = false;

    function appendMore() {
      if (shown >= items.length || loading) return false;
      loading = true;
      var next = items.slice(shown, shown + batch);
      var frag = document.createDocumentFragment();
      next.forEach(function (it) { frag.appendChild(o.renderItem(it)); });
      mount.appendChild(frag);
      shown += next.length;
      loading = false;
      o.onProgress && o.onProgress(shown, items.length);
      return shown < items.length;
    }

    var onScroll = U.throttle(function () {
      var rect = mount.getBoundingClientRect();
      if (rect.bottom - window.innerHeight < 400) appendMore();
    }, 100);
    window.addEventListener('scroll', onScroll, { passive: true });

    function setItems(list) {
      items = list || [];
      shown = 0;
      mount.innerHTML = '';
      appendMore();
    }
    function refresh() { /* 瀑布流布局由浏览器自适应，无需处理 */ }
    function destroy() { window.removeEventListener('scroll', onScroll); mount.innerHTML = ''; }

    setItems(o.items);
    return { setItems: setItems, refresh: refresh, destroy: destroy };
  }

  return { create: create, progressive: progressive };
})();
