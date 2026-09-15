/* ==========================================================================
   pages/history.js —— 浏览历史（localStorage，刷新与重启都不丢）
   ========================================================================== */
Ark.pages = Ark.pages || {};

Ark.pages.history = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var crumb = document.getElementById('ark-crumb');

  Ark.breadcrumb.render(crumb, [{ text: '浏览历史', icon: 'clock' }]);

  function paint() {
    var list = Ark.store.history();
    var items = list.map(function (h) { return Ark.data.getResource(h.id); }).filter(Boolean);
    // 已从资源库移除的条目按访问时间顺序保留展示（仅名称）
    var missing = list.filter(function (h) { return !Ark.data.getResource(h.id); });

    content.innerHTML = '';
    Ark.breadcrumb.render(crumb, [{ text: '浏览历史', icon: 'clock' }]);

    content.appendChild(U.el('section.wrap', { style: { paddingTop: '18px' } }, [
      U.el('div.detail-head.reveal', {}, [
        U.el('div.detail-head-row', {}, [
          U.el('div.detail-ico', { style: { '--c': 'var(--accent)', '--c-soft': 'var(--accent-soft)' } },
            [I.el('clock', { size: 30 })]),
          U.el('div', { style: { flex: '1 1 300px', minWidth: '0' } }, [
            U.el('h1', { text: '浏览历史' }),
            U.el('p.muted', { style: { marginTop: '8px', maxWidth: '660px' },
              text: '保存在浏览器本地，刷新与重启都不会丢。' }),
            U.el('div.detail-head-meta', {}, [
              U.el('span.badge.badge-soft', {}, [
                I.el('clock', { size: 12 }), U.el('span', { text: list.length + ' 条记录' })
              ]),
              missing.length ? U.el('span.badge.badge-soft', {}, [
                I.el('warn', { size: 12 }), U.el('span', { text: missing.length + ' 条已下架' })
              ]) : null,
              U.el('button.btn.btn-xs.btn-soft', { type: 'button', onclick: function () {
                if (!list.length) { Ark.toast.show('还没有浏览记录', 'inbox'); return; }
                if (confirm('确定清空全部浏览历史吗？此操作不可撤销。')) {
                  Ark.store.clearHistory();
                  Ark.toast.show('浏览历史已清空', 'trash');
                  paint();
                }
              } }, [I.el('trash', { size: 12 }), U.el('span', { text: '清空历史' })]),
              U.el('a.btn.btn-xs.btn-soft', { href: Ark.router.href('favorites') }, [
                I.el('star', { size: 12 }), U.el('span', { text: '我的收藏' })
              ])
            ])
          ])
        ])
      ])
    ]));

    var sec = U.el('section.sec.wrap');
    if (!items.length) {
      sec.appendChild(Ark.ui.empty('clock', '还没有浏览记录', '去首页逛逛，点开任意一条资源就会记在这里', [
        U.el('a.btn.btn-primary', { href: Ark.router.href('home'), text: '回到首页' }),
        U.el('a.btn.btn-soft', { href: Ark.router.href('search'), text: '浏览全部资源' })
      ]));
      content.appendChild(sec);
      Ark.lazy.scan(content);
      return;
    }

    sec.appendChild(Ark.ui.sectionHead('最近浏览', '按访问时间从新到旧排列',
      { href: Ark.router.href('search'), text: '发现更多资源' }, 'clock'));
    var box = U.el('div');
    sec.appendChild(box);
    Ark.ui.miniGrid(box, items, {});

    /* 手动移除按钮 */
    var manage = U.el('div.panel.panel-pad', { style: { marginTop: '26px' } }, [
      U.el('h3', {}, [I.el('trash', { size: 15 }), U.el('span', { text: '按条移除' })]),
      U.el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '12px' } },
        list.map(function (h) {
          var btn = U.el('span.tag', { style: { cursor: 'pointer' }, title: '从历史中移除' }, [
            U.el('span', { text: h.name || h.id }),
            I.el('close', { size: 11, cls: 'pill-x' })
          ]);
          btn.addEventListener('click', function () {
            Ark.store.removeHistory(h.id);
            Ark.toast.show('已从历史中移除', 'close');
            paint();
          });
          return btn;
        }).concat(missing.map(function (h) {
          return U.el('span.tag.dim', { style: { cursor: 'pointer' } }, [
            U.el('span', { text: h.name || h.id }),
            U.el('span.dim', { text: '（已下架）' })
          ]);
        }))
      )
    ]);
    sec.appendChild(manage);
    content.appendChild(sec);
    Ark.lazy.scan(content);
  }

  paint();
};
