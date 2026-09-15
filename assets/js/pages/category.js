/* ==========================================================================
   pages/category.js —— 分类页（二级 / 三级）
   --------------------------------------------------------------------------
   路由：#/category[?cat=education][&sub=courses][&tags=a,b][&page=2]
   不带 cat 参数时，展示「全部分类总览」，作为分类体系的入口。
   ========================================================================== */
Ark.pages = Ark.pages || {};

Ark.pages.category = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var crumb = document.getElementById('ark-crumb');
  var q = U.parseQuery();
  var cats = Ark.data.state().cats;

  /** 统计某个大分类 / 子分类下的资源条数 */
  function countIn(catId, subId) {
    return Ark.data.allResources().filter(function (r) {
      if (r.cat !== catId) return false;
      if (subId && r.sub !== subId) return false;
      return true;
    }).length;
  }

  /* ---------------------------------------------------- 分类总览模式 */
  if (!q.cat) {
    Ark.breadcrumb.render(crumb, [{ text: '全部分类', icon: 'grid' }]);
    var sec = U.el('section.sec.wrap');
    sec.appendChild(Ark.ui.sectionHead('全部分类', '按领域逐层展开', null, 'grid'));
    var grid = U.el('div.cat-grid');
    cats.forEach(function (c, i) {
      grid.appendChild(U.el('a.cat-card.reveal', {
        href: Ark.router.href('category', { cat: c.id }),
        'data-d': String(i % 6 + 1),
        style: { '--c': c.accent, '--c-soft': U.softColor(c.accent, .15) }
      }, [
        U.el('div.cat-ico', {}, I.el(I.catIcon(c), { size: 22 })),
        U.el('div.cat-name', { text: c.name }),
        U.el('div.cat-desc.clamp-2', { text: c.desc }),
        U.el('div.cat-subs', {}, c.subcategories.map(function (s) { return U.el('span.tag', { text: s.name }); })),
        U.el('div.cat-meta', {}, [
          U.el('span', { text: c.count + ' 个资源 · ' + c.subcategories.length + ' 个子分类' }),
          U.el('span.cat-go', { 'aria-hidden': 'true' }, I.el('arrowRight', { size: 15 }))
        ])
      ]));
    });
    sec.appendChild(grid);
    content.appendChild(sec);
    Ark.lazy.scan(content);
    return;
  }

  /* ---------------------------------------------------- 具体分类模式 */
  var cat = Ark.data.getCategory(q.cat);
  if (!cat) {
    content.appendChild(Ark.ui.empty('compass', '没有找到这个分类', '它可能已被重命名或移除', [
      U.el('a.btn.btn-primary', { href: Ark.router.href('category'), text: '查看全部分类' }),
      U.el('a.btn.btn-soft', { href: Ark.router.href('home'), text: '返回首页' })
    ]));
    return;
  }
  var sub = q.sub ? Ark.data.getSub(cat.id, q.sub) : null;
  var tags = q.tags ? q.tags.split(',').filter(Boolean) : [];

  /* 面包屑：首页 / 全部资源 / 大分类 / 子分类 */
  Ark.breadcrumb.render(crumb, Ark.breadcrumb.forCategory(cat, sub));

  /* 分类头图区 */
  var head = U.el('section.wrap', { style: { paddingTop: '10px' } }, [
    U.el('div.detail-head.reveal', { style: { '--c': cat.accent, '--c-soft': U.softColor(cat.accent, .14) } }, [
      U.el('div.detail-head-row', {}, [
        U.el('div.detail-ico', {}, I.el(sub ? 'folder' : I.catIcon(cat), { size: 32 })),
        U.el('div', { style: { flex: '1 1 260px', minWidth: '0' } }, [
          U.el('h1', { style: { fontSize: 'clamp(1.4rem,3vw,2rem)' } }, [
            U.el('span', { text: sub ? sub.name : cat.name }),
            sub ? U.el('span.dim', { style: { fontSize: '.55em', fontWeight: '600', marginLeft: '10px' }, text: '属于 ' + cat.name }) : null
          ]),
          U.el('p.muted', { style: { margin: '8px 0 0', maxWidth: '760px' }, text: sub ? sub.desc : cat.desc })
        ])
      ]),
      U.el('div.detail-head-meta', {}, [
        U.el('span.badge.badge-soft', {}, [
          I.el('folder', { size: 12 }),
          U.el('span', { text: '共 ' + countIn(cat.id, sub && sub.id) + ' 个资源' })
        ]),
        U.el('span.badge.badge-soft', {}, [
          I.el('grid', { size: 12 }),
          U.el('span', { text: cat.subcategories.length + ' 个子分类' })
        ]),
        U.el('a.btn.btn-xs.btn-soft', { href: Ark.router.href('search', { cat: cat.id }) }, [
          I.el('search', { size: 12 }),
          U.el('span', { text: '在搜索页打开' })
        ])
      ])
    ])
  ]);
  content.appendChild(head);

  /* 子分类快捷卡（未选中子分类时展示，形成第三层入口） */
  if (!sub) {
    var subSec = U.el('section.sec.wrap');
    subSec.appendChild(Ark.ui.sectionHead('子分类', null, null, 'folder'));
    var subGrid = U.el('div.cat-grid');
    (cat.subcategories || []).forEach(function (s, i) {
      var n = countIn(cat.id, s.id);
      subGrid.appendChild(U.el('a.cat-card.reveal', {
        href: Ark.router.href('category', { cat: cat.id, sub: s.id }),
        'data-d': String(i % 6 + 1),
        style: { '--c': cat.accent, '--c-soft': U.softColor(cat.accent, .14) }
      }, [
        U.el('div.cat-ico', { style: { color: cat.accent } }, I.el('folder', { size: 22 })),
        U.el('div.cat-name', { text: s.name }),
        U.el('div.cat-desc.clamp-2', { text: s.desc }),
        U.el('div.cat-meta', {}, [
          U.el('span', { text: n + ' 个资源' }),
          U.el('span.cat-go', { 'aria-hidden': 'true' }, I.el('arrowRight', { size: 15 }))
        ])
      ]));
    });
    subSec.appendChild(subGrid);
    content.appendChild(subSec);
  }

  /* 筛选 + 结果 */
  var browse = U.el('section.sec.wrap');
  browse.appendChild(Ark.ui.sectionHead('全部资源', null, null, 'zap'));
  var filterHost = U.el('div');
  var toolbarHost = U.el('div.bar-row');
  var listHost = U.el('div.results');
  var pagerHost = U.el('div.pager');
  browse.appendChild(filterHost);
  browse.appendChild(U.el('div', { style: { height: '16px' } }));
  browse.appendChild(toolbarHost);
  browse.appendChild(listHost);
  browse.appendChild(pagerHost);
  content.appendChild(browse);

  var view = Ark.results.create({
    toolbarBox: toolbarHost, listBox: listHost, pagerBox: pagerHost,
    initialPage: Number(q.page) || 1,
    scrollTarget: function () { return browse.offsetTop - 84; },
    onTag: function (t) { Ark.router.go(Ark.router.href('search', { tags: t, cat: cat.id })); }
  });

  var state = { cat: cat.id, sub: sub ? sub.id : '', tags: tags, tagMode: q.tagMode || 'and', hot: q.hot || '' };
  function refresh(reset) {
    view.setLoading(true);
    var list = Ark.data.filter({
      cat: state.cat, sub: state.sub, tags: state.tags, tagMode: state.tagMode,
      hot: state.hot, sort: view.state.sort
    });
    setTimeout(function () {
      view.setItems(list, { resetPage: !!reset });
      syncURL();
      Ark.lazy.scan(content);
    }, 110);
  }

  /* 筛选变化时只同步地址栏（不重渲染整页，保证筛选栏的输入焦点不丢） */
  function syncURL() {
    Ark.router.replace(Ark.router.href('category', {
      cat: state.cat, sub: state.sub,
      tags: state.tags.join(',') || null,
      hot: state.hot || null,
      page: view.state.page > 1 ? view.state.page : null
    }));
  }

  Ark.filterbar.render(filterHost, {
    cat: state.cat, sub: state.sub, tags: state.tags,
    onChange: function (s) {
      var catChanged = s.cat !== state.cat;
      state.cat = s.cat; state.sub = s.sub; state.tags = s.tags; state.tagMode = s.tagMode;
      if (catChanged) {
        // 切换大分类直接跳到对应分类页，保证 URL 与面包屑始终一致
        Ark.router.go(Ark.router.href('category', { cat: s.cat || '', sub: s.sub || '', tags: s.tags.join(',') || null }));
        return;
      }
      refresh(true);
    }
  });

  refresh(false);

  // 从外部带页码进来时，直接把结果区滚进视野
  if (q.page && Number(q.page) > 1) {
    setTimeout(function () {
      window.scrollTo({ top: browse.offsetTop - 80, behavior: 'auto' });
    }, 200);
  }
};
