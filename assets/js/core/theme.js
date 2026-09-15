/* ==========================================================================
   core/theme.js —— 多主题系统 + 主题面板
   --------------------------------------------------------------------------
   主题 = 一组 CSS 变量。切换只需要改 <html data-theme>，无需重绘任何组件。
   额外支持：自定义主色（内联覆盖 --accent 系列）、圆角风格、动效开关。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.theme = (function () {
  var C = Ark.config, S = Ark.store, U = Ark.utils;
  var root = document.documentElement;

  /** 从主题色推导出整个 accent 变量组 */
  function applyAccent(hex) {
    if (!hex) {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-2');
      root.style.removeProperty('--accent-soft');
      root.style.removeProperty('--grad');
      root.style.removeProperty('--grad-soft');
      root.style.removeProperty('--sh-glow');
      return;
    }
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    var mix = function (ch, t) { return Math.round(ch + (t - ch) * 0.42); };
    var a2 = '#' + [mix(r, 255), mix(g, 140), mix(b, 255)]
      .map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-2', a2);
    root.style.setProperty('--accent-soft', 'rgba(' + r + ',' + g + ',' + b + ',.13)');
    root.style.setProperty('--grad', 'linear-gradient(135deg, ' + hex + ' 0%, ' + a2 + ' 100%)');
    root.style.setProperty('--grad-soft', 'linear-gradient(135deg, rgba(' + r + ',' + g + ',' + b + ',.16), rgba(' + r + ',' + g + ',' + b + ',.05))');
    root.style.setProperty('--sh-glow', '0 12px 34px -12px ' + hex);
  }

  /** 应用主题（含自定义主色 / 圆角 / 动效） */
  function apply(id, opts) {
    opts = opts || {};
    var t = C.themes.filter(function (x) { return x.id === id; })[0] || C.themes[0];
    root.setAttribute('data-theme', t.id);
    root.setAttribute('data-radius', S.getRadius());
    root.setAttribute('data-motion', S.getMotion() ? 'on' : 'off');
    var accent = S.getAccent();
    applyAccent(accent);
    // 地址栏 / 移动端浏览器主题色跟随
    var meta = U.$('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.scheme === 'dark' ? '#0b1020' : '#f5f6fb');
    if (!opts.silent) {
      document.body.classList.remove('theme-fade');
      void document.body.offsetWidth;      // 强制重排以重启动画
      document.body.classList.add('theme-fade');
    }
    syncPanel();
    // 通知订阅者（如导航栏的明暗按钮图标）主题已变化
    try { document.dispatchEvent(new CustomEvent('ark:theme', { detail: { theme: t.id, scheme: t.scheme } })); } catch (e) { /* 忽略 */ }
    return t;
  }

  function current() { return root.getAttribute('data-theme') || 'light'; }

  /** 当前主题的明暗基调：'light' | 'dark' */
  function scheme() {
    var t = C.themes.filter(function (x) { return x.id === current(); })[0] || C.themes[0];
    return t.scheme || 'light';
  }

  /** 在当前主题的明暗基底上做「亮/暗一键翻转」 */
  function toggleDark() {
    var t = C.themes.filter(function (x) { return x.id === current(); })[0] || C.themes[0];
    var next = t.scheme === 'dark' ? 'light' : 'dark';
    return set(next);
  }
  function set(id) { S.setTheme(id); return apply(id); }

  /* ------------------------------------------------------- 主题面板 UI */
  function panelHTML() {
    var cur = current();
    var swatches = C.themes.map(function (t) {
      return '<button class="theme-swatch' + (t.id === cur ? ' on' : '') + '" data-theme-id="' + t.id +
        '" title="' + U.esc(t.name) + '" style="background:' + t.grad + '"><span>' + U.esc(t.name) + '</span></button>';
    }).join('');
    var custom = S.getAccent() || '';
    return '' +
      '<h4>配色主题</h4>' +
      '<div class="theme-grid">' + swatches + '</div>' +
      '<div class="theme-row"><span>自定义主色</span>' +
        '<span class="accent-pick">' +
          '<input type="color" id="ark-accent" value="' + (custom || pickAccent()) + '">' +
          '<button class="btn btn-xs btn-soft" id="ark-accent-reset">重置</button>' +
        '</span></div>' +
      '<div class="theme-row"><span>圆角风格</span>' +
        '<span class="seg" id="ark-radius">' +
          '<button data-v="sharp">硬朗</button><button data-v="soft">柔和</button><button data-v="round">圆润</button>' +
        '</span></div>' +
      '<div class="theme-row"><span>界面动效</span>' +
        '<button class="switch" id="ark-motion" role="switch" aria-checked="' + (S.getMotion() ? 'true' : 'false') + '"></button>' +
      '</div>' +
      '<div class="theme-row"><span>标签匹配</span>' +
        '<span class="seg" id="ark-tagmode">' +
          '<button data-v="and">全部满足</button><button data-v="or">任一满足</button>' +
        '</span></div>';
  }
  function pickAccent() {
    var t = C.themes.filter(function (x) { return x.id === current(); })[0];
    var g = (t || C.themes[0]).grad;
    var m = /#[0-9a-fA-F]{6}/.exec(g);
    return m ? m[0] : '#6366f1';
  }

  /** 面板宿主：内部状态变化后刷新勾选态 */
  function syncPanel() {
    var pop = U.$('#ark-theme-pop');
    if (!pop) return;
    var cur = current();
    U.$$('.theme-swatch', pop).forEach(function (b) {
      b.classList.toggle('on', b.dataset.themeId === cur);
    });
    var seg = U.$('#ark-radius', pop);
    if (seg) {
      var v = S.getRadius();
      U.$$('button', seg).forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); });
    }
    var tm = U.$('#ark-tagmode', pop);
    if (tm) {
      var tv = S.get('ark.tagmode', 'and');
      U.$$('button', tm).forEach(function (b) { b.classList.toggle('on', b.dataset.v === tv); });
    }
  }

  /** 绑定面板内所有交互（只绑一次） */
  function bindPanel(pop, onChange) {
    pop.innerHTML = panelHTML();
    syncPanel();

    U.on(pop, 'click', '.theme-swatch', function (e, b) {
      set(b.dataset.themeId);
      fire(onChange);
    });
    U.$('#ark-accent', pop).addEventListener('input', function () {
      S.setAccent(this.value);
      applyAccent(this.value);
      S.setTheme(current());     // 把基底主题记住，主色单独记
      fire(onChange);
    });
    U.$('#ark-accent-reset', pop).addEventListener('click', function () {
      S.setAccent(null);
      applyAccent(null);
      fire(onChange);
    });
    U.on(pop, 'click', '#ark-radius button', function (e, b) {
      S.setRadius(b.dataset.v);
      root.setAttribute('data-radius', b.dataset.v);
      syncPanel(); fire(onChange);
    });
    U.on(pop, 'click', '#ark-tagmode button', function (e, b) {
      S.set('ark.tagmode', b.dataset.v);
      syncPanel(); fire(onChange);
    });
    var sw = U.$('#ark-motion', pop);
    sw.addEventListener('click', function () {
      var v = !S.getMotion();
      S.setMotion(v);
      sw.setAttribute('aria-checked', v ? 'true' : 'false');
      root.setAttribute('data-motion', v ? 'on' : 'off');
      fire(onChange);
    });
  }
  function fire(cb) { if (typeof cb === 'function') cb(current()); }

  /** 首屏尽早应用主题，避免闪白（在 <head> 里同步调用） */
  function init() { apply(S.getTheme(), { silent: true }); }

  return {
    init: init, apply: apply, set: set, current: current, scheme: scheme, toggleDark: toggleDark,
    bindPanel: bindPanel, syncPanel: syncPanel, applyAccent: applyAccent
  };
})();
