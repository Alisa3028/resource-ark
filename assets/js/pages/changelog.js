/* ==========================================================================
   pages/changelog.js —— 更新日志
   --------------------------------------------------------------------------
   读取 data/changelog.json，以时间线形式记录站点的每一次迭代：
   新增 / 调整 / 修复 / 移除，四类变更分色展示。
   ========================================================================== */
Ark.pages = Ark.pages || {};

Ark.pages.changelog = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var crumb = document.getElementById('ark-crumb');
  var doc = Ark.data.getChangelog();

  Ark.breadcrumb.render(crumb, [{ text: '更新日志', icon: 'book' }]);

  content.appendChild(U.el('section.wrap', { style: { paddingTop: '18px' } }, [
    U.el('div.detail-head.reveal', {}, [
      U.el('h1', { text: '更新日志' }),
      U.el('p.muted', { style: { marginTop: '10px', maxWidth: '760px' },
        text: '这里记录资源方舟的每一次迭代：收录了哪些站点、调整了哪些分类、修复了什么问题。资源数据独立存放于 data/ 目录，每一次改动都可以追溯。' })
    ])
  ]));

  if (!doc || !doc.entries || !doc.entries.length) {
    content.appendChild(Ark.ui.empty('book', '暂时没有更新记录'));
    return;
  }

  var GROUP = {
    add: { cls: 'add', icon: 'plus',  name: '新增' },
    fix: { cls: 'fix', icon: 'warn',  name: '修复' },
    del: { cls: 'del', icon: 'close', name: '移除' },
    opt: { cls: 'opt', icon: 'zap',   name: '优化' }
  };

  var sec = U.el('section.sec.wrap');
  sec.appendChild(Ark.ui.sectionHead('版本记录', '共 ' + doc.entries.length + ' 次迭代 · 当前版本 v' + (doc.version || '1.0.0'), null, 'book'));

  var tl = U.el('div.timeline');
  doc.entries.forEach(function (e, i) {
    var groups = (e.groups || []).map(function (g) {
      var meta = GROUP[g.type] || GROUP.opt;
      return U.el('div.tl-group', {}, [
        U.el('div.tl-gt.' + meta.cls, {}, [
          I.el(meta.icon, { size: 14 }),
          U.el('span', { text: g.title || meta.name }),
          U.el('span.dim', { style: { fontWeight: '500' }, text: '（' + (g.items || []).length + '）' })
        ]),
        U.el('ul.tl-list', {}, (g.items || []).map(function (t) {
          return U.el('li', { text: t });
        }))
      ]);
    });

    tl.appendChild(U.el('div.tl-item.reveal', { 'data-d': String(Math.min(i + 1, 6)) }, [
      U.el('div.tl-dot', {}, I.el('check', { size: 11 })),
      U.el('div.tl-head', {}, [
        U.el('span.tl-ver.grad-text', { text: 'v' + e.version }),
        U.el('span.tl-date', {}, [I.el('calendar', { size: 12 }), U.el('span', { text: e.date + '（' + U.fromNow(e.date) + '）' })]),
        i === 0 ? U.el('span.badge.badge-new', { text: '最新' }) : null
      ]),
      U.el('div.tl-card', {}, [
        U.el('div', { style: { fontWeight: '700', marginBottom: '10px' }, text: e.title || '' }),
        e.summary ? U.el('p.sm.muted', { style: { marginBottom: '12px' }, text: e.summary }) : null
      ].concat(groups))
    ]));
  });
  sec.appendChild(tl);

  /* 数据规模概览 */
  var stats = Ark.data.getStats();
  if (stats) {
    var ov = U.el('section.sec');
    ov.appendChild(Ark.ui.sectionHead('数据规模', '当前资源库构成', null, 'chart'));
    var grid = U.el('div.feat-grid');
    [
      ['inbox', stats.total + ' 个站点', '全部人工挑选，可直接访问'],
      ['folder', stats.categories.length + ' 个大分类 / ' + stats.categories.reduce(function (a, c) { return a + c.subcategories.length; }, 0) + ' 个子分类', '分层组织，每类独立子页面'],
      ['tag', stats.tagTotal + ' 个标签', '支持多标签交叉筛选'],
      ['flame', stats.hotCount + ' 个热门 · ' + stats.gemCount + ' 个宝藏', '冷门好站单独标记'],
      ['check', stats.freeCount + ' 个完全免费', '标注收费方式便于筛选'],
      ['globe', (stats.langCount.zh || 0) + ' 中文 / ' + (stats.langCount.en || 0) + ' 英文', '中外站点兼顾']
    ].forEach(function (f, i) {
      grid.appendChild(U.el('div.feat.reveal', { 'data-d': String(i % 6 + 1) }, [
        U.el('div.i', {}, I.el(f[0], { size: 22 })),
        U.el('div.t', { text: f[1] }),
        U.el('div.d', { text: f[2] })
      ]));
    });
    ov.appendChild(grid);
    sec.appendChild(ov);
  }

  content.appendChild(sec);
  Ark.lazy.scan(content);
};
