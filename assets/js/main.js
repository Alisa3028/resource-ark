/* ==========================================================================
   main.js —— SPA 站点启动器（单页应用引导流程 + 路由分发）
   --------------------------------------------------------------------------
   启动顺序：
     主题 → 背景插画 → 加载数据 → 渲染导航栏 / 页脚 → 初始化懒加载与返回顶部
     → 绑定哈希路由 → 渲染当前路由对应的页面模块
   切页顺序（全部为局部渲染，不整页重载）：
     hashchange → 记住上一页滚动位置 → 重绘 #ark-content → 恢复/复位滚动
   ========================================================================== */
window.Ark = window.Ark || {};
Ark.pages = Ark.pages || {};

/* ------------------------------------------------------------------ 事件总线 */
/**
 * 极简事件总线：导航栏、背景插画等常驻组件订阅路由变化，
 * 而页面模块只需专注渲染自己的内容，不必关心别人。
 */
Ark.bus = (function () {
  var list = [];
  return {
    on: function (fn) { if (typeof fn === 'function') list.push(fn); },
    emit: function (ev) {
      list.forEach(function (fn) {
        try { fn(ev); } catch (e) { console.error('[Ark] bus 订阅者异常', e); }
      });
    }
  };
})();

/* --------------------------------------------------------------- 通用 UI 工具 */
Ark.ui = (function () {
  var U = Ark.utils;
  var I = Ark.icons;

  /** 迷你网格：首页各推荐分区复用（不走分页与虚拟滚动） */
  function miniGrid(host, list, opts) {
    opts = opts || {};
    if (!host) return;
    host.innerHTML = '';
    var grid = U.el('div', { class: opts.layout === 'masonry' ? 'masonry' : 'grid-cards' + (opts.dense ? ' dense' : '') });
    list.forEach(function (r, i) {
      var card = Ark.card.render(r, null);
      card.classList.add('reveal');
      card.setAttribute('data-d', String(i % 6 + 1));
      grid.appendChild(card);
    });
    host.appendChild(grid);
    Ark.card.bind(host, {
      onTag: opts.onTag || function (t) { Ark.router.go(Ark.router.href('search', { tags: t })); }
    });
    Ark.lazy.scan(host);
  }

  /**
   * 分区标题
   * @param {string} title 标题（可带前缀表情，会被自动替换为同语义的线性图标）
   * @param {string} sub 副标题
   * @param {object} more { href, text } 右侧「查看更多」
   * @param {string} icon 显式指定图标名（不传则按标题前缀表情推断）
   */
  function sectionHead(title, sub, more, icon) {
    var raw = String(title == null ? '' : title);
    var em = I.leadingEmoji(raw);
    var text = em ? raw.slice(em.length).trim() : raw;
    var iconName = icon || (em ? I.forEmoji(em) : null);

    var h2 = U.el('h2', {}, [
      U.el('span.bar'),
      iconName ? I.el(iconName, { size: 19, cls: 'sec-ico' }) : null,
      U.el('span', { text: text })
    ]);

    return U.el('div.sec-head', {}, [
      U.el('div', {}, [h2, sub ? U.el('div.sec-sub', { text: sub }) : null]),
      more ? U.el('a.btn.btn-soft.btn-xs', { href: more.href }, [
        U.el('span', { text: more.text }),
        I.el('arrowRight', { size: 14 })
      ]) : null
    ]);
  }

  /** 统计数字滚动动画 */
  function countUp(node, target, dur) {
    dur = dur || 900;
    var start = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = U.fmtNum(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /**
   * 空状态骨架：统一「图标 + 主文案 + 说明 + 可选操作」的结构
   * @param {string} icon 图标名
   * @param {string} title 主文案
   * @param {string} desc 辅助说明
   * @param {Array<Element>} actions 操作按钮
   */
  function empty(icon, title, desc, actions) {
    var box = U.el('div.empty', {}, [
      U.el('div.ico', { html: I.svg(icon || 'inbox', { size: 42, stroke: 1.4 }) }),
      U.el('p.empty-t', { text: title || '这里还没有内容' })
    ]);
    if (desc) box.appendChild(U.el('p.tiny.dim', { text: desc }));
    if (actions && actions.length) box.appendChild(U.el('div.empty-actions', {}, actions));
    return box;
  }

  return { miniGrid: miniGrid, sectionHead: sectionHead, countUp: countUp, empty: empty };
})();

/* ------------------------------------------------------------------ 启动流程 */
Ark.app = (function () {
  var U = Ark.utils;

  var lastHash = null;      // 上一次渲染的路由哈希，用于记录离开时的滚动位置
  var first = true;

  /* 每个路由的标题与描述，切页时同步到 <title> / meta，利于收录与分享 */
  var META = {
    home:      ['一站式优质网站资源导航库', '按领域整理优质网站，支持多级分类、多标签筛选与全文模糊搜索。'],
    category:  ['资源分类', '按领域与子分类逐层浏览优质网站资源。'],
    detail:    ['资源详情', '站点信息、访问地址、相关推荐与同类资源。'],
    search:    ['搜索资源', '按名称、用途、标签、分类与域名检索全站资源。'],
    tags:      ['标签云', '按标签发现全站资源，字号代表收录数量。'],
    changelog: ['更新日志', '记录资源方舟的每一次迭代与数据变更。'],
    about:     ['关于本站', '项目说明、功能清单与二次开发指引。'],
    history:   ['浏览历史', '最近浏览过的资源，保存在浏览器本地。'],
    favorites: ['我的收藏', '收藏的资源，保存在浏览器本地。'],
    feedback:  ['反馈建议', '死链反馈、信息纠错与资源推荐。']
  };

  function fail(err) {
    console.error('[Ark] 启动失败', err);
    var host = document.getElementById('ark-content') || document.body;
    host.innerHTML = '';
    host.appendChild(U.el('div.panel.panel-pad', { style: { margin: '40px auto', maxWidth: '620px' } }, [
      U.el('h3', { text: '数据没能加载出来' }),
      U.el('p.sm.muted', { text: '页面代码已经就绪，但资源数据读取失败。常见原因：' }),
      U.el('ul.sm.muted', { style: { paddingLeft: '20px', listStyle: 'disc' } }, [
        U.el('li', { text: '直接双击打开的本地页面缺少 assets/js/data-fallback.js —— 请先运行 tools/build-data.py' }),
        U.el('li', { text: '部署到静态托管时 data/ 目录没有一起上传' })
      ]),
      U.el('div.sm.dim', { style: { marginTop: '10px' }, text: String(err && err.message || err) })
    ]));
  }

  function setMeta(name, route) {
    var site = Ark.data.getSite();
    var m = META[name] || META.home;
    var suffix = name === 'home' ? '' : ' · ' + (site.name || '资源方舟');
    document.title = m[0] + suffix;

    var desc = U.$('meta[name="description"]');
    if (desc) desc.setAttribute('content', m[1]);

    // 首页描述用实时统计拼装，数据变了 meta 不会过期
    if (name === 'home' && desc) {
      var st = Ark.data.getStats();
      if (st) {
        desc.setAttribute('content', '收录 ' + st.total + ' 个优质网站，覆盖 ' + st.categories.length +
          ' 大领域与 ' + st.tagTotal + ' 个标签，支持多级分类、多标签筛选与全文模糊搜索。');
      }
    }

    // 分类页/详情页把具体对象名写进标题，分享出去更清楚
    if (name === 'category' && route.params.cat) {
      var c = Ark.data.getCategory(route.params.cat);
      if (c) document.title = c.name + ' · ' + (site.name || '资源方舟');
    }
    if (name === 'detail' && route.params.id) {
      var r = Ark.data.getResource(route.params.id);
      if (r) document.title = r.name + ' · ' + (site.name || '资源方舟');
    }
    if (name === 'search' && route.params.q) {
      document.title = '搜索「' + route.params.q + '」 · ' + (site.name || '资源方舟');
    }
  }

  /** 重放入场动画（每次切页都重新播一次，制造「换页」的观感） */
  function replay(host) {
    if (!host) return;
    host.classList.remove('route-out');
    host.classList.remove('route-in');
    void host.offsetWidth;              // 强制重排，让动画可以重播
    host.classList.add('route-in');
  }

  /**
   * 渲染一个路由（SPA 的核心：只重绘 #ark-content）
   * @param {object} ev { route, force, navKind }
   */
  function renderPage(ev) {
    var route = ev.route;
    var name = route.name;
    var content = document.getElementById('ark-content');
    var crumb = document.getElementById('ark-crumb');
    if (!content) return;

    // 1) 记住离开页面的滚动位置（返回时可原位恢复）
    if (lastHash && lastHash !== route.hash) Ark.router.remember(lastHash, window.pageYOffset || 0);

    // 2) 清理上一页的容器状态（面包屑由当前页面自行决定是否渲染）
    content.innerHTML = '';
    if (crumb) { crumb.innerHTML = ''; crumb.classList.remove('crumb'); }
    document.body.dataset.route = name;

    // 3) 导航高亮 / 标题
    Ark.navbar.setActive(name);
    setMeta(name, route);

    // 4) 调用页面模块
    var mod = Ark.pages[name] || Ark.pages.home;
    if (typeof mod === 'function') {
      try {
        mod();
      } catch (e) {
        console.error('[Ark] 页面模块渲染失败：' + name, e);
        content.appendChild(Ark.ui.empty('warn', '页面渲染出错了', String(e && e.message || e), [
          U.el('a.btn.btn-primary', { href: Ark.router.href('home'), text: '回到首页' })
        ]));
      }
    } else {
      content.appendChild(Ark.ui.empty('compass', '页面不存在', '没有找到对应的页面模块', [
        U.el('a.btn.btn-primary', { href: Ark.router.href('home'), text: '回到首页' })
      ]));
    }

    // 5) 动画 + 懒加载
    replay(content);
    Ark.lazy.scan(content);
    Ark.lazy.collectParallax();

    // 6) 滚动：进去用顶部，后退/前进回到原位；带 to 参数则定位到锚点
    if (route.params.to) {
      var target = document.getElementById(route.params.to);
      if (target) {
        requestAnimationFrame(function () {
          window.scrollTo({ top: Math.max(0, target.offsetTop - 90), behavior: first ? 'auto' : 'smooth' });
        });
        lastHash = route.hash; first = false;
        return;
      }
    }
    if (ev.navKind === 'pop') {
      var y = Ark.router.memoOf(route.hash);
      window.scrollTo({ top: y == null ? 0 : y, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    lastHash = route.hash;
    first = false;
  }

  function init() {
    Ark.store.markVisited();
    Ark.theme.init();                 // 二次确认主题（head 里的内联脚本已先跑一遍防闪白）

    var navHost = document.getElementById('ark-nav');
    var footHost = document.getElementById('ark-footer');
    var done = Ark.router.progress();

    Ark.data.load().then(function (state) {
      // data/site.json 覆盖默认站点信息
      if (state.site) Object.assign(Ark.config.site, state.site);

      if (navHost) Ark.navbar.render(navHost);
      if (footHost) Ark.footer.render(footHost);

      // 数据加载完成后搜索索引需重建
      Ark.search.reset();

      Ark.lazy.init();
      Ark.backtotop.init();
      Ark.shortcuts.init();          // 全局键盘快捷键（/ ? r t g h）

      // 背景插画：首屏之后惰性加载，避免和内容抢带宽
      if (Ark.background) Ark.background.init();

      // 路由：先订阅，再绑定，最后渲染首屏
      Ark.router.onChange(function (ev) {
        renderPage(ev);
        Ark.bus.emit(ev);
      });
      Ark.router.bind();
      Ark.router.dispatch(Ark.router.parse());

      done();

      // 控制台友好提示，便于二次开发
      console.log('%c' + (Ark.config.site.name || 'ResourceArk') +
        '%c 已就绪 · SPA 哈希路由 · 共 ' + state.resources.length + ' 条资源 · 数据源：' +
        (state.source === 'json' ? 'data/*.json' : 'data-fallback.js'),
        'font-weight:800;color:#6366f1', 'color:inherit');
    }).catch(function (e) { done(); fail(e); });
  }

  U.ready(init);
  return { init: init, renderPage: renderPage };
})();
