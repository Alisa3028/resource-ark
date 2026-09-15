/* ==========================================================================
   pages/home.js —— 首页
   --------------------------------------------------------------------------
   结构：视差 Hero（搜索 / 统计 / 随机推荐）→ 分类导航 → 热门推荐 →
        小众宝藏 → 最新收录 → 全站浏览区（含完整筛选 + 虚拟滚动 + 分页）
   说明：页面模块只负责往 #ark-content 里追加内容；路由切换、滚动恢复、
        进场动画都由 main.js 的 SPA 调度统一处理。
   ========================================================================== */
Ark.pages = Ark.pages || {};

Ark.pages.home = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var stats = Ark.data.getStats();

  /* ================================================================ Hero */
  var searchInput = U.el('input', {
    type: 'search', placeholder: '搜索 ' + (stats ? stats.total : 1300) + '+ 个优质站点：名称 / 用途 / 标签…',
    'aria-label': '搜索资源', autocomplete: 'off'
  });
  var searchBtn = U.el('button.btn.btn-primary.go', { type: 'button' }, [
    I.el('search', { size: 15 }),
    U.el('span', { text: '搜索' })
  ]);
  function doSearch() {
    var q = searchInput.value.trim();
    if (q) { Ark.store.pushSearch(q); Ark.router.go(Ark.router.href('search', { q: q })); }
    else Ark.router.go(Ark.router.href('search'));
  }
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });

  // 热门标签（取全局 Top 8）
  var hotTags = Ark.data.getTags().slice(0, 8);
  var hotTagBox = U.el('div.hero-hot');
  hotTagBox.appendChild(U.el('span', { text: '大家都在找：' }));
  hotTags.forEach(function (t) {
    hotTagBox.appendChild(U.el('a.tag', { href: Ark.router.href('search', { tags: t.name }) }, '#' + t.name));
  });

  var randomBtn = U.el('button.btn.btn-soft', { type: 'button' }, I.label('🎲 随机推荐一条'));
  randomBtn.addEventListener('click', function () {
    var r = Ark.data.randomResource();
    if (!r) return;
    randomBtn.classList.add('rolling');
    setTimeout(function () { randomBtn.classList.remove('rolling'); }, 620);
    Ark.toast.show('为你随机挑到：' + r.name, 'dice');
    setTimeout(function () { Ark.router.go(Ark.router.href('detail', { id: r.id, random: '1' })); }, 340);
  });

  var statBox = U.el('div.hero-stats');
  [
    { n: stats ? stats.total : 0, l: '收录站点', i: 'folder' },
    { n: stats ? stats.categories.length : 0, l: '一级分类', i: 'grid' },
    { n: stats ? stats.tagTotal : 0, l: '资源标签', i: 'tag' },
    { n: stats ? stats.hotCount + stats.gemCount : 0, l: '热门与宝藏', i: 'gem' }
  ].forEach(function (d) {
    var nEl = U.el('div.n.grad-text', { text: '0' });
    var card = U.el('div.stat', {}, [
      U.el('div.stat-top', {}, [
        nEl,
        I.el(d.i, { size: 18, cls: 'stat-ico' })
      ]),
      U.el('div.l', { text: d.l })
    ]);
    Ark.ui.countUp(nEl, d.n);
    statBox.appendChild(card);
  });

  var hero = U.el('section.hero', {}, [
    U.el('div.hero-bg', { class: 'hero-bg parallax', 'data-speed': '0.22' }),
    U.el('div.hero-grid-lines'),
    U.el('div.orb.orb-1'), U.el('div.orb.orb-2'), U.el('div.orb.orb-3'),
    U.el('div.wrap.hero-inner', {}, [
      U.el('div', {}, [
        U.el('span.hero-eyebrow', {}, [U.el('span.dot'), U.el('span', { text: '全部人工整理 · 每条都可直接访问' })]),
        U.el('h1', {}, [
          U.el('span', { text: '把好用的网站，' }),
          U.el('span.grad-text', { text: '收进一座方舟' })
        ]),
        U.el('p.hero-lead', { text: '从学习教育到游戏娱乐，把值得收藏的网站按领域整理成一张随时可查的地图。' }),
        U.el('div.hero-search', {}, [I.el('search', { size: 18, cls: 'hero-i' }), searchInput, searchBtn]),
        U.el('div.hero-cta', {}, [
          randomBtn,
          U.el('a.btn.btn-ghost', { href: Ark.router.href('category') }, [
            U.el('span', { text: '按分类逛' }),
            I.el('grid', { size: 15 })
          ]),
          U.el('a.btn.btn-ghost', { href: Ark.router.href('search') }, [
            U.el('span', { text: '浏览全部资源' }),
            I.el('arrowRight', { size: 15 })
          ])
        ]),
        hotTagBox
      ]),
      U.el('div.hero-float', {}, [statBox])
    ])
  ]);
  content.appendChild(hero);

  /* ================================================================ 分类导航 */
  var catSec = U.el('section.sec.wrap');
  catSec.appendChild(Ark.ui.sectionHead('资源分类',
    (stats ? stats.categories.length : 0) + ' 个领域 · ' +
    (stats ? stats.categories.reduce(function (a, c) { return a + c.subcategories.length; }, 0) : 0) + ' 个子分类',
    { href: Ark.router.href('category'), text: '全部分类' }, 'grid'));
  var catGrid = U.el('div.cat-grid');
  Ark.data.state().cats.forEach(function (c, i) {
    catGrid.appendChild(U.el('a.cat-card.reveal', {
      href: Ark.router.href('category', { cat: c.id }),
      'data-d': String(i % 6 + 1),
      style: { '--c': c.accent, '--c-soft': U.softColor(c.accent, .15) }
    }, [
      U.el('div.cat-ico', {}, I.el(I.catIcon(c), { size: 22 })),
      U.el('div.cat-name', {}, [U.el('span', { text: c.name })]),
      U.el('div.cat-desc.clamp-2', { text: c.desc }),
      U.el('div.cat-subs', {}, c.subcategories.slice(0, 3).map(function (s) {
        return U.el('span.tag', { text: s.name });
      }).concat(c.subcategories.length > 3 ? [U.el('span.tag', { text: '+' + (c.subcategories.length - 3) })] : [])),
      U.el('div.cat-meta', {}, [
        U.el('span', {}, [U.el('span', { text: c.count + ' 个资源' })]),
        U.el('span.cat-go', { 'aria-hidden': 'true' }, I.el('arrowRight', { size: 15 }))
      ])
    ]));
  });
  catSec.appendChild(catGrid);
  content.appendChild(catSec);

  /* ================================================================ 推荐分区 */
  function recSec(title, sub, list, moreHref, layout, icon) {
    var sec = U.el('section.sec.wrap');
    sec.appendChild(Ark.ui.sectionHead(title, sub, { href: moreHref, text: '查看更多' }, icon));
    var box = U.el('div');
    sec.appendChild(box);
    Ark.ui.miniGrid(box, list, { layout: layout });
    return sec;
  }
  content.appendChild(recSec('热门推荐', '人工标记的热门站点', Ark.data.trending(8), Ark.router.href('search', { sort: 'hot' }), null, 'flame'));
  content.appendChild(recSec('小众宝藏', '冷门但好用，适合收进书签栏', Ark.data.gems(8), Ark.router.href('search', { hot: 2 }), 'masonry', 'gem'));
  content.appendChild(recSec('最新收录', '最近整理入库', Ark.data.latest(8), Ark.router.href('search', { sort: 'new' }), null, 'wand'));

  /* ================================================================ 全站浏览区 */
  var browse = U.el('section.sec.wrap');
  browse.appendChild(Ark.ui.sectionHead('全部资源', '分类 / 标签 / 排序 / 视图随你组合，不跳页直接筛', null, 'zap'));

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
    listBox: listHost, toolbarBox: toolbarHost, pagerBox: pagerHost,
    scrollTarget: function () { return browse.offsetTop - 90; },
    onTag: function (t) { Ark.router.go(Ark.router.href('search', { tags: t })); }
  });

  var state = { cat: '', sub: '', tags: [] };
  function refresh() {
    view.setLoading(true);
    var list = Ark.data.filter({ cat: state.cat, sub: state.sub, tags: state.tags, sort: view.state.sort });
    setTimeout(function () {
      view.setItems(list, { resetPage: true });
      Ark.lazy.scan(content);
    }, 120);
  }
  Ark.filterbar.render(filterHost, {
    cat: '', sub: '', tags: [],
    onChange: function (s) { state = s; refresh(); }
  });
  view.setSort('default');
  refresh();
};
