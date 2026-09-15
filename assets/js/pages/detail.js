/* ==========================================================================
   pages/detail.js —— 资源详情页
   --------------------------------------------------------------------------
   路由：#/detail?id=education-courses-01[&random=1]
   进入时写入浏览历史；展示完整字段、同子分类上一篇/下一篇、相关推荐。
   ========================================================================== */
Ark.pages = Ark.pages || {};

Ark.pages.detail = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var crumb = document.getElementById('ark-crumb');
  var q = U.parseQuery();
  var r = q.id ? Ark.data.getResource(q.id) : null;

  /* ---------------------------------------------------- 未找到 */
  if (!r) {
    Ark.breadcrumb.render(crumb, [{ text: '资源详情', icon: 'info' }]);
    content.appendChild(Ark.ui.empty('compass', '没有找到这条资源', '链接可能已失效，或该资源已从库中移除', [
      U.el('a.btn.btn-primary', { href: Ark.router.href('search') }, [
        I.el('search', { size: 14 }), U.el('span', { text: '去浏览全部资源' })
      ]),
      U.el('a.btn.btn-soft', { href: Ark.router.href('home'), text: '返回首页' })
    ]));
    return;
  }

  var cat = Ark.data.getCategory(r.cat) || { id: r.cat, name: r.cat, icon: '📁', accent: '#6366f1' };
  var sub = Ark.data.getSub(r.cat, r.sub) || { id: r.sub, name: r.sub || '' };

  /* 记录浏览历史（刷新页面不丢失） */
  Ark.store.visit(r.id, { name: r.name, url: r.url, cat: r.cat });

  /* 面包屑：首页 / 全部资源 / 大分类 / 子分类 / 资源名 */
  Ark.breadcrumb.render(crumb, [
    { text: '全部资源', href: Ark.router.href('search'), icon: 'search' },
    { text: cat.name, href: Ark.router.href('category', { cat: cat.id }), icon: I.catIcon(cat) },
    { text: sub.name, href: Ark.router.href('category', { cat: cat.id, sub: r.sub }), icon: 'folder' },
    { text: r.name }
  ]);

  var hot = Ark.config.hotMap[r.hot];
  var isFav = Ark.store.isFav(r.id);

  /* 收藏 / 取消收藏：局部更新按钮状态，不重绘整页 */
  function starIcon(on) { return I.svg(on ? 'starFill' : 'star', { size: 15 }); }
  var favBtn = U.el('button.btn.btn-soft.js-fav', {
    type: 'button', title: isFav ? '取消收藏' : '加入收藏', 'aria-pressed': isFav ? 'true' : 'false'
  }, [
    U.el('span.js-fav-ico', { html: starIcon(isFav) }),
    U.el('span.js-fav-txt', { text: isFav ? '已收藏' : '收藏' })
  ]);
  favBtn.addEventListener('click', function () {
    var on = Ark.store.toggleFav(r.id);
    favBtn.classList.toggle('on', on);
    favBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    favBtn.setAttribute('title', on ? '取消收藏' : '加入收藏');
    favBtn.querySelector('.js-fav-ico').innerHTML = starIcon(on);
    favBtn.querySelector('.js-fav-txt').textContent = on ? '已收藏' : '收藏';
    favBtn.classList.add('pop');
    setTimeout(function () { favBtn.classList.remove('pop'); }, 340);
    Ark.toast.show(on ? '已加入收藏' : '已取消收藏', on ? 'starFill' : 'star');
  });

  var copyBtn = U.el('button.btn.btn-soft', { type: 'button' }, [
    I.el('copy', { size: 15 }), U.el('span', { text: '复制链接' })
  ]);
  copyBtn.addEventListener('click', function () {
    U.copy(r.url).then(function () { Ark.toast.show('链接已复制', 'copy'); })
      .catch(function () { Ark.toast.show('复制失败，请手动复制', 'warn'); });
  });

  if (q.random === '1') {
    setTimeout(function () { Ark.toast.show('随机推荐 · 可再抽一条', 'dice', 2600); }, 500);
  }

  /* 同子分类的兄弟条目：上面的「本子分类共 N 条」与下面的「上一条 / 下一条」共用 */
  var siblings = Ark.data.allResources().filter(function (x) { return x.cat === r.cat && x.sub === r.sub; });
  var myIdx = siblings.findIndex(function (x) { return x.id === r.id; });
  var prev = myIdx > 0 ? siblings[myIdx - 1] : null;
  var next = myIdx > -1 && myIdx < siblings.length - 1 ? siblings[myIdx + 1] : null;

  /* ---------------------------------------------------- 头部主卡 */
  var ico = U.el('div.detail-ico', { style: { '--c': cat.accent, '--c-soft': U.softColor(cat.accent, .16) } },
    [I.el(I.catIcon(cat), { size: 30 })]);
  if (r._origin) ico.appendChild(U.el('img', { 'data-src': r._origin + '/favicon.ico', alt: '', referrerpolicy: 'no-referrer' }));

  content.appendChild(U.el('section.wrap', { style: { paddingTop: '10px' } }, [
    U.el('div.detail-head.reveal', { style: { '--c': cat.accent, '--c-soft': U.softColor(cat.accent, .14) } }, [
      U.el('div.detail-head-row', { style: { alignItems: 'flex-start' } }, [
        ico,
        U.el('div', { style: { flex: '1 1 320px', minWidth: '0' } }, [
          U.el('div.detail-badges', {}, [
            hot ? U.el('span.badge.' + hot.cls, {}, [
              I.el(hot.cls === 'badge-hot' ? 'flame' : 'gem', { size: 11 }),
              U.el('span', { text: hot.text })
            ]) : null,
            U.el('a.badge.badge-soft', { href: Ark.router.href('category', { cat: cat.id }) }, [
              I.el(I.catIcon(cat), { size: 12 }), U.el('span', { text: cat.name })
            ]),
            sub.name ? U.el('a.badge.badge-soft', { href: Ark.router.href('category', { cat: cat.id, sub: r.sub }) }, [
              I.el('folder', { size: 12 }), U.el('span', { text: sub.name })
            ]) : null,
            r.free === 'free' ? U.el('span.badge.badge-free', {}, [
              I.el('check', { size: 12 }), U.el('span', { text: '完全免费' })
            ]) : U.el('span.badge.badge-soft', { text: r.free === 'paid' ? '以付费为主' : '免费+付费' })
          ]),
          U.el('h1', { text: r.name }),
          U.el('p.muted', { style: { margin: '10px 0 0', fontSize: '1rem', maxWidth: '820px' }, text: r.desc }),
          U.el('div.detail-cta', {}, [
            U.el('a.btn.btn-primary.btn-lg', { href: r.url, target: '_blank', rel: 'noopener noreferrer', title: '在新标签页打开' }, [
              U.el('span', { text: '立即访问' }), I.el('link', { size: 15 })
            ]),
            copyBtn, favBtn,
            U.el('button.btn.btn-soft', { type: 'button', onclick: function () {
              var prev = Ark.data.randomResource(r.id);
              if (prev) Ark.router.go(Ark.router.href('detail', { id: prev.id, random: '1' }));
            } }, [I.el('dice', { size: 15 }), U.el('span', { text: '换一条随机' })])
          ])
        ])
      ]),
      U.el('div.detail-head-foot', {}, [
        U.el('div.detail-chips', {}, [
          U.el('span.chip', {}, [I.el('calendar', { size: 13 }), U.el('span', { text: '收录于 ' + r.added + '（' + U.fromNow(r.added) + '）' })]),
          U.el('span.chip', {}, [I.el('globe', { size: 13 }), U.el('span', { text: r.lang === 'zh' ? '中文站点' : r.lang === 'en' ? '英文站点' : '多语言' })]),
          U.el('span.chip', {}, [I.el('folder', { size: 13 }), U.el('span', { text: '同子分类共 ' + siblings.length + ' 条' })])
        ]),
        U.el('div.detail-tags', {}, r.tags.map(function (t) {
          return U.el('a.tag', { href: Ark.router.href('search', { tags: t }) }, '#' + t);
        }))
      ])
    ])
  ]));

  /* ---------------------------------------------------- 主体 + 侧栏 */
  var rel = Ark.data.related(r, 6);

  var mainCol = U.el('div', {}, [
    U.el('div.panel.panel-pad.reveal-x', {}, [
      U.el('h2', { style: { fontSize: '1.15rem', marginBottom: '14px' }, text: '资源信息' }),
      U.el('div.kv-grid', {}, [
        U.el('dl.kv', {}, [
          U.el('dt', { text: '访问地址' }), U.el('dd', {}, U.el('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, r.url)),
          U.el('dt', { text: '网站域名' }), U.el('dd', {}, U.el('code', { text: r._host || '—' }))
        ]),
        U.el('dl.kv', {}, [
          U.el('dt', { text: '所属分类' }), U.el('dd', { text: cat.name + ' / ' + sub.name }),
          U.el('dt', { text: '资源编号' }), U.el('dd', {}, U.el('code', { text: r.id }))
        ])
      ])
    ]),

    U.el('div.detail-nav-links', { style: { marginTop: '14px' } }, [
      prev ? U.el('a.btn.btn-xs.btn-soft', { href: Ark.router.href('detail', { id: prev.id }) }, [
        I.el('left', { size: 12 }), U.el('span', { text: '上一条：' + U.truncate(prev.name, 14) })
      ]) : null,
      next ? U.el('a.btn.btn-xs.btn-soft', { href: Ark.router.href('detail', { id: next.id }) }, [
        U.el('span', { text: '下一条：' + U.truncate(next.name, 14) }), I.el('right', { size: 12 })
      ]) : null,
      U.el('a.btn.btn-xs.btn-ghost', { href: Ark.router.href('feedback', { id: r.id }) }, [
        I.el('mail', { size: 12 }), U.el('span', { text: '纠错' })
      ])
    ]),

    U.el('section.sec', {}, [
      Ark.ui.sectionHead('相关推荐', '同分类或标签相近',
        { href: Ark.router.href('category', { cat: cat.id, sub: r.sub }), text: '进入子分类' }, 'wand'),
      (function () { var b = U.el('div'); Ark.ui.miniGrid(b, rel, {}); return b; })()
    ])
  ]);

  var sideCol = U.el('aside.detail-side', {}, [
    U.el('div.side-card', {}, [
      U.el('h4', {}, [I.el('folder', { size: 13 }), U.el('span', { text: '同子分类资源' })]),
      siblings.filter(function (x) { return x.id !== r.id; }).slice(0, 7).map(function (x) {
        return U.el('a.mini-item', { href: Ark.router.href('detail', { id: x.id }) }, [
          U.el('span.mini-ico', { text: Ark.card.initial(x.name) }),
          U.el('div', { style: { minWidth: '0' } }, [
            U.el('div.t.clamp-1', { text: x.name }),
            U.el('div.s', { text: x._host || '' })
          ])
        ]);
      })
    ]),
    U.el('div.side-card', {}, [
      U.el('h4', {}, [I.el('clock', { size: 13 }), U.el('span', { text: '最近浏览' })]),
      (function () {
        var list = Ark.store.history().filter(function (h) { return h.id !== r.id; }).slice(0, 6);
        if (!list.length) return U.el('p.sm.dim', { text: '还没有浏览记录' });
        return U.el('div', {}, list.map(function (h) {
          return U.el('a.mini-item', { href: Ark.router.href('detail', { id: h.id }) }, [
            U.el('span.mini-ico', {}, I.el('clock', { size: 13 })),
            U.el('div', { style: { minWidth: '0' } }, [
              U.el('div.t.clamp-1', { text: h.name || h.id }),
              U.el('div.s', { text: U.fromNow(new Date(h.t).toISOString().slice(0, 10)) })
            ])
          ]);
        }));
      })()
    ]),
    U.el('div.side-card', {}, [
      U.el('h4', {}, [I.el('compass', { size: 13 }), U.el('span', { text: '继续探索' })]),
      U.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, [
        U.el('a.btn.btn-soft', { href: Ark.router.href('category', { cat: cat.id }) }, [
          I.el(I.catIcon(cat), { size: 15 }), U.el('span', { text: '返回 ' + cat.name })
        ]),
        U.el('button.btn.btn-soft', { type: 'button', onclick: function () { Ark.navbar.randomGo(); } }, [
          I.el('dice', { size: 15 }), U.el('span', { text: '随机推荐一条' })
        ]),
        U.el('a.btn.btn-soft', { href: Ark.router.href('history') }, [
          I.el('clock', { size: 15 }), U.el('span', { text: '我的浏览历史' })
        ])
      ])
    ])
  ]);

  content.appendChild(U.el('section.wrap', { style: { marginTop: '24px' } }, [
    U.el('div.detail-wrap', {}, [mainCol, sideCol])
  ]));

  Ark.lazy.scan(content);
};
