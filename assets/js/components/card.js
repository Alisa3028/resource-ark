/* ==========================================================================
   components/card.js —— 资源卡片组件（卡片视图 / 列表视图共用）
   --------------------------------------------------------------------------
   只负责「把一条资源数据渲染成 DOM」，不绑定业务事件；
   交互统一由 Ark.card.bind(容器) 做事件委托，方便虚拟滚动下反复重建节点。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.card = (function () {
  var U = Ark.utils;
  var I = Ark.icons;

  /** 取名称首字作为图标兜底 */
  function initial(name) {
    var s = String(name || '?').trim();
    if (!s) return '?';
    // 英文取首字母大写，中文取首字
    return /^[a-zA-Z]/.test(s) ? s[0].toUpperCase() : s[0];
  }

  /** 收藏星标的两种状态（空心 / 实心） */
  function starIcon(on) { return I.svg(on ? 'starFill' : 'star', { size: 15 }); }

  /**
   * 渲染一张卡片
   * @param {object} r 资源对象
   * @param {object} mk 搜索命中信息：{ name:[索引], desc:[索引], tags:{序号:1}, cat:[索引], sub:[索引] }
   *                    也兼容 { marks: {...} } 的包裹写法
   */
  function render(r, mk) {
    mk = mk && mk.marks ? mk.marks : (mk || null);
    var accent = r._accent || '#6366f1';
    var hot = Ark.config.hotMap[r.hot];
    var isNew = r.added && (Date.now() - Date.parse(r.added)) < 1000 * 3600 * 24 * 45;
    var faved = Ark.store.isFav(r.id);
    var seen = !!Ark.store.seen()[r.id];

    var card = U.el('article.card' + (seen ? '.is-seen' : ''), {
      dataset: { id: r.id, cat: r.cat, sub: r.sub },
      style: { '--c': accent, '--c-soft': U.softColor(accent, 0.14) }
    });

    /* 收藏按钮：固定在卡片右上角，已收藏时常亮 */
    card.appendChild(U.el('button.card-fav' + (faved ? '.on' : ''), {
      type: 'button',
      title: faved ? '取消收藏' : '加入收藏',
      'aria-label': faved ? '取消收藏' : '加入收藏',
      'aria-pressed': faved ? 'true' : 'false',
      dataset: { fav: r.id },
      html: starIcon(faved)
    }));

    /* 顶部：图标 + 名称 + 域名 */
    var ico = U.el('div.card-ico', {}, [
      U.el('span.letter', { text: initial(r.name) })
    ]);
    /* 懒加载：直接取站点自身 favicon，失败则移除图片仅留字母方块 */
    if (r._origin) {
      ico.appendChild(U.el('img', {
        alt: '', 'data-src': r._origin + '/favicon.ico', loading: 'lazy', referrerpolicy: 'no-referrer'
      }));
    }

    var nameEl = U.el('a.card-name', {
      href: Ark.router.href('detail', { id: r.id }),
      title: r.name
    });
    nameEl.innerHTML = mk && mk.name ? U.highlight(r.name, mk.name) : U.esc(r.name);

    var head = U.el('div.card-head', {}, [
      nameEl,
      U.el('div.card-host', { text: r._host || '', title: r.url })
    ]);

    card.appendChild(U.el('div.card-top', {}, [ico, head]));

    /* 描述 */
    var descEl = U.el('p.card-desc.clamp-2');
    if (mk && mk.desc) descEl.innerHTML = U.highlight(r.desc, mk.desc);
    else descEl.textContent = r.desc;

    /* 标签（最多展示 4 个，其余折叠为 +N）；被搜索命中的标签高亮显示 */
    var tagBox = U.el('div.card-tags');
    r.tags.slice(0, 4).forEach(function (t, i) {
      var hit = mk && mk.tags && mk.tags[i];
      tagBox.appendChild(U.el('span.tag' + (hit ? '.hit' : ''), {
        title: hit ? '该结果命中了这个标签' : '点击按此标签筛选',
        dataset: { tag: t }
      }, '#' + t));
    });
    if (r.tags.length > 4) tagBox.appendChild(U.el('span.tag', { text: '+' + (r.tags.length - 4) }));

    card.appendChild(U.el('div.card-body', {}, [descEl, tagBox]));

    /* 底部信息 + 操作 */
    var foot = U.el('div.card-foot');
    if (hot) foot.appendChild(U.el('span.badge.' + hot.cls, {}, [
      I.el(hot.cls === 'badge-hot' ? 'flame' : 'gem', { size: 11 }),
      U.el('span', { text: hot.text })
    ]));
    if (isNew) foot.appendChild(U.el('span.badge.badge-new', {}, [
      I.el('wand', { size: 11 }),
      U.el('span', { text: '新' })
    ]));
    /* 已看过：只留一个眼形图标，靠 title 说明，避免卡片底部堆文字 */
    if (seen) foot.appendChild(U.el('span.chip.chip-seen', { title: '你已经看过这条资源' }, I.el('eye', { size: 12 })));

    /* 搜索命中在分类/子分类上时，明确告诉用户「为什么这条会出现」 */
    if (mk && (mk.cat || mk.sub)) {
      var catChip = U.el('span.chip', { title: '该结果命中了分类名称' });
      catChip.innerHTML = I.svg('folder', { size: 13 }) + ' <span>' +
        (mk.cat ? U.highlight(r._catName || '', mk.cat) : U.esc(r._catName || '')) +
        '</span>' +
        (r._subName ? ' / <span>' + (mk.sub ? U.highlight(r._subName, mk.sub) : U.esc(r._subName)) + '</span>' : '');
      foot.appendChild(catChip);
    }

    /* 卡片上不再显示评分与访问量：这两个数字曾是构建期伪随机生成的，与真实站点无关 */
    foot.appendChild(U.el('span.spacer'));
    foot.appendChild(U.el('button.btn.btn-xs.btn-soft.icon-only.js-copy', {
      type: 'button', title: '复制链接', 'aria-label': '复制链接', dataset: { copy: r.url }
    }, I.el('copy', { size: 14 })));
    foot.appendChild(U.el('a.btn.btn-xs.btn-primary', {
      href: r.url, target: '_blank', rel: 'noopener noreferrer', title: '在新标签页打开'
    }, [U.el('span', { text: '访问' }), I.el('link', { size: 13 })]));
    card.appendChild(foot);

    return card;
  }

  /**
   * 为容器绑定交互（事件委托，只需调用一次，之后新增卡片自动生效）
   * @param {Element} box 结果容器
   * @param {object} ctx { onTag(tag), onFav(id, on) }
   */
  function bind(box, ctx) {
    if (box.dataset.bound === '1') return;
    box.dataset.bound = '1';

    box.addEventListener('click', function (e) {
      /* 1. 复制链接 */
      var copyBtn = e.target.closest('.js-copy');
      if (copyBtn) {
        e.preventDefault(); e.stopPropagation();
        U.copy(copyBtn.dataset.copy).then(function () {
          Ark.toast.show('链接已复制到剪贴板', 'copy');
          copyBtn.classList.add('pop');
          setTimeout(function () { copyBtn.classList.remove('pop'); }, 340);
        }).catch(function () { Ark.toast.show('复制失败，请手动选择', 'warn'); });
        return;
      }
      /* 2. 收藏 */
      var favBtn = e.target.closest('.card-fav');
      if (favBtn) {
        e.preventDefault(); e.stopPropagation();
        var id = favBtn.dataset.fav;
        var on = Ark.store.toggleFav(id);
        favBtn.classList.toggle('on', on);
        favBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        favBtn.setAttribute('title', on ? '取消收藏' : '加入收藏');
        favBtn.innerHTML = starIcon(on);
        favBtn.classList.add('pop');
        setTimeout(function () { favBtn.classList.remove('pop'); }, 340);
        Ark.toast.show(on ? '已加入收藏' : '已取消收藏', on ? 'starFill' : 'star');
        ctx && ctx.onFav && ctx.onFav(id, on);
        return;
      }
      /* 3. 标签 -> 筛选 */
      var tag = e.target.closest('[data-tag]');
      if (tag) {
        e.preventDefault(); e.stopPropagation();
        ctx && ctx.onTag && ctx.onTag(tag.dataset.tag);
        return;
      }
      /* 4. 普通外链交给浏览器（新标签页） */
      if (e.target.closest('a[target="_blank"]')) return;
      /* 5. 其余区域点击 -> 进详情页 */
      var card = e.target.closest('.card');
      if (card && card.dataset.id) {
        Ark.router.go(Ark.router.href('detail', { id: card.dataset.id }));
      }
    });
  }

  return { render: render, bind: bind, initial: initial };
})();
