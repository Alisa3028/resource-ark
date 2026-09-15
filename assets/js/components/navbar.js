/* ==========================================================================
   components/navbar.js —— 顶栏（品牌 / 导航 / 全局搜索 / 主题 / 快捷入口 / 移动抽屉）
   --------------------------------------------------------------------------
   SPA 说明：导航栏只在启动时渲染一次，之后路由变化只更新「高亮态」等局部状态，
   因此搜索框里已输入的内容、展开的主题面板都不会在切页时被销毁重建。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.navbar = (function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var host = null;
  var drawer = null;
  var searchInput = null;
  var darkBtn = null;
  var favBadge = null;

  /* ------------------------------------------------------------------ 导航项 */
  function navItems() {
    return [
      { id: 'home',      name: '首页',     icon: 'home',   href: Ark.router.href('home') },
      { id: 'category',  name: '资源分类', icon: 'grid',   href: Ark.router.href('category') },
      { id: 'search',    name: '全部资源', icon: 'search', href: Ark.router.href('search') },
      { id: 'tags',      name: '标签云',   icon: 'tag',    href: Ark.router.href('tags') },
      { id: 'changelog', name: '更新日志', icon: 'book',   href: Ark.router.href('changelog') },
      { id: 'about',     name: '关于本站', icon: 'info',   href: Ark.router.href('about') }
    ];
  }

  /** 生成导航链接（带图标与 data-nav，便于路由切换时高亮） */
  function links() {
    return navItems().map(function (i) {
      return U.el('a.nav-link', { href: i.href, dataset: { nav: i.id } }, [
        I.el(i.icon, { size: 16, cls: 'nav-i' }),
        U.el('span', { text: i.name })
      ]);
    });
  }

  /* ------------------------------------------------------------- 搜索与联想 */
  function buildSuggest(input) {
    var panel = U.el('div.nav-suggest');
    panel.hidden = true;

    // hidden 属性负责「彻底不参与布局」，open 类负责淡入动画，两者必须同步，
    // 否则面板会因为始终带着 hidden 而永远不显示。
    function open() { panel.hidden = false; panel.classList.add('open'); }
    function close() { panel.classList.remove('open'); panel.hidden = true; }
    panel._open = open; panel._close = close;

    function update(q) {
      var s = Ark.search.suggest(q, 6);
      if (!s.tags.length && !s.names.length) { close(); return; }
      panel.innerHTML = '';
      if (s.names.length) {
        panel.appendChild(U.el('div.sug-title', { text: '资源' }));
        s.names.forEach(function (n) {
          panel.appendChild(U.el('a.sug-item', { href: Ark.router.href('detail', { id: n.id }) }, [
            I.el('arrowRight', { size: 15, cls: 'sug-ico' }),
            U.el('div.sug-text', {}, [
              U.el('div.t', { text: n.name }),
              U.el('div.s', { text: n.cat })
            ])
          ]));
        });
      }
      if (s.tags.length) {
        panel.appendChild(U.el('div.sug-title', { text: '标签' }));
        var wrap = U.el('div.sug-tags');
        s.tags.forEach(function (t) {
          wrap.appendChild(U.el('a.tag', { href: Ark.router.href('search', { tags: t.name }) }, [
            I.el('tag', { size: 12 }),
            U.el('span', { text: t.name }),
            U.el('span.n', { text: String(t.count) })
          ]));
        });
        panel.appendChild(wrap);
      }
      open();
    }

    input.addEventListener('input', U.debounce(function () { update(input.value.trim()); }, 140));
    input.addEventListener('focus', function () { if (input.value.trim()) update(input.value.trim()); });
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target) && e.target !== input) close();
    });
    return panel;
  }

  function searchBox(extraClass) {
    var input = U.el('input', {
      type: 'search', placeholder: '搜索资源名称、用途描述或标签…',
      'aria-label': '全局搜索', autocomplete: 'off', spellcheck: 'false'
    });
    var box = U.el('div' + (extraClass || '.nav-search'), {}, [
      I.el('search', { size: 17, cls: 'search-ico' }),
      input,
      U.el('kbd', { text: '/' })
    ]);
    box.appendChild(buildSuggest(input));

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var q = input.value.trim();
        if (q) { Ark.store.pushSearch(q); Ark.router.go(Ark.router.href('search', { q: q })); }
        else Ark.router.go(Ark.router.href('search'));
      } else if (e.key === 'Escape') { input.blur(); box.querySelector('.nav-suggest')._close(); }
    });
    return { box: box, input: input };
  }

  /* --------------------------------------------------------------- 动作按钮 */
  function randomGo() {
    var r = Ark.data.randomResource();
    if (!r) { Ark.toast.show('数据还在加载…', 'clock'); return; }
    Ark.toast.show('随机推荐：' + r.name, 'dice');
    setTimeout(function () {
      Ark.router.go(Ark.router.href('detail', { id: r.id, random: '1' }));
    }, Ark.store.getMotion() ? 240 : 0);
  }

  /** 主题面板挂载点 + 气泡 */
  function themeControl() {
    var btn = U.el('button.icon-btn#ark-theme', { type: 'button', title: '主题与外观', 'aria-label': '主题与外观' }, I.el('palette', { size: 19 }));
    var pop = U.el('div.theme-pop#ark-theme-pop');
    var wrap = U.el('div.pop-wrap', {}, [btn, pop]);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var opening = !pop.classList.contains('open');
      pop.classList.toggle('open', opening);
      btn.classList.toggle('active', opening);
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) { pop.classList.remove('open'); btn.classList.remove('active'); }
    });
    Ark.theme.bindPanel(pop, null);
    return { wrap: wrap, btn: btn, pop: pop };
  }

  /** 明暗一键翻转：图标随当前方案变化（浅色显示月亮，深色显示太阳） */
  function syncDarkBtn() {
    if (!darkBtn) return;
    var theme = Ark.config.themes.filter(function (t) { return t.id === Ark.theme.current(); })[0];
    var isDark = !!(theme && theme.scheme === 'dark');
    darkBtn.innerHTML = I.svg(isDark ? 'sun' : 'moon', { size: 19 });
    darkBtn.setAttribute('title', isDark ? '深色 / 亮色一键切换' : '亮色 / 深色一键切换');
  }

  /** 收藏数量小角标 */
  function refreshBadges() {
    if (!favBadge) return;
    var n = Ark.store.favorites().length;
    favBadge.textContent = n > 99 ? '99+' : String(n || '');
    favBadge.classList.toggle('on', n > 0);
  }

  /* ------------------------------------------------------------ 移动端抽屉 */
  function buildDrawer() {
    var cats = Ark.data.state().cats;
    var catLinks = cats.map(function (c) {
      return U.el('a.drawer-link', { href: Ark.router.href('category', { cat: c.id }) }, [
        I.el(I.catIcon(c), { size: 17 }),
        U.el('span', { text: c.name }),
        U.el('span.dim.tiny', { style: { marginLeft: 'auto' }, text: String(c.count || '') })
      ]);
    });

    var ms = searchBox('.m-search');
    ms.box.style.cssText = 'position:relative;margin-bottom:14px';

    var more = [
      ['tags', '标签云', 'tag'],
      ['favorites', '我的收藏', 'star'],
      ['history', '浏览历史', 'clock'],
      ['feedback', '反馈建议', 'mail']
    ].map(function (m) {
      return U.el('a.drawer-link', { href: Ark.router.href(m[0]), dataset: { nav: m[0] } }, [
        I.el(m[2], { size: 17 }), U.el('span', { text: m[1] })
      ]);
    });

    /* 抽屉里的快捷键入口（移动端顶栏放不下按钮时的兜底） */
    var keysLink = U.el('button.drawer-link', { type: 'button' }, [
      I.el('keyboard', { size: 17 }),
      U.el('span', { text: '键盘快捷键' }),
      U.el('span.dim.tiny', { style: { marginLeft: 'auto' }, text: '?' })
    ]);
    keysLink.addEventListener('click', function () { closeDrawer(); Ark.shortcuts.open(); });

    var closeBtn = U.el('button.icon-btn', { type: 'button', 'aria-label': '关闭菜单', title: '关闭' }, I.el('close', { size: 18 }));

    drawer = U.el('div.drawer', {}, [
      U.el('div.drawer-panel', {}, [
        U.el('div.drawer-head', {}, [U.el('strong', { text: '导航' }), closeBtn]),
        ms.box,
        navItems().map(function (i) {
          return U.el('a.drawer-link', { href: i.href, dataset: { nav: i.id } }, [
            I.el(i.icon, { size: 17 }), U.el('span', { text: i.name })
          ]);
        }),
        U.el('div.drawer-group-title', { text: '资源分类' }),
        catLinks,
        U.el('div.drawer-group-title', { text: '更多' }),
        more.concat([keysLink])
      ])
    ]);
    closeBtn.addEventListener('click', function () { drawer.classList.remove('open'); });
    drawer.addEventListener('click', function (e) { if (e.target === drawer) drawer.classList.remove('open'); });
    document.body.appendChild(drawer);
    return drawer;
  }

  function closeDrawer() { if (drawer) drawer.classList.remove('open'); }

  /* ---------------------------------------------------------------- 高亮态 */
  function setActive(name) {
    if (!host) return;
    U.$$('[data-nav]', host).forEach(function (n) {
      n.classList.toggle('active', n.dataset.nav === name);
    });
    if (drawer) {
      U.$$('[data-nav]', drawer).forEach(function (n) {
        n.classList.toggle('active', n.dataset.nav === name);
      });
    }
  }

  /** 路由变化后同步搜索框内容（在搜索页时回填关键词，其它页面保留用户输入） */
  function syncSearch(route) {
    if (!searchInput || !route) return;
    var q = route.name === 'search' ? (route.params.q || '') : '';
    if (route.name === 'search' && document.activeElement !== searchInput) {
      searchInput.value = q;
    }
    if (route.name !== 'search') searchInput.value = '';
  }

  /* ------------------------------------------------------------------ 渲染 */
  function render(navHost) {
    host = navHost;
    var site = Ark.data.getSite();
    var s = searchBox('.nav-search');
    searchInput = s.input;

    var theme = themeControl();
    darkBtn = U.el('button.icon-btn#ark-dark', { type: 'button', 'aria-label': '切换明暗' }, '');
    darkBtn.addEventListener('click', function () { Ark.theme.toggleDark(); syncDarkBtn(); });
    syncDarkBtn();

    var randomBtn = U.el('button.icon-btn#ark-random', { type: 'button', title: '随机推荐一条资源', 'aria-label': '随机推荐' }, I.el('dice', { size: 19 }));
    randomBtn.addEventListener('click', randomGo);

    favBadge = U.el('span.icon-badge');

    var favLink = U.el('a.icon-btn#ark-fav', { href: Ark.router.href('favorites'), title: '我的收藏', 'aria-label': '我的收藏' }, [I.el('star', { size: 19 }), favBadge]);
    var histLink = U.el('a.icon-btn#ark-hist', { href: Ark.router.href('history'), title: '浏览历史', 'aria-label': '浏览历史' }, I.el('clock', { size: 19 }));
    var burger = U.el('button.icon-btn.burger', { type: 'button', title: '菜单', 'aria-label': '菜单' }, I.el('menu', { size: 19 }));

    /* 快捷键入口：窄屏空间紧张，由 CSS 在 1180px 以下隐藏（footer / 抽屉里仍有入口） */
    var keysBtn = U.el('button.icon-btn#ark-keys', { type: 'button', title: '键盘快捷键（?）', 'aria-label': '键盘快捷键' }, I.el('keyboard', { size: 19 }));
    keysBtn.addEventListener('click', function () { Ark.shortcuts.toggle(); });

    var actions = U.el('div.nav-actions', {}, [s.box, randomBtn, keysBtn, histLink, favLink, theme.wrap, darkBtn, burger]);

    host.classList.add('nav');
    host.innerHTML = '';
    host.appendChild(U.el('div.wrap.nav-inner', {}, [
      U.el('a.logo', { href: Ark.router.href('home'), 'aria-label': site.name || '资源方舟' }, [
        U.el('span.logo-mark', {}, [I.el('arkMark', { size: 22 })]),
        U.el('span', {}, [
          U.el('span.logo-text', { text: site.name || '资源方舟' }),
          U.el('span.logo-sub', { text: (site.enName || 'RESOURCE ARK').toUpperCase() })
        ])
      ]),
      U.el('nav.nav-links', {}, links()),
      actions
    ]));

    buildDrawer();
    burger.addEventListener('click', function () { drawer.classList.add('open'); });

    /* ---- 滚动吸顶阴影 ---- */
    var onScroll = U.throttle(function () {
      host.classList.toggle('is-stuck', window.pageYOffset > 8);
    }, 80);
    window.addEventListener('scroll', onScroll, { passive: true });

    /* 注：/ ? r t g h 等全局快捷键统一由 components/shortcuts.js 处理，
       这里不再单独监听 keydown，避免两处逻辑打架。 */

    /* ---- 订阅路由：更新高亮、关闭抽屉、同步搜索框 ---- */
    Ark.bus.on(function (ev) {
      setActive(ev.route.name);
      closeDrawer();
      syncSearch(ev.route);
      syncDarkBtn();
      refreshBadges();
    });

    /* ---- 主题变化（含明暗翻转）后同步按钮图标 ---- */
    document.addEventListener('ark:theme', function () { syncDarkBtn(); });
    /* ---- 收藏变化后刷新角标 ---- */
    window.addEventListener('ark:favchange', refreshBadges);

    setActive(Ark.router.current());
    refreshBadges();

    return { searchInput: searchInput, setActive: setActive, refreshBadges: refreshBadges };
  }

  return { render: render, randomGo: randomGo, setActive: setActive, refreshBadges: refreshBadges, closeDrawer: closeDrawer };
})();
