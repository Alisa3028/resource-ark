/* ==========================================================================
   pages/search.js —— 搜索 / 筛选结果页
   --------------------------------------------------------------------------
   路由：#/search?q=关键词&cat=&sub=&tags=a,b&hot=1&sort=hot&page=2
   支持：多关键词模糊搜索、命中高亮、多标签组合、分类限定、排序、分页、视图切换
   ========================================================================== */
Ark.pages = Ark.pages || {};

Ark.pages.search = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var crumb = document.getElementById('ark-crumb');
  var q = U.parseQuery();

  var state = {
    q: q.q || '',
    cat: q.cat || '',
    sub: q.sub || '',
    tags: q.tags ? q.tags.split(',').filter(Boolean) : [],
    hot: q.hot || '',
    tagMode: q.tagMode || 'and'
  };
  var hitMap = {};       // id -> {name:[],desc:[],tags:{}} 关键词高亮信息

  Ark.breadcrumb.render(crumb, [{ text: '全部资源', icon: 'search' }]);

  /* ---------------------------------------------------- 搜索头部 */
  var input = U.el('input.field', {
    type: 'search', value: state.q, placeholder: '输入关键词，多个词用空格分隔',
    style: { fontSize: '1rem', padding: '13px 16px' }, 'aria-label': '搜索关键词'
  });
  var searchBtn = U.el('button.btn.btn-primary.btn-lg', { type: 'button' }, [
    I.el('search', { size: 16 }), U.el('span', { text: '搜索' })
  ]);
  function submit() {
    var v = input.value.trim();
    if (v) Ark.store.pushSearch(v);
    state.q = v;
    Ark.router.go(Ark.router.href('search', {
      q: v || null, cat: state.cat || null, sub: state.sub || null,
      tags: state.tags.join(',') || null, hot: state.hot || null
    }));
  }
  searchBtn.addEventListener('click', submit);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });

  var recent = Ark.store.recentSearch();
  var recentBox = U.el('div.recent-row');
  if (recent.length) {
    recentBox.appendChild(U.el('span.tiny.dim', { text: '最近搜索：' }));
    recent.forEach(function (k) {
      recentBox.appendChild(U.el('a.tag', { href: Ark.router.href('search', { q: k }) }, [
        I.el('clock', { size: 11 }), U.el('span', { text: k })
      ]));
    });
    recentBox.appendChild(U.el('button.btn.btn-xs.btn-ghost', {
      type: 'button',
      onclick: function () {
        Ark.store.set('ark.recentSearch', []);
        Ark.router.go(Ark.router.parse().hash);   // 原地重绘，刷新最近搜索列表
      }
    }, [I.el('close', { size: 12 }), U.el('span', { text: '清空' })]));
  }

  content.appendChild(U.el('section.wrap', { style: { paddingTop: '18px' } }, [
    U.el('div.panel.panel-pad.reveal', {}, [
      U.el('h1', { style: { fontSize: 'clamp(1.3rem,2.6vw,1.8rem)' }, text: state.q ? '搜索：' + state.q : '浏览全部资源' }),
      U.el('p.sm.muted', { style: { margin: '8px 0 16px' },
        text: '检索范围含名称、描述、标签、分类与域名；多个关键词是「并且」关系，例如「视频 剪辑 免费」。' }),
      U.el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } }, [
        U.el('div', { style: { flex: '1 1 320px' } }, [input]),
        searchBtn
      ]),
      recentBox
    ])
  ]));

  /* ---------------------------------------------------- 结果统计条 */
  var statBar = U.el('div.wrap');
  content.appendChild(statBar);

  /* ---------------------------------------------------- 筛选 + 结果 */
  var browse = U.el('section.sec.wrap');
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
    scrollTarget: function () { return browse.offsetTop - 80; },
    markProvider: function (id) { return hitMap[id] || null; },
    emptyHTML: '<p>没有匹配的资源</p><p class="tiny">可以试试：减少筛选标签、把「全部满足」改成「任一满足」、或换一个更短的关键词</p>',
    onTag: function (t) {
      var list = state.tags.slice();
      if (list.indexOf(t) === -1) list.push(t);
      Ark.router.go(Ark.router.href('search', {
        q: state.q || null, cat: state.cat || null, sub: state.sub || null, tags: list.join(',')
      }));
    }
  });
  view.setSort(q.sort || 'default');

  function refresh(reset) {
    view.setLoading(true);
    var base = Ark.data.filter({
      cat: state.cat, sub: state.sub, tags: state.tags, tagMode: state.tagMode,
      hot: state.hot, sort: view.state.sort
    });
    // 关键词检索 + 高亮
    if (state.q) {
      var res = Ark.search.query(state.q, base);
      hitMap = {};
      res.forEach(function (x) {
        hitMap[x.item.id] = { name: x.name, desc: x.desc, tags: x.tags, cat: x.cat, sub: x.sub };
      });
      base = res.map(function (x) { return x.item; });
    } else {
      hitMap = {};
    }
    setTimeout(function () {
      view.setItems(base, { resetPage: !!reset });
      renderStat(base.length);
      Ark.lazy.scan(content);
    }, 110);
  }

  function renderStat(n) {
    statBar.innerHTML = '';
    var chips = [];
    if (state.q) chips.push('关键词「' + state.q + '」');
    if (state.cat) { var c = Ark.data.getCategory(state.cat); if (c) chips.push(c.name); }
    if (state.sub) { var s = Ark.data.getSub(state.cat, state.sub); if (s) chips.push(s.name); }
    state.tags.forEach(function (t) { chips.push('#' + t); });

    statBar.appendChild(U.el('div.sec', { style: { paddingTop: '22px', paddingBottom: '0' } }, [
      U.el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } }, [
        U.el('span.count-badge', { text: '找到 ' + n + ' 条结果' }),
        chips.length ? U.el('span.sm.dim', { text: '筛选条件：' + chips.join('  ·  ') }) : null,
        chips.length ? U.el('button.btn.btn-xs.btn-ghost', { type: 'button', onclick: function () {
          Ark.router.go(Ark.router.href('search', { q: state.q || null }));
        } }, [I.el('close', { size: 12 }), U.el('span', { text: '清除筛选' })]) : null
      ])
    ]));
  }

  /* 排序 / 翻页变化时只同步地址栏（不重渲染整页，保证输入焦点不丢） */
  function syncURL() {
    Ark.router.replace(Ark.router.href('search', {
      q: state.q || null, cat: state.cat || null, sub: state.sub || null,
      tags: state.tags.join(',') || null, hot: state.hot || null,
      sort: view.state.sort !== 'default' ? view.state.sort : null,
      page: view.state.page > 1 ? view.state.page : null
    }));
  }

  Ark.filterbar.render(filterHost, {
    cat: state.cat, sub: state.sub, tags: state.tags,
    onChange: function (s) {
      state.cat = s.cat; state.sub = s.sub; state.tags = s.tags; state.tagMode = s.tagMode;
      refresh(true); syncURL();
    }
  });

  var origSetItems = view.setItems;
  view.setItems = function (list, opts) { origSetItems(list, opts); syncURL(); };

  refresh(false);
  Ark.lazy.scan(content);
};
