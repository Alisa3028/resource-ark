/* ==========================================================================
   components/skeleton.js —— 骨架屏
   --------------------------------------------------------------------------
   在数据加载 / 筛选切换时先铺占位骨架，避免布局跳动与白屏。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.skeleton = (function () {
  var U = Ark.utils;

  function card() {
    return U.el('div.sk-card', {}, [
      U.el('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start' } }, [
        U.el('div.sk.sk-ico'),
        U.el('div', { style: { flex: '1 1 auto' } }, [
          U.el('div.sk.sk-line', { style: { width: '56%', height: '14px' } }),
          U.el('div.sk.sk-line', { style: { width: '34%', height: '10px' } })
        ])
      ]),
      U.el('div', { style: { marginTop: '14px' } }, [
        U.el('div.sk.sk-line', { style: { width: '100%' } }),
        U.el('div.sk.sk-line', { style: { width: '82%' } })
      ]),
      U.el('div', { style: { display: 'flex', gap: '6px', marginTop: '12px' } }, [
        U.el('div.sk', { style: { width: '52px', height: '18px', borderRadius: '99px' } }),
        U.el('div.sk', { style: { width: '64px', height: '18px', borderRadius: '99px' } }),
        U.el('div.sk', { style: { width: '44px', height: '18px', borderRadius: '99px' } })
      ]),
      U.el('div.sk-foot', {}, [
        U.el('div.sk', { style: { width: '46px', height: '22px', borderRadius: '99px' } }),
        U.el('div.sk', { style: { width: '58px', height: '22px', borderRadius: '99px', marginLeft: 'auto' } })
      ])
    ]);
  }

  function row() {
    return U.el('div.sk-card', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' } }, [
      U.el('div.sk', { style: { width: '36px', height: '36px', borderRadius: '10px' } }),
      U.el('div', { style: { flex: '1 1 auto' } }, [
        U.el('div.sk.sk-line', { style: { width: '30%', height: '13px' } }),
        U.el('div.sk.sk-line', { style: { width: '62%', height: '10px', marginBottom: '0' } })
      ]),
      U.el('div.sk', { style: { width: '70px', height: '26px', borderRadius: '99px' } })
    ]);
  }

  /** 铺 n 个骨架到容器 */
  function fill(container, n, kind) {
    container.innerHTML = '';
    var wrap = U.el('div', { class: kind === 'list' ? 'view-list' : 'grid-cards' });
    for (var i = 0; i < n; i++) wrap.appendChild(kind === 'list' ? row() : card());
    container.appendChild(wrap);
    return wrap;
  }

  return { card: card, row: row, fill: fill };
})();
