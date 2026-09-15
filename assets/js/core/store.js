/* ==========================================================================
   core/store.js —— 本地存储层
   --------------------------------------------------------------------------
   全部走 localStorage，key 统一加前缀。存的是「用户偏好 + 浏览记录 + 收藏」，
   与站点数据完全解耦，清空缓存不会影响资源库本身。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.store = (function () {
  var K = Ark.config.KEY;
  var mem = {};           // localStorage 不可用时的内存降级
  var seenCache = null;   // 「已浏览过」的 id 集合缓存：卡片渲染每张都要问一次，不能每次解析 JSON

  function raw(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
      return val;
    } catch (e) {                      // 隐私模式 / 存储写满
      if (val === undefined) return mem[key] === undefined ? null : mem[key];
      if (val === null) delete mem[key]; else mem[key] = val;
      return val;
    }
  }
  function get(key, def) {
    var v = raw(key);
    if (v == null) return def;
    try { return JSON.parse(v); } catch (e) { return v; }
  }
  function set(key, val) { raw(key, JSON.stringify(val)); return val; }

  /** 收藏变化广播：导航栏角标、收藏页等据此刷新 */
  function notifyFav() {
    try { window.dispatchEvent(new CustomEvent('ark:favchange')); } catch (e) { /* 老浏览器忽略 */ }
  }

  var api = {
    get: get, set: set, remove: function (k) { raw(k, null); },

    /* ------------------------------------------------ 偏好 */
    getTheme: function () { return get(K.theme, 'light'); },
    setTheme: function (v) { return set(K.theme, v); },

    getAccent: function () { return get(K.accent, null); },
    setAccent: function (v) { return set(K.accent, v); },

    getRadius: function () { return get(K.radius, 'soft'); },
    setRadius: function (v) { return set(K.radius, v); },

    getMotion: function () { return get(K.motion, true); },
    setMotion: function (v) { return set(K.motion, !!v); },

    getView: function () { return get(K.view, 'card'); },
    setView: function (v) { return set(K.view, v); },

    getLayout: function () { return get(K.layout, 'grid'); },
    setLayout: function (v) { return set(K.layout, v); },

    getPageSize: function () { return get(K.pageSize, 48); },
    setPageSize: function (v) { return set(K.pageSize, v); },

    /* ------------------------------------------------ 浏览历史 */
    history: function () { return get(K.history, []) || []; },

    /**
     * 「看过没有」的快查集合（id -> 1）。
     * 卡片渲染时每张都要判断一次，直接用数组 indexOf 在千条量级下会明显拖慢渲染，
     * 因此解析一次后缓存；历史一旦变化必须立刻失效（见 visit / clearHistory / removeHistory）。
     */
    seen: function () {
      if (!seenCache) {
        seenCache = {};
        api.history().forEach(function (h) { if (h && h.id) seenCache[h.id] = 1; });
      }
      return seenCache;
    },
    invalidateSeen: function () { seenCache = null; },

    /** 记录一次浏览（去重后置顶，超出上限自动截断） */
    visit: function (id, meta) {
      var list = api.history().filter(function (x) { return x.id !== id; });
      list.unshift({ id: id, t: Date.now(), name: meta && meta.name, url: meta && meta.url, cat: meta && meta.cat });
      if (list.length > Ark.config.historyMax) list.length = Ark.config.historyMax;
      set(K.history, list);
      api.invalidateSeen();
      try { window.dispatchEvent(new CustomEvent('ark:visitchange')); } catch (e) { /* 忽略 */ }
      return list;
    },
    clearHistory: function () { set(K.history, []); api.invalidateSeen(); try { window.dispatchEvent(new CustomEvent('ark:visitchange')); } catch (e) { /* 忽略 */ } },
    removeHistory: function (id) {
      set(K.history, api.history().filter(function (x) { return x.id !== id; }));
      api.invalidateSeen();
      try { window.dispatchEvent(new CustomEvent('ark:visitchange')); } catch (e) { /* 忽略 */ }
    },

    /* ------------------------------------------------ 收藏 */
    favorites: function () { return get(K.favorites, []) || []; },
    isFav: function (id) { return api.favorites().indexOf(id) > -1; },
    toggleFav: function (id) {
      var list = api.favorites(), i = list.indexOf(id);
      if (i > -1) list.splice(i, 1); else list.unshift(id);
      set(K.favorites, list);
      notifyFav();
      return i === -1;      // true 表示本次是「加入收藏」
    },
    clearFav: function () { set(K.favorites, []); notifyFav(); },
    /** 直接改写收藏列表后，手动广播一次变化（导入备份等场景用） */
    notifyFavChange: function () { notifyFav(); },

    /* ------------------------------------------------ 站点访问统计 */
    visits: function () { return get(K.visited, 0) || 0; },
    markVisited: function () { return set(K.visited, api.visits() + 1); },

    /* ------------------------------------------------ 搜索词 */
    recentSearch: function () { return get(K.keyword, []) || []; },
    pushSearch: function (kw) {
      if (!kw) return [];
      var list = api.recentSearch().filter(function (x) { return x !== kw; });
      list.unshift(kw);
      if (list.length > 8) list.length = 8;
      set(K.keyword, list);
      return list;
    },

    /** 一次性清空本站所有本地数据 */
    reset: function () {
      Object.keys(K).forEach(function (k) { api.remove(K[k]); });
    }
  };
  return api;
})();
