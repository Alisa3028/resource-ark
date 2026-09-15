/* ==========================================================================
   core/utils.js —— 通用工具函数（DOM / 字符串 / 数字 / 模糊匹配 / 剪贴板）
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.utils = (function () {

  /* ------------------------------------------------------------ DOM */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /**
   * 创建元素
   * @param {string} tag 标签名简写，支持 'div.cls.cls2#id'、'.cls'、'div#id'
   * @param {object} attrs 属性，on* 视为事件监听，style 支持对象，dataset 支持对象
   * @param {Array|string|Node} children 子节点（支持嵌套数组）
   */
  function el(tag, attrs, children) {
    var m = /^([a-zA-Z0-9-]*)((?:\.[\w-]+)*)(?:#([\w-]+))?$/.exec(tag) || [];
    var node = document.createElement(m[1] || 'div');
    if (m[2]) node.className = m[2].slice(1).replace(/\./g, ' ');
    if (m[3]) node.id = m[3];
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'style' && typeof v === 'object') { Object.assign(node.style, v); }
        else if (k === 'html') { node.innerHTML = v; }
        else if (k === 'text') { node.textContent = v; }
        else if (k === 'dataset') { Object.assign(node.dataset, v); }
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') { node.addEventListener(k.slice(2), v); }
        else { node.setAttribute(k, v === true ? '' : v); }
      });
    }
    append(node, children);
    return node;
  }

  function append(parent, children) {
    if (children == null || children === false) return parent;
    if (Array.isArray(children)) {
      // 递归处理嵌套数组，允许用 map/concat 直接拼装子节点
      children.forEach(function (c) { append(parent, c); });
      return parent;
    }
    if (children instanceof Node) { parent.appendChild(children); return parent; }
    if (typeof children === 'string' || typeof children === 'number') {
      parent.appendChild(document.createTextNode(String(children)));
    }
    return parent;
  }

  /** HTML 转义，所有外部数据进模板前都要过一遍 */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function on(target, evt, sel, fn) {
    // 事件委托：on(box,'click','.card',handler)
    if (typeof sel === 'function') { target.addEventListener(evt, sel); return; }
    target.addEventListener(evt, function (e) {
      var t = e.target.closest(sel);
      if (t && target.contains(t)) fn.call(t, e, t);
    });
  }

  /* ------------------------------------------------------------ 函数 */
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 200);
    };
  }
  function throttle(fn, wait) {
    var last = 0, timer;
    return function () {
      var now = Date.now(), args = arguments, ctx = this;
      if (now - last >= wait) { last = now; fn.apply(ctx, args); }
      else if (!timer) {
        timer = setTimeout(function () { last = Date.now(); timer = null; fn.apply(ctx, args); }, wait - (now - last));
      }
    };
  }

  /* ------------------------------------------------------------ 数字 / 文本 */
  function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  /** 相对时间：2026-09-01 -> 13天前 / 3个月前 */
  function fromNow(dateStr) {
    if (!dateStr) return '';
    var t = Date.parse(dateStr.replace(/-/g, '/'));
    if (isNaN(t)) return dateStr;
    var diff = Date.now() - t, day = 86400000;
    if (diff < day) return '今天';
    if (diff < day * 2) return '昨天';
    if (diff < day * 30) return Math.floor(diff / day) + ' 天前';
    if (diff < day * 365) return Math.floor(diff / day / 30) + ' 个月前';
    return Math.floor(diff / day / 365) + ' 年前';
  }

  /** 稳定哈希：同一字符串永远得到同一个数（用于派生配色、随机排序种子） */
  function hash(str) {
    var h = 2166136261;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* ------------------------------------------------------------ URL */
  function originOf(url) {
    try { return new URL(url).origin; } catch (e) { return ''; }
  }
  function hostOf(url) {
    try { return new URL(url).host.replace(/^www\./, ''); } catch (e) { return ''; }
  }
  /**
   * 解析查询参数。
   * SPA 采用哈希路由，参数在 `#/route?k=v` 里而不是 `?k=v`，
   * 因此不传参时优先读取哈希中的查询串，没有才回退到 location.search。
   */
  function parseQuery(search) {
    var s = search;
    if (s == null) {
      var h = location.hash || '';
      var qi = h.indexOf('?');
      s = qi > -1 ? h.slice(qi) : location.search;
    }
    var out = {};
    new URLSearchParams(s).forEach(function (v, k) { out[k] = v; });
    return out;
  }
  function buildURL(base, params) {
    var qs = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v != null && v !== '' && v !== 'all') qs.set(k, v);
    });
    var s = qs.toString();
    return base + (s ? (base.indexOf('?') > -1 ? '&' : '?') + s : '');
  }

  /** 生成 favicon 地址（直接取站点自身 favicon，失败时由卡片退回字母方块） */
  function faviconURL(url) {
    var o = originOf(url);
    return o ? o + '/favicon.ico' : '';
  }

  /* ------------------------------------------------------------ 模糊匹配 */
  /**
   * 子序列模糊匹配：query 的字符需按顺序出现在 text 中，返回命中位置数组或 null。
   * 连续命中的权重更高（用于排序），同时支持中文按字符匹配。
   */
  function fuzzyIndex(text, query) {
    if (!query) return [];
    var t = text.toLowerCase(), q = query.toLowerCase();
    var idx = [], pos = 0, streak = 0, score = 0;
    for (var i = 0; i < q.length; i++) {
      var c = q[i];
      if (c === ' ') continue;
      var found = t.indexOf(c, pos);
      if (found === -1) return null;
      if (found === pos) { streak++; score += 6 + streak * 2; } else { streak = 0; score += 2; }
      // 词首命中额外加分
      if (found === 0 || /[\s\-_/·（(\[]/.test(t[found - 1] || '')) score += 5;
      idx.push(found);
      pos = found + 1;
    }
    return { idx: idx, score: score - pos * 0.4 };
  }

  /** 在纯文本中高亮命中字符，返回 HTML（内部已转义） */
  function highlight(text, indices) {
    if (!indices || !indices.length) return esc(text);
    var set = {}, out = '';
    indices.forEach(function (i) { set[i] = 1; });
    var buf = '', open = false;
    for (var i = 0; i < text.length; i++) {
      var hit = set[i];
      if (hit && !open) { out += esc(buf) + '<mark class="hit">'; buf = ''; open = true; }
      if (!hit && open) { out += esc(buf) + '</mark>'; buf = ''; open = false; }
      buf += text[i];
    }
    out += esc(buf) + (open ? '</mark>' : '');
    return out;
  }

  /** 简易 i18n 式文本截断 */
  function truncate(s, n) { return s && s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ------------------------------------------------------------ 剪贴板 */
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // file:// 或 http 环境下的兼容方案
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) { reject(e); }
    });
  }

  /** 打乱数组（Fisher-Yates），可传种子保证结果稳定 */
  function shuffle(arr, seed) {
    var a = arr.slice(), i, j, t;
    var rnd = seed == null ? Math.random : (function (s) {
      return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    })(seed);
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /** 用一个基色生成柔和背景色（卡片图标底色） */
  function softColor(hex, alpha) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha == null ? 0.13 : alpha) + ')';
  }

  return {
    $: $, $$: $$, el: el, esc: esc, on: on, append: append,
    debounce: debounce, throttle: throttle,
    fmtNum: fmtNum, pad2: pad2, today: today, fromNow: fromNow, hash: hash,
    originOf: originOf, hostOf: hostOf, parseQuery: parseQuery, buildURL: buildURL,
    faviconURL: faviconURL, fuzzyIndex: fuzzyIndex, highlight: highlight,
    truncate: truncate, copy: copy, shuffle: shuffle, pick: pick, ready: ready,
    softColor: softColor
  };
})();
