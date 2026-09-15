/* ==========================================================================
   core/router.js —— 哈希式 SPA 前端路由（单页应用，局部渲染）
   --------------------------------------------------------------------------
   为什么用哈希而不是 History API？
     本站要求「双击本地 HTML 也能完整运行」（file:// 协议）。file:// 下浏览
     器禁止 pushState / replaceState 改写路径，而哈希变化始终安全，因此采用
     `#/路径?参数` 形式，HTTP 与 file:// 两种环境下行为完全一致，静态托管
     也无需任何 rewrite 配置。

   路由表（一个页面 = 一个哈希路径）：
     #/                                     首页
     #/category[?cat=&sub=&tags=&page=]     分类页（二级 / 三级）
     #/detail?id=xxx                        资源详情页
     #/search?q=&tags=&cat=&sort=&page=     搜索 / 筛选结果页
     #/tags[?cat=&q=&all=1]                 标签云
     #/changelog  #/about                   更新日志 / 关于
     #/history  #/favorites  #/feedback     历史 / 收藏 / 反馈

   切页流程（不整页重载）：
     go() → 记录当前滚动位置 → 播放离场过渡 → 改写 location.hash
          → hashchange → renderPage() 局部重绘 #ark-content
     · 面包屑、收藏、浏览历史都落在 URL / localStorage 上，切页天然不丢
     · 前进后退由 hashchange 驱动，并自动恢复上一次的滚动位置
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.router = (function () {
  var U = Ark.utils;

  /** 逻辑页面 → 哈希路径段（首页为空段，得到最干净的 #/） */
  var ROUTES = {
    home:      '',
    category:  'category',
    detail:    'detail',
    search:    'search',
    tags:      'tags',
    changelog: 'changelog',
    about:     'about',
    history:   'history',
    favorites: 'favorites',
    feedback:  'feedback'
  };

  /* 路径段 → 逻辑页面（反查表） */
  var BY_SEG = {};
  Object.keys(ROUTES).forEach(function (k) { BY_SEG[ROUTES[k]] = k; });

  /* 旧的 MPA 文件名 → 新的逻辑页面，用于兼容历史外链 / 收藏夹里的老地址 */
  var LEGACY = {
    'index.html': 'home',
    'category.html': 'category',
    'detail.html': 'detail',
    'search.html': 'search',
    'tags.html': 'tags',
    'changelog.html': 'changelog',
    'about.html': 'about',
    'history.html': 'history',
    'favorites.html': 'favorites',
    'feedback.html': 'feedback'
  };

  /** 每个路由记住离开时的滚动位置，返回时可原位恢复 */
  var scrollMemo = {};
  var navKind = 'pop';          // 'push' 表示新进入，'pop' 表示前进/后退
  var pendingSilent = null;     // 仅同步 URL、不重渲染时的目标哈希
  var listeners = [];
  var leaving = false;

  /* --------------------------------------------------------------- 基础工具 */

  /** 把任意字符串归一成 `#/xxx?yyy` 形态；空值一律视为首页 */
  function normalize(h) {
    h = String(h == null ? '' : h);
    var i = h.indexOf('#');
    h = i > -1 ? h.slice(i) : '';
    if (!h || h === '#' || h === '#/') return '#/';
    return h.charAt(0) === '#' ? h : '#' + h;
  }

  /** 生成站内链接：#/search?q=xxx */
  function href(name, params) {
    var seg = ROUTES[name];
    if (seg === undefined) seg = String(name).replace(/^#?\/?/, '');   // 允许直接传路径段

    var out = '#/' + seg;
    if (!params) return out;

    var qs = new URLSearchParams();
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v == null || v === '' || v === false || (Array.isArray(v) && !v.length)) return;
      qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
    });
    var s = qs.toString();
    return s ? out + '?' + s : out;
  }

  /**
   * 解析路由（不传参则解析当前地址栏）
   * @returns {{name:string, seg:string, params:object, hash:string}}
   */
  function parse(input) {
    var raw = input == null ? (location.hash || '') : String(input);

    // 允许传入完整 URL / 带 # 的字符串 / 纯路径段
    var hash = normalize(raw);
    var body = hash.slice(2);                       // 去掉 '#/'
    var qi = body.indexOf('?');
    var qs = qi > -1 ? body.slice(qi + 1) : '';
    var seg = (qi > -1 ? body.slice(0, qi) : body).replace(/\/+$/, '');

    var params = {};
    new URLSearchParams(qs).forEach(function (v, k) { params[k] = v; });

    var name = BY_SEG[seg];
    if (name === undefined) {
      // 兼容 pages/xxx.html?params 这类旧地址
      var file = seg.split('/').pop();
      if (LEGACY[file]) name = LEGACY[file];
    }
    return {
      name: name || 'home',
      seg: seg,
      params: params,
      hash: '#/' + seg + (qs ? '?' + qs : '')
    };
  }

  function current() { return parse().name; }

  /** 旧式 .html 链接 → 哈希路由；不是旧式相对链接则返回 null */
  function legacyToHash(h) {
    var s = String(h);
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null;   // 带协议的绝对地址不处理
    if (s.indexOf('#/') > -1) return null;             // 已经是哈希路由
    if (!/\.html(\?|#|$)/.test(s)) return null;
    var qi = s.indexOf('?');
    var path = qi > -1 ? s.slice(0, qi) : s.split('#')[0];
    var rest = qi > -1 ? s.slice(qi) : '';
    var file = path.split('/').pop();
    var name = LEGACY[file];
    if (!name) return null;
    return '#/' + ROUTES[name] + rest;
  }

  /* --------------------------------------------------------------- 渲染调度 */

  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function emit(route) { listeners.forEach(function (f) { try { f(route); } catch (e) { console.error(e); } }); }

  /** 供外部（main.js）在 hashchange 时触发一次渲染 */
  function dispatch(route, force) {
    var r = route || parse();
    emit({ route: r, force: !!force, navKind: navKind });
    navKind = 'pop';
  }

  /**
   * 站内跳转：先记住滚动位置并播离场动画，再改写哈希触发局部渲染
   * @param {string} target 站内链接（'#/xxx'、'xxx'、完整 URL 均可）
   * @param {boolean} replace 是否替换当前历史记录（不新增后退栈）
   */
  function go(target, replace) {
    var t = String(target == null ? '' : target);

    // 真正的外链 / mailto / tel：交给浏览器自行处理
    if (/^(https?:|mailto:|tel:|javascript:)/i.test(t) && t.indexOf('#/') === -1) {
      location.href = t;
      return;
    }

    var next = legacyToHash(t) || parse(t).hash;
    var now = normalize(location.hash);

    // 同一个路由：只重绘当前页面（如「随机推荐」重复抽到同一页）
    if (next === now) {
      scrollMemo[now] = 0;
      window.scrollTo({ top: 0, behavior: 'auto' });
      dispatch(parse(next), true);
      return;
    }

    if (leaving) return;
    leaving = true;
    scrollMemo[now] = window.pageYOffset || 0;

    var host = U.$('#ark-content');
    var delay = (Ark.store.getMotion() && host) ? 130 : 0;
    if (host && delay) host.classList.add('route-out');

    setTimeout(function () {
      leaving = false;
      navKind = 'push';
      if (replace) location.replace(next);
      else location.hash = next;
    }, delay);
  }

  /** 仅同步地址栏、不触发重渲染（页面内部筛选时保持 URL 与状态一致） */
  function replace(target) {
    var next = legacyToHash(String(target == null ? '' : target)) || parse(target).hash;
    if (next === normalize(location.hash)) return;
    pendingSilent = next;
    try { location.replace(next); } catch (e) { pendingSilent = null; }
  }

  /**
   * 让页面模块里的 history.replaceState(null, '', '#/x?y') 也能在 file:// 下工作。
   * 浏览器在 file:// 下会拒绝改写路径，拦截后改走 location.replace（仅换哈希，不重载）。
   */
  function patchHistory() {
    if (history.__arkPatched) return;
    history.__arkPatched = true;
    var orig = history.replaceState;
    history.replaceState = function (state, title, url) {
      if (url != null && String(url).indexOf('#/') > -1) {
        replace(String(url));
        return;
      }
      try { return orig.call(history, state, title, url); } catch (e) { return undefined; }
    };
  }

  /** 捕获站内链接点击，统一走局部渲染 */
  function bind() {
    patchHistory();

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;

      var h = a.getAttribute('href');
      if (!h) return;

      // 外链、锚点、协议链接一律放行
      if (/^(https?:|mailto:|tel:|javascript:)/i.test(h)) return;
      if (h.charAt(0) === '#' && h.indexOf('#/') !== 0) return;

      var next = legacyToHash(h) || (h.indexOf('#/') === 0 ? h : null);
      if (!next) return;

      e.preventDefault();
      e.stopPropagation();
      go(next);
    }, true);

    window.addEventListener('hashchange', function () {
      var now = normalize(location.hash);
      if (pendingSilent !== null) {
        var silent = pendingSilent;
        pendingSilent = null;
        if (now === silent) return;         // 只是同步 URL，页面已经是最新状态
      }
      dispatch(parse());
    });

    // 首次进入没有哈希时补一个规范化的 #/，保证地址栏与路由始终一致
    // （标记为静默替换，避免与启动时的首屏渲染重复触发）
    if (!location.hash) {
      pendingSilent = '#/';
      try { location.replace('#/'); } catch (e) { pendingSilent = null; }
    }
  }

  /** 取回某个路由上次离开时的滚动位置（无记录返回 null） */
  function memoOf(hash) {
    var k = normalize(hash);
    return scrollMemo[k] == null ? null : scrollMemo[k];
  }
  function remember(hash, y) { scrollMemo[normalize(hash)] = y; }

  /** 顶部加载进度条（首屏数据加载时使用） */
  function progress() {
    var bar = U.el('div.topbar');
    document.body.appendChild(bar);
    var w = 0;
    var t = setInterval(function () {
      w = Math.min(w + Math.random() * 18, 88);
      bar.style.width = w + '%';
    }, 120);
    function done() {
      clearInterval(t);
      bar.style.width = '100%';
      bar.classList.add('done');
      setTimeout(function () { bar.remove(); }, 500);
    }
    return done;
  }

  return {
    ROUTES: ROUTES,
    href: href,
    parse: parse,
    go: go,
    replace: replace,
    bind: bind,
    onChange: onChange,
    dispatch: dispatch,
    current: current,
    normalize: normalize,
    memoOf: memoOf,
    remember: remember,
    progress: progress
  };
})();
