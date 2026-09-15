/* ==========================================================================
   pages/tags.js —— 标签云
   --------------------------------------------------------------------------
   路由：#/tags[?cat=design]
   全站 1800+ 个标签按收录数量分级展示，字号越大代表被越多的资源使用。
   支持页内即时搜索与分类限定；点击任意标签直达该标签的筛选结果页。
   默认只渲染「被多条资源重复使用」的标签，其余按需展开，避免一屏塞进近两千个节点。
   阈值随范围自适应：全站取 >=3（约 500 个）；限定到某个领域后取 >=2，
   否则长尾标签多的分类（如设计素材）会被裁到只剩十来个。
   ========================================================================== */
Ark.pages = Ark.pages || {};

Ark.pages.tags = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var crumb = document.getElementById('ark-crumb');
  var q = U.parseQuery();

  var cats = Ark.data.state().cats;
  var allTags = Ark.data.getTags();

  Ark.breadcrumb.render(crumb, [{ text: '标签云', icon: 'tag' }]);

  var DEFAULT_MIN = 3;    // 全站默认阈值：被 >=3 条资源使用

  var state = {
    cat: q.cat && Ark.data.getCategory(q.cat) ? q.cat : '',
    keyword: (q.q || '').trim().toLowerCase(),
    showAll: q.all === '1'
  };

  /* ---------------------------------------------------- 顶部：说明 + 搜索 */
  var input = U.el('input.field', {
    type: 'search', value: q.q || '', placeholder: '搜索标签名…',
    style: { fontSize: '.95rem', padding: '11px 14px' },
    'aria-label': '搜索标签'
  });

  var countEl = U.el('span.count-badge');

  var headPanel = U.el('div.panel.panel-pad.reveal', {}, [
    U.el('h1', { style: { fontSize: 'clamp(1.3rem,2.6vw,1.8rem)' }, text: '标签云' }),
    U.el('p.sm.muted', { style: { margin: '8px 0 16px' },
      text: '字号越大，代表这个标签被越多的资源使用。点任意标签即可查看对应资源。' }),
    U.el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } }, [
      U.el('div', { style: { flex: '1 1 280px', minWidth: '0' } }, [input]),
      countEl
    ])
  ]);

  /* ---------------------------------------------------- 分类限定 */
  var catRow = U.el('div.tag-cat-row');
  function catChip(id, name, iconName) {
    var on = state.cat === id;
    var b = U.el('button.tag-cat' + (on ? '.on' : ''), {
      type: 'button', 'aria-pressed': on ? 'true' : 'false', dataset: { cat: id }
    }, [
      id ? I.el(iconName, { size: 13 }) : I.el('grid', { size: 13 }),
      U.el('span', { text: name })
    ]);
    b.addEventListener('click', function () {
      state.cat = id;
      syncURL();
      render();
    });
    return b;
  }
  function buildCatRow() {
    catRow.innerHTML = '';
    catRow.appendChild(catChip('', '全部领域', 'grid'));
    cats.forEach(function (c) { catRow.appendChild(catChip(c.id, c.name, I.catIcon(c))); });
  }

  /* ---------------------------------------------------- 云主体 */
  var cloudHost = U.el('div.tagcloud');
  var footRow = U.el('div.tc-foot');

  /** 按收录数量定级：字号阶梯 */
  function tierOf(n) {
    if (n >= 100) return 5;
    if (n >= 40) return 4;
    if (n >= 20) return 3;
    if (n >= 10) return 2;
    if (n >= 4) return 1;
    return 0;
  }

  /** 取该标签在当前分类下的资源数（未限定分类时即总数） */
  function countIn(t) {
    if (!state.cat) return t.count;
    var hit = (t.cats || []).filter(function (kv) { return kv[0] === state.cat; })[0];
    return hit ? hit[1] : 0;
  }

  function minOf() {
    // 领域内标签更分散，阈值下调一档，否则会被裁得太狠
    return state.cat ? 2 : DEFAULT_MIN;
  }

  /** 当前范围内可用的标签总数（用于「显示全部」按钮文案） */
  function scopeTotal() {
    if (!state.cat) return allTags.length;
    return allTags.filter(function (t) { return countIn(t) > 0; }).length;
  }

  function visibleTags() {
    var list = allTags;
    if (state.cat) list = list.filter(function (t) { return countIn(t) > 0; });
    if (state.keyword) {
      list = list.filter(function (t) { return t.name.toLowerCase().indexOf(state.keyword) > -1; });
    }
    if (!state.showAll && !state.keyword) {
      list = list.filter(function (t) { return countIn(t) >= minOf(); });
    }
    return list.slice().sort(function (a, b) { return countIn(b) - countIn(a); });
  }

  function render() {
    var list = visibleTags();
    cloudHost.innerHTML = '';
    footRow.innerHTML = '';

    countEl.textContent = '显示 ' + list.length + ' 个标签';

    if (!list.length) {
      cloudHost.appendChild(Ark.ui.empty('tag', '没有匹配的标签', '换个关键词，或切回「全部领域」', [
        U.el('button.btn.btn-soft', { type: 'button', onclick: function () {
          state.keyword = ''; input.value = ''; state.cat = ''; state.showAll = false;
          buildCatRow(); syncURL(); render();
        } }, [I.el('refresh', { size: 14 }), U.el('span', { text: '重置筛选' })])
      ]));
      return;
    }

    var frag = document.createDocumentFragment();
    list.forEach(function (t) {
      var n = countIn(t);
      var a = U.el('a.tagcloud-item.tier-' + tierOf(n), {
        href: Ark.router.href('search', { tags: t.name, cat: state.cat || null }),
        title: '「' + t.name + '」共 ' + n + ' 条资源' + (state.cat ? '（当前领域内）' : ''),
        dataset: { tag: t.name }
      }, [
        U.el('span.tc-name', { text: t.name }),
        U.el('span.tc-n', { text: String(n) })
      ]);
      frag.appendChild(a);
    });
    cloudHost.appendChild(frag);

    /* 展开 / 收起：仅在没有关键词时才有意义 */
    if (!state.keyword) {
      var hidden = allTags.filter(function (t) {
        return (!state.cat || countIn(t) > 0) && countIn(t) < minOf();
      }).length;
      if (hidden > 0 || state.showAll) {
        footRow.appendChild(U.el('button.btn.btn-soft.btn-xs', {
          type: 'button', onclick: function () {
            state.showAll = !state.showAll; syncURL(); render();
          }
        }, [
          I.el(state.showAll ? 'down' : 'plus', { size: 13 }),
          U.el('span', { text: state.showAll ? '只看常用标签' : '显示全部 ' + scopeTotal() + ' 个标签' })
        ]));
      }
    }
  }

  /** 只同步地址栏，不重渲染（保留输入焦点） */
  function syncURL() {
    Ark.router.replace(Ark.router.href('tags', {
      cat: state.cat || null,
      q: input.value.trim() || null,
      all: state.showAll ? '1' : null
    }));
  }

  var timer = null;
  input.addEventListener('input', function () {
    state.keyword = input.value.trim().toLowerCase();
    clearTimeout(timer);
    timer = setTimeout(function () { render(); syncURL(); }, 180);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { clearTimeout(timer); render(); syncURL(); }
  });

  buildCatRow();

  content.appendChild(U.el('section.wrap', { style: { paddingTop: '18px' } }, [headPanel]));
  content.appendChild(U.el('section.sec.wrap', {}, [
    catRow,
    cloudHost,
    footRow
  ]));

  render();
};
