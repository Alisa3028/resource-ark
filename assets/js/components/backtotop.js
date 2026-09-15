/* ==========================================================================
   components/backtotop.js —— 返回顶部（带滚动进度环）
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.backtotop = (function () {
  var U = Ark.utils;
  var btn = null, circle = null, R = 21;

  function build() {
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '24'); circle.setAttribute('cy', '24'); circle.setAttribute('r', String(R));
    var len = 2 * Math.PI * R;
    circle.setAttribute('stroke-dasharray', String(len));
    circle.setAttribute('stroke-dashoffset', String(len));
    svg.appendChild(circle);

    btn = U.el('button.totop', { type: 'button', title: '返回顶部', 'aria-label': '返回顶部' }, [
      svg,
      Ark.icons.el('top', { size: 18, cls: 'totop-ico' })
    ]);
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: Ark.store.getMotion() ? 'smooth' : 'auto' });
    });
    document.body.appendChild(btn);
    return len;
  }

  function init() {
    var len = build();
    var onScroll = U.throttle(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.pageYOffset / max) : 0;
      btn.classList.toggle('show', window.pageYOffset > 420);
      circle.setAttribute('stroke-dashoffset', String(len * (1 - p)));
    }, 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  return { init: init };
})();
