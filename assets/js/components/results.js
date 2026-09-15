/* ==========================================================================
   components/results.js —— 资源结果区（视图 / 布局 / 虚拟滚动 / 分页 总控）
   --------------------------------------------------------------------------
   这是最核心的复用组件，首页、分类页、搜索页、收藏页、历史页共用同一套逻辑：
     · 视图：卡片 / 列表
     · 布局：网格 / 紧凑网格 / 瀑布流（页面可自由混用）
     · 大数据量：条数超过阈值时自动切换到虚拟滚动（按行窗口化）
     · 分页：每页 24 / 48 / 96 / 全部，与虚拟滚动可叠加使用
     · 加载：先铺骨架屏，再渲染真实内容
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.results = (function () {
  var U = Ark.utils;
  var I = Ark.icons;

  /** 各布局下单个卡片的参考宽度与行高（行高会自适应测量后修正） */
  var LAYOUT_META = {
    grid:    { minW: 288, rowH: 268, gap: 18 },
    dense:   { minW: 232, rowH: 250, gap: 13 },
    masonry: { minW: 300, rowH: 300, gap: 18 },
    list:    { minW: 0,   rowH: 76,  gap: 10 }
  };

  /** 把页面自定义的空状态 HTML 拆成「标题 + 说明」，交给统一的空状态组件渲染 */
  function parseEmpty(html) {
    if (!html) return null;
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var ps = U.$$('p', tmp);
    if (ps.length) return { title: ps[0].textContent.trim(), desc: ps[1] ? ps[1].textContent.trim() : '' };
    var t = tmp.textContent.trim();
    return t ? { title: t, desc: '' } : null;
  }

  /** 快捷筛选：在页面已筛好的结果之上再叠一层「个人视角」，所有页面通用 */
  var QUICK = [
    { id: 'all',    name: '全部',   icon: 'grid' },
    { id: 'unseen', name: '未访问', icon: 'eyeOff' },
    { id: 'fav',    name: '收藏',   icon: 'star' },
    { id: 'free',   name: '免费',   icon: 'check' }
  ];

  /**
   * @param {object} cfg {
   *   listBox, toolbarBox, pagerBox,    三个容器
   *   initialPage, onTag(tag), onFav(id,on), onNeedPage?,
   *   markProvider: fn(id) -> {name,desc,tags}   搜索关键词高亮
   *   emptyHTML: 空状态内容
   * }
   */
  function create(cfg) {
    var st = {
      page: cfg.initialPage || 1,
      size: Ark.store.getPageSize(),
      view: Ark.store.getView(),
      layout: Ark.store.getLayout(),
      sort: cfg.sort || 'default',
      quick: 'all',
      total: 0, pages: 1
    };
    var items = [];
    var vir = null;          // 虚拟滚动实例
    var prog = null;         // 渐进渲染实例（瀑布流）
    var loading = false;

    /* ------------------------------------------------- 工具条 */
    function seg(list, cur, onPick, title) {
      var s = U.el('span.seg', { title: title || '', role: 'group', 'aria-label': title || '切换显示方式' });
      list.forEach(function (it) {
        var b = U.el('button' + (it.id === cur ? '.on' : ''), {
          type: 'button', title: it.name, 'aria-label': it.name,
          'aria-pressed': it.id === cur ? 'true' : 'false',
          dataset: { v: it.id }
        }, [
          I.el(it.icon || 'dot', { size: 14 }),
          U.el('span', { text: it.name })
        ]);
        b.addEventListener('click', function () { onPick(it.id); });
        s.appendChild(b);
      });
      return s;
    }

    /* ------------------------------------------------- 快捷筛选 */
    /** 按「已访问 / 已收藏 / 免费」再筛一层；数据量不大，直接线性过滤即可 */
    function applyQuick(list) {
      if (st.quick === 'fav') {
        var favs = Ark.store.favorites();
        return list.filter(function (r) { return favs.indexOf(r.id) > -1; });
      }
      if (st.quick === 'free') {
        return list.filter(function (r) { return r.free === 'free'; });
      }
      if (st.quick === 'unseen') {
        var seen = Ark.store.seen();
        return list.filter(function (r) { return !seen[r.id]; });
      }
      return list;
    }

    function quickBar() {
      var bar = U.el('div.quick-bar', { role: 'group', 'aria-label': '快捷筛选' });
      QUICK.forEach(function (q) {
        var on = st.quick === q.id;
        var b = U.el('button.quick-btn' + (on ? '.on' : ''), {
          type: 'button', 'aria-pressed': on ? 'true' : 'false', dataset: { quick: q.id },
          title: '只显示' + q.name + '的资源'
        }, [
          I.el(q.icon, { size: 13 }),
          U.el('span', { text: q.name })
        ]);
        b.addEventListener('click', function () {
          st.quick = on ? 'all' : q.id;
          st.page = 1;
          paint();
        });
        bar.appendChild(b);
      });
      return bar;
    }

    function quickName(id) {
      var hit = QUICK.filter(function (q) { return q.id === id; })[0];
      return hit ? hit.name : id;
    }

    function renderToolbar() {
      if (!cfg.toolbarBox) return;
      var box = cfg.toolbarBox;
      box.className = 'results-bar';
      box.innerHTML = '';

      box.appendChild(quickBar());

      var row = U.el('div.bar-row');

      row.appendChild(U.el('span.count-badge', { id: 'ark-count' }, '共 ' + st.total + ' 条'));

      var virtualOn = st.size === 'all' && st.total > Ark.config.virtualThreshold;
      if (virtualOn) {
        row.appendChild(U.el('span.chip.chip-accent', { title: '当前仅渲染可视区域内的内容' }, [
          I.el('zap', { size: 13 }),
          U.el('span', { text: '虚拟滚动已启用' })
        ]));
      }

      row.appendChild(U.el('span.spacer'));

      // 视图切换
      row.appendChild(seg(Ark.config.views, st.view, function (v) {
        st.view = v; Ark.store.setView(v); st.page = 1; paint();
      }, '切换卡片 / 列表视图'));

      // 布局切换（列表视图下行不通的布局自动收敛为列表）
      if (st.view === 'card') {
        row.appendChild(seg(Ark.config.layouts, st.layout, function (v) {
          st.layout = v; Ark.store.setLayout(v); st.page = 1; paint();
        }, '切换网格 / 瀑布流布局'));
      }

      // 排序
      var sortSel = U.el('select.field', { style: { width: 'auto', padding: '7px 30px 7px 12px', fontSize: '.82rem' }, 'aria-label': '排序方式' });
      Ark.config.sorts.forEach(function (s) {
        var o = U.el('option', { value: s.id, text: s.name });
        if (s.id === st.sort) o.selected = true;
        sortSel.appendChild(o);
      });
      sortSel.addEventListener('change', function () {
        st.sort = this.value; st.page = 1;
        cfg.onSort && cfg.onSort(st.sort);
        paint();
      });
      row.appendChild(sortSel);

      // 每页条数
      var sizeSel = U.el('select.field', { style: { width: 'auto', padding: '7px 30px 7px 12px', fontSize: '.82rem' }, 'aria-label': '每页条数' });
      Ark.config.pageSizes.forEach(function (n) {
        var o = U.el('option', { value: String(n), text: n === 'all' ? '全部（虚拟滚动）' : '每页 ' + n + ' 条' });
        if (String(st.size) === String(n)) o.selected = true;
        sizeSel.appendChild(o);
      });
      sizeSel.addEventListener('change', function () {
        st.size = this.value === 'all' ? 'all' : parseInt(this.value, 10);
        Ark.store.setPageSize(st.size);
        st.page = 1;
        paint();
      });
      row.appendChild(sizeSel);

      box.appendChild(row);
    }

    /* ------------------------------------------------- 渲染主体 */
    function destroyRenderers() {
      if (vir) { vir.destroy(); vir = null; }
      if (prog) { prog.destroy(); prog = null; }
    }

    function layoutClass() {
      if (st.view === 'list') return 'view-list';
      if (st.layout === 'masonry') return 'masonry';
      return 'grid-cards' + (st.layout === 'dense' ? ' dense' : '');
    }

    function columnsFor(width) {
      if (st.view === 'list') return 1;
      var meta = LAYOUT_META[st.layout] || LAYOUT_META.grid;
      return Math.max(1, Math.floor((width + meta.gap) / (meta.minW + meta.gap)));
    }

    /** 真实渲染一批数据 */
    function paint() {
      var box = cfg.listBox;
      if (!box) return;
      destroyRenderers();

      // 先叠一层快捷筛选（全部 / 未访问 / 收藏 / 免费），条数徽标与分页都按筛选后的结果算
      var pool = applyQuick(items);
      st.total = pool.length;

      renderToolbar();

      if (!pool.length) {
        box.innerHTML = '';
        var e = parseEmpty(cfg.emptyHTML) || {
          title: '没有找到匹配的资源',
          desc: '试试减少筛选标签，或换个关键词'
        };
        // 本层筛选把结果清空了：告诉用户是「快捷筛选」在起作用，而不是数据真的没有
        if (st.quick !== 'all' && items.length) {
          e = {
            title: e.title,
            desc: '当前叠加了「' + quickName(st.quick) + '」快捷筛选，切回「全部」即可看到这 ' + items.length + ' 条'
          };
        }
        box.appendChild(Ark.ui.empty('search', e.title, e.desc));
        renderPager();          // 空结果时也让分页器按最新状态刷新（pages<=1 会自动收起）
        return;
      }

      var paged = Ark.data.paginate(pool, st.page, st.size);
      st.page = paged.page; st.pages = paged.pages;
      var list = paged.items;

      // 必须等 st.page / st.pages 落定后再渲染分页器，
      // 否则会拿上一次的值（例如从「全部」切回「每页 24 条」时仍然是 1 页）画错页码
      renderPager();

      var useVirtual = (st.size === 'all') && list.length > Ark.config.virtualThreshold;
      var useProgressive = !useVirtual && st.layout === 'masonry' && st.view === 'card' && list.length > Ark.config.virtualThreshold;

      if (!useVirtual && !useProgressive) {
        // —— 常规渲染：数量可控，全部落地以便获得完整入场动画 ——
        box.innerHTML = '';
        var wrap = U.el('div', { class: layoutClass() });
        list.forEach(function (r, i) {
          var card = Ark.card.render(r, cfg.markProvider ? cfg.markProvider(r.id) : null);
          card.classList.add('reveal');
          card.setAttribute('data-d', String(i % 6 + 1));
          wrap.appendChild(card);
        });
        box.appendChild(wrap);
        Ark.card.bind(box, { onTag: cfg.onTag, onFav: cfg.onFav });
        Ark.lazy.scan(box);
        return;
      }

      // —— 瀑布流 + 大数据量：渐进渲染（滚动到底部自动追加下一批） ——
      if (useProgressive) {
        box.innerHTML = '';
        var mwrap = U.el('div.masonry');
        box.appendChild(mwrap);
        prog = Ark.virtual.progressive({
          mount: mwrap,
          items: list,
          batch: 36,
          renderItem: function (r) {
            var card = Ark.card.render(r, cfg.markProvider ? cfg.markProvider(r.id) : null);
            Ark.card.bind(box, { onTag: cfg.onTag, onFav: cfg.onFav });
            return card;
          },
          onProgress: function (shown, total) {
            var tip = U.$('#ark-progress');
            if (tip) tip.textContent = '已渲染 ' + shown + ' / ' + total + ' 条';
          }
        });
        box.appendChild(U.el('div.vlist-status', { id: 'ark-progress', text: '已渲染 ' + Math.min(36, list.length) + ' / ' + list.length + ' 条' }));
        Ark.lazy.scan(box);
        return;
      }

      // —— 网格 / 列表 + 大数据量：虚拟滚动 ——
      box.innerHTML = '';
      var vwrap = U.el('div');
      box.appendChild(vwrap);
      var meta = LAYOUT_META[st.view === 'list' ? 'list' : st.layout] || LAYOUT_META.grid;
      vir = Ark.virtual.create({
        mount: vwrap,
        items: list,
        gap: meta.gap,
        rowHeight: meta.rowH,
        autoMeasure: true,
        bufferRows: 4,
        columns: function (w) { return columnsFor(w); },
        rowClass: st.view === 'list' ? 'view-list' : (st.layout === 'grid' || st.layout === 'dense' ? 'grid-cards' + (st.layout === 'dense' ? ' dense' : '') : ''),
        renderRow: function (slice) {
          if (st.view === 'list') {
            return Ark.card.render(slice[0], cfg.markProvider ? cfg.markProvider(slice[0].id) : null);
          }
          var f = document.createDocumentFragment();
          slice.forEach(function (r) {
            f.appendChild(Ark.card.render(r, cfg.markProvider ? cfg.markProvider(r.id) : null));
          });
          var row = U.el('div');
          row.style.display = 'grid';
          row.style.gridTemplateColumns = 'repeat(' + slice.length + ', minmax(0,1fr))';
          row.appendChild(f);
          return row;
        }
      });
      Ark.card.bind(box, { onTag: cfg.onTag, onFav: cfg.onFav });
      Ark.lazy.scan(box);
    }

    /* ------------------------------------------------- 分页器 */
    function renderPager() {
      if (!cfg.pagerBox) return;
      Ark.pagination.render(cfg.pagerBox, {
        page: st.page, pages: st.pages, total: st.total, size: st.size,
        scrollTop: cfg.scrollTarget != null ? cfg.scrollTarget : 0,
        onChange: function (p) {
          st.page = p;
          paint();
          if (cfg.onPageChange) cfg.onPageChange(p);
        }
      });
    }

    /* ------------------------------------------------- 对外 API */
    var api = {
      state: st,

      /** 传入「已筛选 + 已排序」的完整结果集（快捷筛选由本组件再叠一层） */
      setItems: function (list, opts) {
        items = list || [];
        if (opts && opts.resetPage) st.page = 1;
        paint();
      },

      setSort: function (s) { st.sort = s; },
      setLoading: function (on) {
        loading = on;
        if (!on || !cfg.listBox) return;
        Ark.skeleton.fill(cfg.listBox, st.view === 'list' ? 8 : 12, st.view === 'list' ? 'list' : 'card');
        if (cfg.pagerBox) cfg.pagerBox.innerHTML = '';
      },
      isLoading: function () { return loading; },
      repaint: paint,
      items: function () { return items; },
      /** 容器尺寸变化后（如侧栏收展）刷新虚拟滚动 */
      refresh: function () { if (vir) vir.refresh(); }
    };
    return api;
  }

  return { create: create, LAYOUT_META: LAYOUT_META };
})();
