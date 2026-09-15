/* ==========================================================================
   components/quote.js —— 每日一句小彩蛋
   --------------------------------------------------------------------------
   按日期做种子从 data/quotes.json 里挑一条，保证「今天」所有人看到同一句；
   点「换一句」可手动随机，不写入任何存储，刷新后仍回到当日那句。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.quote = (function () {
  var U = Ark.utils;

  function dailyIndex(len) {
    var d = new Date();
    var seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
    return seed % len;
  }

  /**
   * 渲染到容器
   * @param {Element} host
   */
  function render(host) {
    if (!host) return;
    var list = Ark.data.getQuotes();
    if (!list.length) { host.hidden = true; return; }
    host.hidden = false;

    var textEl = U.el('span.q-text');
    var idx = dailyIndex(list.length);

    function paint(i) {
      var q = list[i];
      textEl.innerHTML = '';
      textEl.appendChild(U.el('span', { text: q.text }));
      if (q.from) textEl.appendChild(U.el('span.dim', { text: '　—— ' + q.from }));
    }
    paint(idx);

    var refresh = U.el('button.btn.btn-xs.btn-soft.q-refresh', { type: 'button', title: '换一句' }, [
      Ark.icons.el('refresh', { size: 13 }),
      U.el('span', { text: '换一句' })
    ]);
    refresh.addEventListener('click', function () {
      idx = (idx + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
      paint(idx);
      refresh.classList.add('rolling');
      setTimeout(function () { refresh.classList.remove('rolling'); }, 620);
    });

    host.innerHTML = '';
    host.appendChild(Ark.icons.el('wand', { size: 16, cls: 'q-ico' }));
    host.appendChild(textEl);
    host.appendChild(refresh);
  }

  return { render: render };
})();
