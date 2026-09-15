/* ==========================================================================
   components/footer.js —— 页脚（分类导航 / 站点信息 / 每日一句 / 署名）
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.footer = (function () {
  var U = Ark.utils;
  var I = Ark.icons;

  function render(host) {
    var site = Ark.data.getSite();
    var stats = Ark.data.getStats();
    var cats = Ark.data.state().cats;

    host.classList.add('foot');
    host.innerHTML = '';

    // 分类图标统一走 SVG（不再拼 emoji），与导航栏、筛选栏保持同一套视觉语言。
    // 标题是「热门分类」，所以按收录条数取前 6 个，而不是简单截取数组前几项。
    var catLinks = cats.slice().sort(function (a, b) { return (b.count || 0) - (a.count || 0); }).slice(0, 6).map(function (c) {
      return U.el('li', {}, U.el('a', { href: Ark.router.href('category', { cat: c.id }) }, [
        I.el(I.catIcon(c), { size: 13, cls: 'foot-i' }),
        U.el('span', { text: c.name })
      ]));
    });
    var pageLinks = [
      ['全部资源', Ark.router.href('search')],
      ['标签云', Ark.router.href('tags')],
      ['更新日志', Ark.router.href('changelog')],
      ['浏览历史', Ark.router.href('history')],
      ['我的收藏', Ark.router.href('favorites')],
      ['反馈建议', Ark.router.href('feedback')],
      ['关于本站', Ark.router.href('about')]
    ].map(function (p) { return U.el('li', {}, U.el('a', { href: p[1], text: p[0] })); });

    var quoteHost = U.el('div.quote', { style: { marginTop: '18px' } });

    host.appendChild(U.el('div.wrap', {}, [
      U.el('div.foot-grid', {}, [
        /* 品牌列 */
        U.el('div', {}, [
          U.el('a.logo', { href: Ark.router.href('home') }, [
            U.el('span.logo-mark', {}, [I.el('arkMark', { size: 22 })]),
            U.el('span', {}, [
              U.el('span.logo-text', { text: site.name || '资源方舟' }),
              U.el('span.logo-sub', { text: (site.enName || 'RESOURCE ARK').toUpperCase() })
            ])
          ]),
          U.el('p.sm.muted', { style: { marginTop: '14px', maxWidth: '340px' }, text: site.slogan || '一站式优质网站资源导航库' }),
          U.el('div.sm.muted', {
            style: { display: 'flex', gap: '14px', flexWrap: 'wrap' },
            text: '已收录 ' + (stats ? stats.total : 0) + ' 个站点 · ' + (stats ? stats.tagTotal : 0) + ' 个标签'
          }),
          quoteHost
        ]),
        /* 分类列 */
        U.el('div', {}, [
          U.el('div.foot-title', { text: '热门分类' }),
          U.el('ul.foot-list', {}, catLinks)
        ]),
        /* 页面列 */
        U.el('div', {}, [
          U.el('div.foot-title', { text: '站点导航' }),
          U.el('ul.foot-list', {}, pageLinks)
        ]),
        /* 关于列 */
        U.el('div', {}, [
          U.el('div.foot-title', { text: '关于' }),
          U.el('ul.foot-list', {}, [
            U.el('li', {}, U.el('a', { href: Ark.router.href('about'), text: '项目说明与功能清单' })),
            U.el('li', {}, U.el('a', { href: Ark.router.href('about', { to: 'extend' }), text: '如何新增资源 / 二次开发' })),
            U.el('li', {}, U.el('a', { href: Ark.router.href('tags'), text: '全部标签' })),
            U.el('li', {}, U.el('a', { href: '#', onclick: function (e) { e.preventDefault(); Ark.shortcuts.open(); }, text: '键盘快捷键' })),
            site.repo ? U.el('li', {}, U.el('a', { href: site.repo, target: '_blank', rel: 'noopener noreferrer', text: 'GitHub 仓库 ↗' })) : null,
            site.email ? U.el('li', {}, U.el('a', { href: 'mailto:' + site.email, text: '邮件联系' })) : null
          ])
        ])
      ]),

      U.el('div.foot-bottom', {}, [
        U.el('div', {}, [
          U.el('span.made-by', { html: '本站由 <b>' + U.esc(site.author || '我很能忍11') + '</b> 制作' }),
          U.el('span.dim', { text: ' · ' }),
          U.el('span', { text: '纯静态站点，数据与页面完全分离' })
        ]),
        U.el('div.sm.dim', {}, [
          U.el('span', { text: '© ' + new Date().getFullYear() + ' ' + (site.name || '') }),
          site.icp ? U.el('span', { text: ' · ' + site.icp }) : null
        ])
      ])
    ]));

    Ark.quote.render(quoteHost);
  }

  return { render: render };
})();
