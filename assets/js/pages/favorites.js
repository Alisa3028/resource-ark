/* ==========================================================================
   pages/favorites.js —— 我的收藏（localStorage 持久化）
   --------------------------------------------------------------------------
   功能：页内搜索、按大分类筛选、排序、卡片 / 列表视图切换、分页与虚拟滚动、
        单条取消收藏、一键清空。收藏数据全部保存在浏览器本地，不上传服务器。
   ========================================================================== */
Ark.pages = Ark.pages || {};

/* 收藏变化时，只有「当前正停留在收藏页」才需要重绘。
   这里把刷新函数存在模块级变量上，避免每次进入页面都重复注册监听。 */
var arkFavSync = { fn: null, timer: null };
window.addEventListener('ark:favchange', function () {
  if (!arkFavSync.fn) return;
  clearTimeout(arkFavSync.timer);
  arkFavSync.timer = setTimeout(function () {
    if (arkFavSync.fn) arkFavSync.fn();
  }, 110);
});

Ark.pages.favorites = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var crumb = document.getElementById('ark-crumb');

  Ark.breadcrumb.render(crumb, [{ text: '我的收藏', icon: 'star' }]);

  var state = { q: '', cat: '', tags: [] };
  var hitMap = {};

  /* ------------------------------------------------------------- 页头 */
  var countBadge = U.el('span.badge.badge-soft', {}, [
    I.el('starFill', { size: 12 }), U.el('span', { text: '0 条收藏' })
  ]);
  var catBadge = U.el('span.badge.badge-soft', {}, [
    I.el('grid', { size: 12 }), U.el('span', { text: '0 个大分类' })
  ]);

  var head = U.el('section.wrap', { style: { paddingTop: '18px' } }, [
    U.el('div.detail-head.reveal', {}, [
      U.el('div.detail-head-row', {}, [
        U.el('div.detail-ico', { style: { '--c': 'var(--gem)', '--c-soft': 'color-mix(in srgb, var(--gem) 16%, transparent)' } },
          [I.el('starFill', { size: 30 })]),
        U.el('div', { style: { flex: '1 1 300px', minWidth: '0' } }, [
          U.el('h1', { text: '我的收藏' }),
          U.el('p.muted', { style: { marginTop: '8px', maxWidth: '660px' },
            text: '收藏存在你的浏览器本地，不会上传。可以随时导出成清单带走。' }),
          U.el('div.detail-head-meta', {}, [countBadge, catBadge])
        ])
      ])
    ])
  ]);
  content.appendChild(head);

  /* ------------------------------------------------------------- 导出 / 导入 */
  /** 触发浏览器下载（file:// 下同样可用，不需要服务器） */
  function download(name, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = U.el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 400);
  }

  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }

  var exportMdBtn = U.el('button.btn.btn-xs.btn-soft', { type: 'button', title: '导出为 Markdown 链接清单' }, [
    I.el('download', { size: 13 }), U.el('span', { text: '导出清单' })
  ]);
  exportMdBtn.addEventListener('click', function () {
    var items = collect();
    if (!items.length) { Ark.toast.show('还没有收藏可以导出', 'inbox'); return; }
    var site = Ark.data.getSite();
    var lines = ['# ' + (site.name || '资源方舟') + ' · 我的收藏', '', '> 共 ' + items.length + ' 条 · 导出于 ' +
      new Date().toISOString().slice(0, 10), ''];
    var byCat = {};
    items.forEach(function (r) { (byCat[r.cat] = byCat[r.cat] || []).push(r); });
    Ark.data.state().cats.forEach(function (c) {
      var list = byCat[c.id];
      if (!list) return;
      lines.push('## ' + c.name, '');
      list.forEach(function (r) { lines.push('- [' + r.name + '](' + r.url + ') — ' + r.desc); });
      lines.push('');
    });
    download('resourceark-favorites-' + stamp() + '.md', lines.join('\n'), 'text/markdown');
    Ark.toast.show('已导出 ' + items.length + ' 条收藏', 'download');
  });

  var exportJsonBtn = U.el('button.btn.btn-xs.btn-soft', { type: 'button', title: '导出为 JSON 备份，可用于换浏览器后恢复' }, [
    I.el('copy', { size: 13 }), U.el('span', { text: '导出备份' })
  ]);
  exportJsonBtn.addEventListener('click', function () {
    var ids = Ark.store.favorites();
    if (!ids.length) { Ark.toast.show('还没有收藏可以导出', 'inbox'); return; }
    var items = collect();
    download('resourceark-favorites-' + stamp() + '.json', JSON.stringify({
      site: (Ark.data.getSite() || {}).name || '资源方舟',
      exportedAt: new Date().toISOString(),
      count: ids.length,
      favorites: ids,
      items: items.map(function (r) { return { id: r.id, name: r.name, url: r.url, cat: r.cat, sub: r.sub }; })
    }, null, 2), 'application/json');
    Ark.toast.show('已导出备份文件', 'download');
  });

  var importInput = U.el('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, 'aria-hidden': 'true' });
  var importBtn = U.el('button.btn.btn-xs.btn-soft', { type: 'button', title: '从导出的 JSON 备份恢复收藏' }, [
    I.el('refresh', { size: 13 }), U.el('span', { text: '恢复备份' })
  ]);
  importBtn.addEventListener('click', function () { importInput.click(); });
  importInput.addEventListener('change', function () {
    var f = importInput.files && importInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var ids = [];
      try {
        var doc = JSON.parse(String(reader.result));
        ids = Array.isArray(doc) ? doc : (doc.favorites || (doc.items || []).map(function (x) { return x.id; }));
      } catch (e) { ids = []; }
      // 只恢复「确实存在于资源库中」的条目，避免把脏 id 写进去
      var valid = ids.filter(function (id) { return !!Ark.data.getResource(id); });
      if (!valid.length) { Ark.toast.show('文件里没有可识别的收藏', 'warn'); importInput.value = ''; return; }
      var merged = Ark.store.favorites().slice();
      valid.forEach(function (id) { if (merged.indexOf(id) === -1) merged.push(id); });
      Ark.store.set(Ark.config.KEY.favorites, merged);
      Ark.store.notifyFavChange();
      Ark.toast.show('已恢复 ' + valid.length + ' 条收藏', 'check');
      importInput.value = '';
      buildCatFilter();
      refresh(true);
    };
    reader.readAsText(f);
  });

  /* ------------------------------------------------------------- 工具条 */
  var searchInput = U.el('input.field', {
    type: 'search', placeholder: '在收藏里搜索：名称 / 用途 / 标签…',
    style: { maxWidth: '320px' }, 'aria-label': '在收藏中搜索'
  });
  searchInput.addEventListener('input', U.debounce(function () {
    state.q = searchInput.value.trim();
    refresh(true);
  }, 180));

  var catBox = U.el('div.filter-items');
  var clearBtn = U.el('button.btn.btn-xs.btn-soft', { type: 'button' }, [
    I.el('trash', { size: 13 }), U.el('span', { text: '清空收藏' })
  ]);
  clearBtn.addEventListener('click', function () {
    if (!Ark.store.favorites().length) { Ark.toast.show('收藏本来就是空的', 'inbox'); return; }
    if (confirm('确定清空全部收藏吗？此操作不可撤销。')) {
      Ark.store.clearFav();
      Ark.toast.show('收藏已清空', 'trash');
      buildCatFilter();
      refresh(true);
    }
  });

  var tools = U.el('section.sec.wrap', { style: { paddingBottom: '0' } }, [
    U.el('div.panel.panel-pad.fav-tools', {}, [
      U.el('div.fav-tools-row', {}, [
        searchInput,
        U.el('span.spacer'),
        exportMdBtn,
        exportJsonBtn,
        importBtn,
        importInput,
        clearBtn
      ]),
      U.el('div.filter-row', {}, [
        U.el('div.filter-label', {}, [I.el('grid', { size: 14 }), U.el('span', { text: '分类' })]),
        catBox
      ])
    ])
  ]);
  content.appendChild(tools);

  /* ------------------------------------------------------------- 结果区 */
  var browse = U.el('section.sec.wrap');
  var toolbarHost = U.el('div.bar-row');
  var listHost = U.el('div.results');
  var pagerHost = U.el('div.pager');
  browse.appendChild(toolbarHost);
  browse.appendChild(listHost);
  browse.appendChild(pagerHost);
  content.appendChild(browse);

  var view = Ark.results.create({
    toolbarBox: toolbarHost, listBox: listHost, pagerBox: pagerHost,
    scrollTarget: function () { return browse.offsetTop - 90; },
    markProvider: function (id) { return hitMap[id] || null; },
    emptyHTML: '<p>还没有匹配的收藏</p><p class="tiny">换个关键词，或把左侧分类切回「全部」</p>',
    onTag: function (t) { Ark.router.go(Ark.router.href('search', { tags: t })); },
    onSort: function () { refresh(false); }
  });

  /** 取出当前收藏对应的资源（顺序与收藏顺序一致，最新收藏在最前） */
  function collect() {
    return Ark.store.favorites().map(function (id) { return Ark.data.getResource(id); }).filter(Boolean);
  }

  /** 渲染分类筛选胶囊（只列出真正出现在收藏里的分类） */
  function buildCatFilter() {
    var items = collect();
    var used = {};
    items.forEach(function (r) { used[r.cat] = (used[r.cat] || 0) + 1; });

    var cats = Ark.data.state().cats.filter(function (c) { return used[c.id]; });
    if (state.cat && !used[state.cat]) state.cat = '';

    catBox.innerHTML = '';
    var allChip = U.el('button.tag' + (state.cat ? '' : '.active'), { type: 'button', 'aria-pressed': state.cat ? 'false' : 'true' },
      '全部 ' + items.length);
    allChip.addEventListener('click', function () { state.cat = ''; buildCatFilter(); refresh(true); });
    catBox.appendChild(allChip);

    cats.forEach(function (c) {
      var on = state.cat === c.id;
      var b = U.el('button.tag' + (on ? '.active' : ''), { type: 'button', 'aria-pressed': on ? 'true' : 'false' });
      b.appendChild(I.el(I.catIcon(c), { size: 12 }));
      b.appendChild(U.el('span', { text: c.name + ' ' + used[c.id] }));
      if (on) b.style.background = c.accent;
      b.addEventListener('click', function () { state.cat = on ? '' : c.id; buildCatFilter(); refresh(true); });
      catBox.appendChild(b);
    });

    countBadge.lastChild.textContent = items.length + ' 条收藏';
    catBadge.lastChild.textContent = cats.length + ' 个大分类';
  }

  function refresh(reset) {
    var items = collect();
    if (state.cat) items = items.filter(function (r) { return r.cat === state.cat; });

    // 页内关键词搜索：沿用全站模糊搜索算法，并保留命中高亮
    hitMap = {};
    if (state.q) {
      var res = Ark.search.query(state.q, items);
      res.forEach(function (x) {
        hitMap[x.item.id] = { name: x.name, desc: x.desc, tags: x.tags, cat: x.cat, sub: x.sub };
      });
      items = res.map(function (x) { return x.item; });
    }
    if (!state.q) items = Ark.data.sort(items, view.state.sort);

    view.setItems(items, { resetPage: !!reset });
    Ark.lazy.scan(content);
  }

  /* 收藏在别处被改动时（例如卡片星标），本页列表与计数同步更新 */
  arkFavSync.fn = function () {
    if (!document.body.contains(listHost)) { arkFavSync.fn = null; return; }   // 已离开本页
    buildCatFilter();
    refresh(false);
  };

  buildCatFilter();
  view.setSort('default');
  refresh(true);
};
