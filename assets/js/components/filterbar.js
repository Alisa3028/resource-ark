/* ==========================================================================
   components/filterbar.js —— 多级分类 + 多标签筛选栏
   --------------------------------------------------------------------------
   三层层级：大分类 → 子分类 → 标签（可多选，支持「全部满足 / 任一满足」）。
   每层都带实时数量统计，勾选后立即回调上层重新筛选。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.filterbar = (function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var TAG_PREVIEW = 26;      // 默认展示的标签个数

  /** 统计当前 scope 下每个子分类 / 标签的条数 */
  function counts(catId, subId) {
    var subs = {}, tags = {};
    Ark.data.allResources().forEach(function (r) {
      if (catId && r.cat !== catId) return;
      if (subId && r.sub !== subId) return;
      subs[r.sub] = (subs[r.sub] || 0) + 1;
      r.tags.forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
    });
    return { subs: subs, tags: tags };
  }

  /**
   * @param {Element} host 容器
   * @param {object} cfg {
   *   cat, sub, tags:[],           当前选中状态
   *   showCat: true,               是否展示大分类行
   *   showSub: true,               是否展示子分类行
   *   onChange(state)              任意筛选条件变化时回调
   * }
   */
  function render(host, cfg) {
    if (!host) return;
    host.classList.add('filterbar');
    host.innerHTML = '';

    var state = {
      cat: cfg.cat || '',
      sub: cfg.sub || '',
      tags: (cfg.tags || []).slice(),
      tagMode: Ark.store.get('ark.tagmode', 'and')
    };
    var cat = state.cat ? Ark.data.getCategory(state.cat) : null;
    var c = counts(state.cat, state.sub);
    var expanded = false;
    var tagQuery = '';

    function emit(patch) {
      Object.assign(state, patch || {});
      cfg.onChange && cfg.onChange({
        cat: state.cat, sub: state.sub, tags: state.tags.slice(), tagMode: state.tagMode
      });
    }
    function rerender() { render(host, Object.assign({}, cfg, state)); }

    var box = U.el('div.filters');

    /* ---------------------------------------------- 第一层：大分类 */
    if (cfg.showCat !== false) {
      var catItems = U.el('div.filter-items');
      catItems.appendChild(chip('全部分类', '', !state.cat, function () {
        emit({ cat: '', sub: '', tags: [] });
      }, ''));

      Ark.data.state().cats.forEach(function (cc) {
        var on = state.cat === cc.id;
        // 分类名不再拼 emoji：图标统一走 SVG，文案保持纯文字
        var el = chip(cc.name + (cc.count ? ' ' + cc.count : ''), cc.id, on, function () {
          emit({ cat: on ? '' : cc.id, sub: '', tags: [] });
        }, cc.accent, I.catIcon(cc));
        catItems.appendChild(el);
      });
      box.appendChild(U.el('div.filter-row', {}, [label('grid', '大分类'), catItems]));
    }

    /* ---------------------------------------------- 第二层：子分类 */
    if (cfg.showSub !== false && cat) {
      var subItems = U.el('div.filter-items');
      subItems.appendChild(chip('全部 ' + cat.name, '', !state.sub, function () {
        emit({ sub: '', tags: [] });
      }, ''));
      (cat.subcategories || []).forEach(function (s) {
        var on = state.sub === s.id;
        var n = c.subs[s.id] || 0;
        subItems.appendChild(chip(s.name + ' ' + n, s.id, on, function () {
          emit({ sub: on ? '' : s.id, tags: [] });
        }, cat.accent, 'folder'));
      });
      box.appendChild(U.el('div.filter-row', {}, [label('folder', '子分类'), subItems]));
    }

    /* ---------------------------------------------- 第三层：标签 */
    var allTags = Object.keys(c.tags).map(function (t) { return { name: t, count: c.tags[t] }; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });

    // 已勾选的标签永远排在最前面，避免被折叠隐藏
    var selectedSet = {};
    state.tags.forEach(function (t) { selectedSet[t] = 1; });
    var ordered = allTags.filter(function (t) { return selectedSet[t.name]; })
      .concat(allTags.filter(function (t) { return !selectedSet[t.name]; }));

    var shown = ordered.filter(function (t) {
      return !tagQuery || t.name.toLowerCase().indexOf(tagQuery.toLowerCase()) > -1;
    });
    var visible = expanded || tagQuery ? shown : shown.slice(0, TAG_PREVIEW);

    var tagWrap = U.el('div.filter-items' + (visible.length > 12 ? '.chips-scroll' : ''));
    if (!shown.length) tagWrap.appendChild(U.el('span.dim.sm', { text: '该范围内暂无标签' }));
    visible.forEach(function (t) {
      var on = !!selectedSet[t.name];
      var label = U.el('label.check');
      var input = U.el('input', { type: 'checkbox', checked: on });
      input.addEventListener('change', function () {
        var list = state.tags.slice();
        var i = list.indexOf(t.name);
        if (this.checked && i === -1) list.push(t.name);
        if (!this.checked && i > -1) list.splice(i, 1);
        emit({ tags: list });
      });
      label.appendChild(input);
      label.appendChild(U.el('span.box'));
      label.appendChild(U.el('span', { text: '#' + t.name }));
      label.appendChild(U.el('span.n', { text: String(t.count) }));
      tagWrap.appendChild(label);
    });

    var tagTools = U.el('span', { style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } });
    if (shown.length > TAG_PREVIEW) {
      tagTools.appendChild(U.el('button.btn.btn-xs.btn-ghost', {
        type: 'button',
        onclick: function () { expanded = !expanded; rerender(); }
      }, [
        U.el('span', { text: expanded ? '收起标签' : '展开全部 ' + shown.length + ' 个标签' }),
        I.el(expanded ? 'down' : 'down', { size: 13, cls: expanded ? 'flip-x' : '' })
      ]));
    }

    var tagRow = U.el('div.filter-row', {}, [
      label('tag', '标签筛选'),
      U.el('div', { style: { flex: '1 1 auto' } }, [
        U.el('div.filter-tools', { style: { marginBottom: '10px' } }, [
          (function () {
            var inp = U.el('input.field', {
              type: 'search', placeholder: '在结果中找标签…', value: tagQuery,
              style: { maxWidth: '220px', padding: '6px 12px', fontSize: '.82rem' },
              'aria-label': '在筛选结果中查找标签'
            });
            inp.addEventListener('input', U.debounce(function () { tagQuery = inp.value.trim(); rerender(); }, 200));
            return inp;
          })(),
          (function () {
            var seg = U.el('span.seg');
            [['and', '全部满足'], ['or', '任一满足']].forEach(function (m) {
              seg.appendChild(U.el('button' + (state.tagMode === m[0] ? '.on' : ''), {
                type: 'button',
                onclick: function () { Ark.store.set('ark.tagmode', m[0]); rerender(); emit({ tagMode: m[0] }); },
                title: m[0] === 'and' ? '同时包含所有已选标签' : '包含任意一个已选标签'
              }, m[1]));
            });
            return seg;
          })(),
          tagTools
        ]),
        tagWrap
      ])
    ]);
    box.appendChild(tagRow);

    /* ---------------------------------------------- 已选摘要 */
    if (state.tags.length || state.sub || state.cat) {
      var summary = U.el('div.filter-selected');
      summary.appendChild(U.el('span.tiny.dim', { text: '已选：' }));

      if (state.cat && cat) {
        summary.appendChild(pill(cat.name, function () { emit({ cat: '', sub: '', tags: [] }); }, 'grid'));
      }
      if (state.sub) {
        var sObj = Ark.data.getSub(state.cat, state.sub);
        if (sObj) summary.appendChild(pill(sObj.name, function () { emit({ sub: '', tags: [] }); }, 'folder'));
      }
      state.tags.forEach(function (t) {
        summary.appendChild(pill(t, function () {
          emit({ tags: state.tags.filter(function (x) { return x !== t; }) });
        }, 'tag', '#'));
      });
      summary.appendChild(U.el('button.btn.btn-xs.btn-ghost', {
        type: 'button',
        onclick: function () { emit({ cat: '', sub: '', tags: [] }); }
      }, [I.el('close', { size: 13 }), U.el('span', { text: '清空全部筛选' })]));
      box.appendChild(U.el('div.filter-row', {}, [label('check', '已选'), summary]));
    }

    /* ---------------------------------------------- 单行工具条：条件摘要 + 收起开关
       筛选栏是 sticky 的，三层筛选铺开能占到屏幕的三分之二（手机竖屏甚至超过 90%），
       往下浏览内容时必须能收成一行。收起 / 展开由 setFolded 统一处理。 */
    var sumText = (function () {
      var parts = [];
      if (state.cat && cat) parts.push(cat.name);
      if (state.sub) {
        var so = Ark.data.getSub(state.cat, state.sub);
        if (so) parts.push(so.name);
      }
      if (state.tags.length) parts.push(state.tags.length + ' 个标签');
      return parts.length ? parts.join(' · ') : '全部资源';
    })();

    var toggleBtn = U.el('button.btn.btn-xs.btn-soft.fb-toggle', {
      type: 'button', 'aria-expanded': 'true'
    });
    toggleBtn.addEventListener('click', function () { setFolded(!isFolded(curHost)); });

    host.appendChild(U.el('div.fb-bar', {}, [
      U.el('span.fb-sum', { text: sumText, title: '当前筛选条件' }),
      toggleBtn
    ]));
    host.appendChild(box);

    // 筛选条件一变就会整块重绘、class 会被清掉，所以收起状态存在模块级变量里，重绘后照原样恢复
    if (foldState === true) host.classList.add('fb-folded');
    bindAutoFold(host, toggleBtn);
    // 首次渲染：如果这块筛选栏本身就要吃掉七成以上的屏幕，直接收起，让结果先露出来
    if (foldState === null && host.getBoundingClientRect().height > window.innerHeight * 0.7) {
      setFolded(true, { silent: true });
    }

    /* 内部工具 */
    /** 筛选行的行首标签（图标 + 文案） */
    function label(icon, text) {
      return U.el('div.filter-label', {}, [
        I.el(icon, { size: 14 }),
        U.el('span', { text: text })
      ]);
    }
    /** 可点选的胶囊（分类 / 子分类），可带一个语义图标 */
    function chip(text, val, on, fn, accent, icon) {
      var b = U.el('button.tag' + (on ? '.active' : ''), {
        type: 'button', dataset: { val: val }, 'aria-pressed': on ? 'true' : 'false'
      });
      if (icon) b.appendChild(I.el(icon, { size: 12 }));
      b.appendChild(U.el('span', { text: text }));
      if (on && accent) b.style.background = accent;
      b.addEventListener('click', fn);
      return b;
    }
    /** 已选摘要里的可删除胶囊 */
    function pill(text, fn, icon, prefix) {
      var p = U.el('span.tag.active.pill', { role: 'button', tabindex: '0', title: '点击移除' }, [
        icon ? I.el(icon, { size: 12 }) : null,
        U.el('span', { text: (prefix || '') + text }),
        I.el('close', { size: 11, cls: 'pill-x' })
      ]);
      p.addEventListener('click', fn);
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
      return p;
    }
  }

  /* ============================================================ 收起 / 展开
     展开态是一个普通区块（会随页面滚走），收起态是吸顶的一行摘要。
     两种状态切换时高度差最大能有几百像素，必须处理滚动位置，否则整页会跳一下。
     ============================================================ */
  var curHost = null, curBtn = null;
  var lastY = 0, ticking = false, suppress = false, boundScroll = false;
  var foldState = null;         // null=还没决定过 / true=收起 / false=展开

  function isFolded(host) { return !!host && host.classList.contains('fb-folded'); }

  /** 顶栏高度，用于判断筛选栏有没有滚出视野 */
  function navH() {
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 60;
  }
  /** 筛选栏在文档里的绝对位置（展开态是静态定位，这个值就是它真正的落点） */
  function docTop(host) { return host.getBoundingClientRect().top + window.pageYOffset; }

  function syncToggle() {
    if (!curBtn) return;
    var on = isFolded(curHost);
    curBtn.setAttribute('aria-expanded', on ? 'false' : 'true');
    curBtn.title = on ? '展开筛选条件' : '收起筛选栏，专心浏览';
    curBtn.innerHTML = '';
    // 收起态用漏斗图标（「筛选」），展开态用朝上的箭头（「收起」）—— 复用 down + flip-x
    curBtn.appendChild(I.el(on ? 'filter' : 'down', { size: 13, cls: on ? '' : 'flip-x' }));
    curBtn.appendChild(U.el('span', { text: on ? '筛选' : '收起' }));
  }

  /**
   * @param {boolean} on       true 收起 / false 展开
   * @param {object} [opt]     silent: 只改状态不动滚动位置（首次渲染用）
   */
  function setFolded(on, opt) {
    opt = opt || {};
    if (!curHost || !document.body.contains(curHost)) return;
    if (isFolded(curHost) === on) return;

    var root = document.documentElement;
    var oldBehavior = root.style.scrollBehavior;
    var oldAnchor = document.body.style.overflowAnchor;
    // ① 全站 html{scroll-behavior:smooth}，这里的位移必须强制瞬时，
    //    否则会变成几百毫秒的平滑滑行 —— 那看起来就是「整页自己跳了一下」。
    root.style.scrollBehavior = 'auto';
    // ② Chrome 自带的滚动锚定（scroll anchoring）也会在内容高度变化时修正滚动位置，
    //    但它是否介入取决于它选中的锚点，实测时灵时不灵；一旦介入就会和下面的手动补偿
    //    叠加成两倍位移。这里只在改高度的这一瞬间关掉它，保证结果唯一确定。
    document.body.style.overflowAnchor = 'none';

    var before = curHost.getBoundingClientRect().height;
    curHost.classList.toggle('fb-folded', on);
    foldState = on;
    var after = curHost.getBoundingClientRect().height;
    syncToggle();

    var d = after - before;               // 收起时为负、展开时为正
    var restore = function () {
      root.style.scrollBehavior = oldBehavior;
      document.body.style.overflowAnchor = oldAnchor;
    };
    var jump = function (top) {
      suppress = true;                    // 补偿产生的 scroll 事件不能再触发一次折叠
      window.scrollTo(0, Math.max(0, top));
      requestAnimationFrame(function () {
        suppress = false;
        lastY = window.pageYOffset;
        restore();
      });
    };

    if (!d || opt.silent) { restore(); return; }

    if (on) {
      // 收起：反向补偿同样的像素数 —— 用户正在看的内容在视口里原地不动，
      // 视觉上就像筛选栏自己「缩」了。实测卡片视口位移 0px。
      jump(window.pageYOffset + d);
    } else {
      // 展开：展开后它是静态的大面板。如果它已经滚出视野（说明用户是从吸顶的
      // 小条点开的），直接把它带回眼前；否则只是原地展开，不用动滚动条。
      var top = docTop(curHost) - window.pageYOffset;
      if (top < navH() - 40 || top > window.innerHeight - 120) jump(docTop(curHost) - navH() - 12);
      else restore();
    }
  }

  /** 每次渲染都重新指向最新的筛选栏（筛选变化会整块重绘） */
  function bindAutoFold(host, btn) {
    curHost = host;
    curBtn = btn;
    lastY = window.pageYOffset;
    syncToggle();
    if (boundScroll) return;
    boundScroll = true;

    window.addEventListener('scroll', function () {
      if (suppress || ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (suppress || !curHost || !document.body.contains(curHost)) return;
        var y = window.pageYOffset;
        var dy = y - lastY;
        // 往下滚，且展开的筛选栏已经整个滚出视野 → 收起成吸顶小条。
        // 只有「它已经看不见了」才收，这样切换是无缝的：内容原地不动，小条自然出现。
        if (dy > 6 && !isFolded(curHost) &&
            curHost.getBoundingClientRect().bottom < navH() + 40) {
          setFolded(true);
        }
        // 反向不自动展开：展开是一整块大面板，突然弹出来只会打断阅读，想改条件点小条即可
        lastY = y;
      });
    }, { passive: true });
  }

  return { render: render, counts: counts, setFolded: setFolded };
})();
