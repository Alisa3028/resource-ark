/* ==========================================================================
   core/lazyload.js —— 图片懒加载、滚动淡入、视差
   --------------------------------------------------------------------------
   全部基于 IntersectionObserver，不产生额外滚动监听开销。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.lazy = (function () {
  var U = Ark.utils;
  var imgObs = null, revObs = null;

  function ensureObservers() {
    if (!imgObs && 'IntersectionObserver' in window) {
      imgObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var img = en.target;
          imgObs.unobserve(img);
          var src = img.getAttribute('data-src');
          if (!src) return;
          img.addEventListener('load', function () { img.classList.add('ok'); });
          img.addEventListener('error', function () { img.remove(); });  // 拿不到图标就保留字母方块
          img.src = src;
        });
      }, { rootMargin: '220px' });
    }
    if (!revObs && 'IntersectionObserver' in window) {
      revObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          revObs.unobserve(en.target);
        });
      }, { rootMargin: '-40px 0px -8% 0px', threshold: 0.04 });
    }
  }

  /** 扫描 root 下新增的懒加载图片与淡入元素 */
  function scan(root) {
    ensureObservers();
    root = root || document;
    U.$$('img[data-src]:not([data-lazy-bound])', root).forEach(function (img) {
      img.setAttribute('data-lazy-bound', '1');
      if (imgObs) imgObs.observe(img);
      else { img.src = img.getAttribute('data-src'); }
    });
    U.$$('.reveal:not(.in):not([data-rev-bound]), .reveal-pop:not(.in):not([data-rev-bound]), .reveal-x:not(.in):not([data-rev-bound])', root)
      .forEach(function (n) {
        n.setAttribute('data-rev-bound', '1');
        if (revObs) revObs.observe(n); else n.classList.add('in');
      });
  }

  /* --------------------------------------------------------------- 视差 */
  var pxItems = [];
  function collectParallax() {
    pxItems = U.$$('.parallax');
  }
  function onScroll() {
    var sy = window.pageYOffset;
    for (var i = 0; i < pxItems.length; i++) {
      var n = pxItems[i];
      var speed = parseFloat(n.getAttribute('data-speed') || '0.16');
      var rect = n.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) continue;
      // 相对视口中心计算偏移，产生沉降/上浮效果
      var offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
      n.style.setProperty('--py', offset.toFixed(2) + 'px');
    }
    // 鼠标跟随光斑（仅桌面端）
    if (motionOK()) {
      var orbs = U.$$('.orb');
      orbs.forEach(function (o, idx) {
        if (o.dataset.mouse !== '1') {
          o.dataset.mouse = '1';
          o.dataset.mi = idx;
        }
      });
    }
  }
  function motionOK() {
    return Ark.store.getMotion() && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  var mouseBound = false;
  function bindMouseParallax() {
    if (mouseBound || !window.matchMedia('(pointer:fine)').matches) return;
    mouseBound = true;
    var orbs = U.$$('.orb'), hero = U.$('.hero');
    if (!orbs.length || !hero) return;
    var raf = null, mx = 0, my = 0;
    hero.addEventListener('mousemove', function (e) {
      if (!motionOK()) return;
      var r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        orbs.forEach(function (o, i) {
          var k = (i + 1) * 14;
          o.style.transform = 'translate3d(' + (-mx * k) + 'px,' + (-my * k) + 'px,0)';
        });
      });
    });
    hero.addEventListener('mouseleave', function () {
      orbs.forEach(function (o) { o.style.transform = ''; });
    });
  }

  function init() {
    scan(document);
    collectParallax();
    bindMouseParallax();
    var onS = U.throttle(function () { onScroll(); scan(document); }, 80);
    window.addEventListener('scroll', onS, { passive: true });
    window.addEventListener('resize', U.debounce(collectParallax, 200));
  }

  return { init: init, scan: scan, collectParallax: collectParallax };
})();
