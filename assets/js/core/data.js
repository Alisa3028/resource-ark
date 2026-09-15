/* ==========================================================================
   core/data.js —— 数据加载、索引、筛选、排序、分页
   --------------------------------------------------------------------------
   数据与页面完全分离：所有资源都在 data/*.json。本模块是唯一的读写入口。
   加载策略：
     1) HTTP(S) 环境 -> 直接 fetch JSON（改完 JSON 刷新即可生效，无需构建）
     2) file:// 环境 -> 浏览器禁止 fetch 本地文件，自动降级读取
        assets/js/data-fallback.js（由 tools/build-data.py 从同一批 JSON 生成）
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.data = (function () {
  var U = Ark.utils;
  var state = {
    ready: false, loading: null, source: '',
    cats: [], catMap: {}, subMap: {}, resources: [], byId: {},
    tags: [], stats: null, site: {}, quotes: [], changelog: null,
    domainCount: {}, tagCount: {}
  };

  /* ------------------------------------------------------------ 加载 */
  function fetchJSON(p) {
    return fetch(Ark.path(p), { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' @ ' + p);
      return r.json();
    });
  }
  function injectJS(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = function () { rej(new Error('加载失败: ' + src)); };
      document.head.appendChild(s);
    });
  }

  /** 统一入库并建索引 */
  function ingest(d) {
    state.cats = (d.categories && d.categories.categories) || [];
    state.cats.forEach(function (c) {
      state.catMap[c.id] = c;
      (c.subcategories || []).forEach(function (s) {
        state.subMap[c.id + '/' + s.id] = s;
      });
    });

    var doc = d.resources || {};
    state.resources = doc.items || [];
    state.resources.forEach(function (r) {
      state.byId[r.id] = r;
      r._host = U.hostOf(r.url);
      r._origin = U.originOf(r.url);
      r._hay = (r.name + ' ' + r.desc + ' ' + r.tags.join(' ') + ' ' +
                (state.catMap[r.cat] ? state.catMap[r.cat].name : '') + ' ' +
                (state.subMap[r.cat + '/' + r.sub] ? state.subMap[r.cat + '/' + r.sub].name : '')
               ).toLowerCase();
      r._catName = state.catMap[r.cat] ? state.catMap[r.cat].name : '';
      r._subName = state.subMap[r.cat + '/' + r.sub] ? state.subMap[r.cat + '/' + r.sub].name : '';
      r._accent = state.catMap[r.cat] ? state.catMap[r.cat].accent : '#6366f1';
    });

    state.tags = (d.tags && d.tags.tags) || [];
    state.stats = d.stats || null;

    // 把 stats.json 里的条数回填到分类对象上，页面就可以直接用 c.count / s.count
    if (state.stats && state.stats.categories) {
      var byId = {};
      state.stats.categories.forEach(function (c) { byId[c.id] = c; });
      state.cats.forEach(function (c) {
        var s = byId[c.id];
        if (!s) return;
        c.count = s.count;
        var subCount = {};
        (s.subcategories || []).forEach(function (x) { subCount[x.id] = x.count; });
        (c.subcategories || []).forEach(function (sub) {
          sub.count = subCount[sub.id] || 0;
        });
      });
    }

    state.site = d.site || {};
    state.quotes = (d.quotes && d.quotes.quotes) || [];
    state.changelog = d.changelog || null;
    state.ready = true;
    return state;
  }

  function load() {
    if (state.ready) return Promise.resolve(state);
    if (state.loading) return state.loading;

    var isFile = location.protocol === 'file:';

    state.loading = (isFile
      // —— 本地直开：走 JS 兜底数据 ——
      ? injectJS(Ark.path('assets/js/data-fallback.js')).then(function () {
          var d = window.__ARK_DATA__;
          if (!d) throw new Error('兜底数据缺失，请运行 tools/build-data.py');
          state.source = 'fallback';
          return ingest(d);
        })
      // —— HTTP 部署：直接读 JSON ——
      : Promise.all([
          fetchJSON('data/categories.json'),
          fetchJSON('data/resources.json'),
          fetchJSON('data/tags.json'),
          fetchJSON('data/stats.json'),
          fetchJSON('data/site.json').catch(function () { return null; }),
          fetchJSON('data/quotes.json').catch(function () { return null; }),
          fetchJSON('data/changelog.json').catch(function () { return null; })
        ]).then(function (a) {
          state.source = 'json';
          return ingest({
            categories: a[0], resources: a[1], tags: a[2], stats: a[3],
            site: a[4] || {}, quotes: a[5] || {}, changelog: a[6] || {}
          });
        }).catch(function (err) {
          // 部署环境缺文件时同样降级，保证站点永远可用
          console.warn('[Ark] JSON 加载失败，降级到内置数据', err);
          return injectJS(Ark.path('assets/js/data-fallback.js')).then(function () {
            state.source = 'fallback';
            return ingest(window.__ARK_DATA__ || {});
          });
        })
    );
    return state.loading;
  }

  /* ------------------------------------------------------------ 查询 */
  function getResource(id) { return state.byId[id] || null; }
  function getCategory(id) { return state.catMap[id] || null; }
  function getSub(cat, sub) { return state.subMap[cat + '/' + sub] || null; }
  function allResources() { return state.resources; }
  function getSite() { return state.site; }
  function getStats() { return state.stats; }
  function getChangelog() { return state.changelog; }
  function getQuotes() { return state.quotes; }
  function getTags() { return state.tags; }

  /** 某个分类（可含子分类）下各标签的分布，用于构建筛选栏 */
  function tagsOf(catId, subId) {
    var map = {};
    state.resources.forEach(function (r) {
      if (catId && r.cat !== catId) return;
      if (subId && r.sub !== subId) return;
      r.tags.forEach(function (t) { map[t] = (map[t] || 0) + 1; });
    });
    return Object.keys(map).map(function (k) { return { name: k, count: map[k] }; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });
  }

  /**
   * 综合筛选
   * @param {object} o { q, cat, sub, tags:[], tagMode:'and'|'or', hot, free, lang, sort }
   */
  function filter(o) {
    o = o || {};
    var tags = o.tags || [];
    var mode = o.tagMode || 'and';
    var out = state.resources;

    if (o.cat) out = out.filter(function (r) { return r.cat === o.cat; });
    if (o.sub) out = out.filter(function (r) { return r.sub === o.sub; });
    if (o.hot) out = out.filter(function (r) { return r.hot === Number(o.hot); });
    if (o.free) out = out.filter(function (r) { return r.free === o.free; });
    if (o.lang) out = out.filter(function (r) { return r.lang === o.lang; });
    if (o.ids) { var s = {}; o.ids.forEach(function (i) { s[i] = 1; }); out = out.filter(function (r) { return s[r.id]; }); }

    if (tags.length) {
      out = out.filter(function (r) {
        if (mode === 'or') return tags.some(function (t) { return r.tags.indexOf(t) > -1; });
        return tags.every(function (t) { return r.tags.indexOf(t) > -1; });
      });
    }
    if (o.q) out = Ark.search.pick(out, o.q);
    return sort(out, o.sort);
  }

  function sort(list, mode) {
    var a = list.slice();
    switch (mode) {
      case 'hot':
        // 热度标记优先，同档按收录时间新的靠前
        a.sort(function (x, y) {
          return (y.hot - x.hot) || String(y.added).localeCompare(String(x.added));
        }); break;
      case 'new':
        a.sort(function (x, y) { return String(y.added).localeCompare(String(x.added)); }); break;
      case 'name':
        a.sort(function (x, y) { return x.name.localeCompare(y.name, 'zh-Hans-CN'); }); break;
      default:
        // 综合：热度权重 + 标签丰富度 + 是否完全免费，全部取自数据里真实存在的字段
        a.sort(function (x, y) {
          return score(y) - score(x) || x.name.localeCompare(y.name, 'zh-Hans-CN');
        });
    }
    return a;
  }
  function score(r) {
    return r.hot * 1000 + r.tags.length * 10 + (r.free === 'free' ? 5 : 0);
  }

  /** 分页切片 */
  function paginate(list, page, size) {
    if (size === 'all' || !size) return { items: list, pages: 1, page: 1, total: list.length };
    var pages = Math.max(1, Math.ceil(list.length / size));
    page = Math.min(Math.max(1, page || 1), pages);
    var start = (page - 1) * size;
    return { items: list.slice(start, start + size), pages: pages, page: page, total: list.length };
  }

  /** 随机取一条（可排除当前，避免连续两次相同） */
  function randomResource(excludeId) {
    var list = state.resources;
    if (!list.length) return null;
    for (var i = 0; i < 12; i++) {
      var r = list[Math.floor(Math.random() * list.length)];
      if (r.id !== excludeId) return r;
    }
    return list[0];
  }

  /** 相关推荐：同子分类优先，其次同分类，最后标签重合度 */
  function related(res, n) {
    n = n || Ark.config.relatedCount;
    if (!res) return [];
    var pool = state.resources.filter(function (r) {
      return r.id !== res.id && (r.cat === res.cat || r.tags.some(function (t) { return res.tags.indexOf(t) > -1; }));
    });
    pool.sort(function (a, b) {
      return sim(b, res) - sim(a, res);
    });
    return pool.slice(0, n);
  }
  function sim(a, b) {
    var s = 0;
    if (a.sub === b.sub) s += 4;
    if (a.cat === b.cat) s += 2;
    a.tags.forEach(function (t) { if (b.tags.indexOf(t) > -1) s += 1; });
    return s;
  }

  /** 首页热门榜：按热度标记排序挑出前 n 条 */
  function trending(n) {
    return sort(state.resources, 'hot').slice(0, n || 8);
  }
  /** 最新收录 */
  function latest(n) {
    return sort(state.resources, 'new').slice(0, n || 8);
  }
  /** 小众宝藏：宝藏标记里最近收录的 n 条 */
  function gems(n) {
    return state.resources.filter(function (r) { return r.hot === 2; })
      .sort(function (a, b) { return String(b.added).localeCompare(String(a.added)); }).slice(0, n || 8);
  }

  return {
    load: load, state: function () { return state; },
    getResource: getResource, getCategory: getCategory, getSub: getSub,
    allResources: allResources, getSite: getSite, getStats: getStats,
    getChangelog: getChangelog, getQuotes: getQuotes, getTags: getTags,
    tagsOf: tagsOf, filter: filter, sort: sort, paginate: paginate,
    randomResource: randomResource, related: related,
    trending: trending, latest: latest, gems: gems
  };
})();
