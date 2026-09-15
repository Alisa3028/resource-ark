/* ==========================================================================
   components/background.js —— 全局背景插画控制器
   --------------------------------------------------------------------------
   职责：
     1. 注入背景图层，并在「首屏稳定之后」惰性加载插画（不与内容抢带宽）
     2. 轻微视差：滚动时纵向位移 + 桌面端鼠标漂移，全部走 rAF，不制造滚动抖动
     3. 明暗自适应：把当前主题的明暗基调写到 <html data-bg-scheme>，
        由 CSS 决定是直接叠加还是 invert 反转成浅色线条
     4. 尊重「界面动效」开关与系统 prefers-reduced-motion
   图片缺失 / 加载失败时安静降级为「没有背景插画」，不影响任何功能。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.background = (function () {
  var U = Ark.utils;

  var layer = null;
  var img = null;
  var rafId = null;
  var mouseBound = false;
  var scrollBound = false;
  var mx = 0;                   // 鼠标漂移（px）
  var my = 0;

  var SCROLL_FACTOR = 0.055;    // 滚动视差系数：越小越克制
  var MOUSE_RANGE = 9;          // 鼠标漂移最大像素

  /* ------------------------------------------------------------------ 工具 */
  function motionOK() {
    if (!Ark.store.getMotion()) return false;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  }
  function finePointer() {
    return window.matchMedia ? window.matchMedia('(pointer:fine)').matches : false;
  }

  /** 背景图路径（部署到任意层级都能取到） */
  function src() { return Ark.path('assets/img/bg-girl.webp'); }

  /* ------------------------------------------------------------ 图层与加载 */
  function mount() {
    if (layer) return layer;
    layer = document.getElementById('ark-bg');
    if (!layer) {
      layer = U.el('div.bg-figure#ark-bg', { 'aria-hidden': 'true' });
      document.body.insertBefore(layer, document.body.firstChild);
    }
    return layer;
  }

  function loadImage() {
    var host = mount();
    if (img) return;

    /**
     * 注意两个坑（都踩过）：
     *   1) 这里不要再加 loading="lazy"：插画用 right/bottom 定位且 width:auto，
     *      在图片加载完成前浏览器算不出宽度（rect.w = 0），懒加载的相交判定会认定
     *      「不在视口内」→ 永远不发起请求，形成死锁。加载时机本来就由下面的
     *      requestIdleCallback 控制，不需要浏览器再懒一次。
     *   2) 显式给出 width/height 属性（与源图 720×1080 一致），
     *      让浏览器在图片到达前就能按比例占位，避免布局跳动。
     */
    img = U.el('img', {
      alt: '', 'aria-hidden': 'true',
      width: '720', height: '1080',
      decoding: 'async', referrerpolicy: 'no-referrer'
    });
    img.addEventListener('load', function () { img.classList.add('is-ready'); });
    // 拿不到图（离线 / 旧浏览器不支持 WebP）就安静降级，绝不影响页面
    img.addEventListener('error', function () { host.style.display = 'none'; });
    img.src = src();
    host.appendChild(img);
  }

  /* ---------------------------------------------------------------- 视差 */
  function apply() {
    rafId = null;
    if (!img) return;
    var y = window.pageYOffset || 0;
    img.style.setProperty('--bg-py', (-y * SCROLL_FACTOR).toFixed(2) + 'px');
    img.style.setProperty('--bg-px', mx.toFixed(2) + 'px');
  }
  function schedule() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(apply);
  }

  function bindScroll() {
    if (scrollBound) return;
    scrollBound = true;
    // 用 passive 监听 + rAF 合并，滚动时几乎不产生额外开销
    window.addEventListener('scroll', function () {
      if (!motionOK()) return;
      schedule();
    }, { passive: true });
    window.addEventListener('resize', U.debounce(schedule, 160));
    schedule();
  }

  function bindMouse() {
    if (mouseBound || !finePointer()) return;
    mouseBound = true;
    window.addEventListener('mousemove', function (e) {
      if (!motionOK()) return;
      var nx = (e.clientX / window.innerWidth) - 0.5;
      var ny = (e.clientY / window.innerHeight) - 0.5;
      mx = -nx * MOUSE_RANGE;
      my = -ny * MOUSE_RANGE * 0.6;
      if (img) img.style.setProperty('--bg-px', mx.toFixed(2) + 'px');
    }, { passive: true });
    void my;    // 纵向漂移交给滚动视差，避免两个来源互相打架
  }

  /* ------------------------------------------------------------ 明暗自适应 */
  function syncScheme() {
    if (!Ark.theme || !Ark.theme.scheme) return;
    document.documentElement.setAttribute('data-bg-scheme', Ark.theme.scheme());
  }

  /* ------------------------------------------------------------------ 启动 */
  function init() {
    syncScheme();
    document.addEventListener('ark:theme', syncScheme);

    // 惰性加载：优先用浏览器的空闲回调，没有就退化为短延时
    function kick() { loadImage(); bindScroll(); bindMouse(); }
    if (window.requestIdleCallback) {
      requestIdleCallback(kick, { timeout: 1200 });
    } else {
      setTimeout(kick, 320);
    }
  }

  return { init: init, load: loadImage, syncScheme: syncScheme };
})();
