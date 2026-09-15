/* ==========================================================================
   core/icons.js —— 内联 SVG 图标系统（线性 / 轻双色，零第三方依赖）
   --------------------------------------------------------------------------
   为什么不用图标字体或图标库？
     · 图标字体需要额外请求 + 会出现首屏「方块」闪烁
     · 第三方图标库动辄几十 KB，而本站只需要二十来个图标
   因此这里把整套图标内联为 SVG 路径，直接跟随 currentColor 与 CSS 尺寸，
   既没有额外请求，也不会有字形缺失问题。

   用法：
     Ark.icons.svg('search')                 -> SVG 字符串（可拼进 innerHTML）
     Ark.icons.svg('star', { size: 20 })     -> 指定尺寸
     Ark.icons.el('home', { cls: 'nav-i' })  -> <span class="ico"><svg …/></span>
     Ark.icons.name('star')                  -> 判断图标是否存在
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.icons = (function () {

  /* 24×24 视窗下的线性图标路径；filled:true 的图标走实心渲染 */
  var P = {
    /* ---- 导航与页面 ---- */
    home:     '<path d="M3.5 10.8 12 3.6l8.5 7.2"/><path d="M5.7 9.5v9.6a1.6 1.6 0 0 0 1.6 1.6h9.4a1.6 1.6 0 0 0 1.6-1.6V9.5"/><path d="M9.6 20.7v-5.5h4.8v5.5"/>',
    grid:     '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    dense:    '<rect x="3.5" y="3.5" width="8" height="8" rx="2"/><rect x="14" y="3.5" width="6.5" height="8" rx="2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="2"/><rect x="12.5" y="14" width="8" height="6.5" rx="2"/>',
    masonry:  '<rect x="3.5" y="3.5" width="7" height="10" rx="2"/><rect x="13.5" y="3.5" width="7" height="6.5" rx="2"/><rect x="3.5" y="16" width="7" height="4.5" rx="2"/><rect x="13.5" y="12.5" width="7" height="8" rx="2"/>',
    list:     '<path d="M4.2 6.4h2.6M4.2 12h2.6M4.2 17.6h2.6"/><path d="M10.4 6.4h9.4M10.4 12h9.4M10.4 17.6h9.4"/>',
    search:   '<circle cx="11" cy="11" r="6.3"/><path d="m15.6 15.6 4.2 4.2"/>',
    book:     '<path d="M6.2 3.6h8.2L19.2 8.4v12a1.6 1.6 0 0 1-1.6 1.6H6.2a1.6 1.6 0 0 1-1.6-1.6V5.2a1.6 1.6 0 0 1 1.6-1.6Z"/><path d="M14 3.9v4.6h4.7"/><path d="M8.6 12.6h6.8M8.6 16.2h4.6"/>',
    info:     '<circle cx="12" cy="12" r="8.3"/><path d="M12 11.2v5.2"/><circle cx="12" cy="8.1" r="1.15" fill="currentColor" stroke="none"/>',
    compass:  '<circle cx="12" cy="12" r="8.3"/><path d="m15.3 8.7-1.7 4.9-4.9 1.7 1.7-4.9Z"/>',

    /* ---- 收藏 / 历史 / 随机 / 置顶 ---- */
    star:       '<path d="m12 3.7 2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 17.22l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86Z"/>',
    starFill:   '<path d="m12 3.7 2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 17.22l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86Z" fill="currentColor" stroke="none"/>',
    clock:      '<circle cx="12" cy="12" r="8.3"/><path d="M12 7.4V12l3.2 2"/>',
    dice:       '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.2"/><circle cx="8.8" cy="8.8" r="1.35" fill="currentColor" stroke="none"/><circle cx="15.2" cy="15.2" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/>',
    top:        '<path d="M12 19.6V5.2"/><path d="m6.1 11.1 5.9-5.9 5.9 5.9"/>',
    trash:      '<path d="M4.6 7h14.8"/><path d="M9.6 7V5.5A1.5 1.5 0 0 1 11.1 4h1.8A1.5 1.5 0 0 1 14.4 5.5V7"/><path d="M6.6 7 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.4 7"/><path d="M10.4 10.8v6M13.6 10.8v6"/>',

    /* ---- 操作 ---- */
    copy:       '<rect x="9" y="9" width="11.4" height="11.4" rx="2.6"/><path d="M15.4 5.6V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8.4a2 2 0 0 0 2 2h.6"/>',
    link:       '<path d="M14.4 4.4h5.2v5.2"/><path d="M19.2 4.7 12 11.9"/><path d="M17.8 14.2v4.2a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.4V7.8a1.6 1.6 0 0 1 1.6-1.6h4.2"/>',
    check:      '<path d="m5 12.6 4.6 4.4L19 7.4"/>',
    refresh:    '<path d="M20 11.6A8 8 0 1 0 18.4 17"/><path d="M20 5.6v6h-6"/>',
    close:      '<path d="m6.2 6.2 11.6 11.6"/><path d="m17.8 6.2-11.6 11.6"/>',
    plus:       '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
    menu:       '<path d="M4 7h16"/><path d="M4 12h11"/><path d="M4 17h16"/>',
    filter:     '<path d="M4 6.4h16"/><path d="M7 12h10"/><path d="M10 17.6h4"/>',
    left:       '<path d="m14 6.2-5.8 5.8L14 17.8"/>',
    right:      '<path d="m10 6.2 5.8 5.8L10 17.8"/>',
    down:       '<path d="m6.2 10 5.8 5.8L17.8 10"/>',
    arrowRight: '<path d="M4.6 12h14.2"/><path d="m13 6.4 5.6 5.6-5.6 5.6"/>',

    /* ---- 外观 / 主题 ---- */
    palette:    '<path d="M12 3.6a8.4 8.4 0 1 0 0 16.8c1.15 0 1.9-.83 1.9-1.78 0-.5-.2-.95-.5-1.3a1.83 1.83 0 0 1 1.35-3.06h1.72A3.98 3.98 0 0 0 20.4 10.3C20.4 6.3 16.6 3.6 12 3.6Z"/><circle cx="7.9" cy="10.6" r="1.15" fill="currentColor" stroke="none"/><circle cx="11.2" cy="7.6" r="1.15" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.6" r="1.15" fill="currentColor" stroke="none"/>',
    contrast:   '<circle cx="12" cy="12" r="8.3"/><path d="M12 3.7v16.6a8.3 8.3 0 0 0 0-16.6Z" fill="currentColor" stroke="none"/>',
    sun:        '<circle cx="12" cy="12" r="4.1"/><path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.35 5.35 6.98 6.98M17.02 17.02l1.63 1.63M18.65 5.35 17.02 6.98M6.98 17.02 5.35 18.65"/>',
    moon:       '<path d="M20.2 14.4A8.5 8.5 0 0 1 9.6 3.8a8.5 8.5 0 1 0 10.6 10.6Z"/>',
    wand:       '<path d="M12 3.4 13.7 8 18.3 9.7 13.7 11.4 12 16 10.3 11.4 5.7 9.7 10.3 8Z"/><path d="M18.6 15.4l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z"/>',
    zap:        '<path d="M13.4 3.2 6 13.6h4.9l-.8 7.4 7.4-10.6h-5.1Z"/>',

    /* ---- 内容标记 ---- */
    tag:        '<path d="M4.2 12.6V5.4a1.2 1.2 0 0 1 1.2-1.2h7.2c.32 0 .62.13.85.35l6.1 6.1a1.2 1.2 0 0 1 0 1.7l-6.5 6.5a1.2 1.2 0 0 1-1.7 0l-6.1-6.1a1.2 1.2 0 0 1-.35-.85Z"/><circle cx="8.4" cy="8.4" r="1.3"/>',
    mail:       '<rect x="3" y="5.4" width="18" height="13.2" rx="2.5"/><path d="m3.9 7.1 7 5.35a2 2 0 0 0 2.2 0l7-5.35"/>',
    github:     '<path d="M9.3 20.4v-2.6c-2.6.5-3.2-1.15-3.2-1.15-.4-1.1-1.05-1.4-1.05-1.4-.85-.6.06-.6.06-.6.95.07 1.44.98 1.44.98.85 1.45 2.2 1.03 2.75.8.08-.62.33-1.03.6-1.27-2.1-.24-4.3-1.05-4.3-4.7 0-1.04.37-1.9.97-2.56-.1-.24-.42-1.2.1-2.5 0 0 .79-.25 2.6.98a9 9 0 0 1 4.72 0c1.8-1.23 2.59-.98 2.59-.98.52 1.3.2 2.26.1 2.5.6.66.96 1.52.96 2.56 0 3.66-2.2 4.46-4.3 4.7.34.3.64.86.64 1.74v2.58"/>',
    calendar:   '<rect x="3.6" y="5" width="16.8" height="15.4" rx="2.5"/><path d="M3.6 9.7h16.8"/><path d="M8 3.4v3.2M16 3.4v3.2"/>',
    globe:      '<circle cx="12" cy="12" r="8.3"/><path d="M3.8 12h16.4"/><path d="M12 3.7a13.4 13.4 0 0 1 0 16.6 13.4 13.4 0 0 1 0-16.6Z"/>',
    flame:      '<path d="M12 3.5c3.2 3.1 5.6 5.3 5.6 8.7a5.6 5.6 0 0 1-11.2 0c0-1.5.6-2.8 1.5-3.95.5 1 1.2 1.6 1.9 1.8-.6-2.4-.1-4.45 2.2-6.55Z"/>',
    gem:        '<path d="M6.6 4.2h10.8l3.4 4.6L12 20.6 1.2 8.8Z"/><path d="M1.2 8.8h21.6"/><path d="m8.9 4.2 3.1 4.6 3.1-4.6M12 20.6 8.9 8.8M12 20.6l3.1-11.8"/>',
    trending:   '<path d="M3.6 16.6 9 11.2l3.6 3.6 7.8-7.8"/><path d="M15.6 7h4.8v4.8"/>',
    folder:     '<path d="M3.6 6.6A1.8 1.8 0 0 1 5.4 4.8h3.5l2 2.4h7.7a1.8 1.8 0 0 1 1.8 1.8v7.6a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8Z"/>',
    cap:        '<path d="M12 4.2 21.4 8.6 12 13 2.6 8.6Z"/><path d="M6.5 10.6v4.5c0 1.4 2.46 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-4.5"/><path d="M21.4 8.6v5"/>',
    code:       '<path d="m9 8.3-4.3 3.7L9 15.7"/><path d="m15 8.3 4.3 3.7L15 15.7"/><path d="M13.3 5.5 10.7 18.5"/>',
    chart:      '<path d="M4.2 19.6h15.6"/><path d="M7.2 19.6v-8.4"/><path d="M12 19.6V5.4"/><path d="M16.8 19.6v-5.8"/>',
    toolbox:    '<rect x="3.4" y="8.4" width="17.2" height="10.2" rx="2.2"/><path d="M9.2 8.4V6.6A1.6 1.6 0 0 1 10.8 5h2.4a1.6 1.6 0 0 1 1.6 1.6v1.8"/><path d="M3.4 13h17.2"/><path d="M10.4 13v1.8h3.2V13"/>',
    news:       '<path d="M4 6.2A1.6 1.6 0 0 1 5.6 4.6h11a1.6 1.6 0 0 1 1.6 1.6v12.2a1.7 1.7 0 0 0 1.8 1.6H6.3A2.3 2.3 0 0 1 4 17.7Z"/><path d="M7.6 8.2h7.2M7.6 11.6h4.6M7.6 15h7.2"/>',
    leaf:       '<path d="M19.7 4.3c0 8.5-4.6 12.7-10.3 12.7-2 0-3.6-.6-4.8-1.6 1.4-6.4 6.6-10.5 15.1-11.1Z"/><path d="M4.6 19.7c1.7-4.5 4.5-7.7 8.7-9.9"/>',
    film:       '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4"/><path d="M8.2 4.6v14.8M15.8 4.6v14.8"/><path d="M3.4 12h17.2M3.4 8.4h4.8M3.4 15.6h4.8M15.8 8.4h4.8M15.8 15.6h4.8"/>',
    inbox:      '<path d="M3.6 12.9 6.3 5a1.6 1.6 0 0 1 1.5-1.1h8.4A1.6 1.6 0 0 1 17.7 5l2.7 7.9"/><path d="M3.6 12.9h4.3l1 2.2h6.2l1-2.2h4.3v5.3a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z"/>',
    warn:       '<path d="M12 4.3 20.5 19h-17Z"/><path d="M12 10v4"/><circle cx="12" cy="16.7" r="1" fill="currentColor" stroke="none"/>',
    dot:        '<circle cx="12" cy="12" r="3"/>',
    skeleton:   '<rect x="3.4" y="4.2" width="17.2" height="3.4" rx="1.7"/><rect x="3.4" y="10.3" width="12.6" height="3.4" rx="1.7"/><rect x="3.4" y="16.4" width="8.6" height="3.4" rx="1.7"/>',
    route:      '<circle cx="5.8" cy="6.4" r="2.3"/><circle cx="18.2" cy="17.6" r="2.3"/><path d="M8.1 6.4h5.4a3.4 3.4 0 0 1 0 6.8h-3a3.4 3.4 0 0 0 0 6.8h5.4"/>',
    image:      '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.5"/><circle cx="8.7" cy="9.7" r="1.6"/><path d="m4.6 17.6 4.4-4.2 3.3 3.1 2.9-2.7 4.2 4"/>',

    /* ---- 游戏 / 娱乐 / 交互 ---- */
    gamepad:   '<path d="M8.2 8.6h7.6a6 6 0 0 1 5.2 8.9 3 3 0 0 1-5.15.6L14 16.2h-4l-1.85 1.9a3 3 0 0 1-5.15-.6 6 6 0 0 1 5.2-8.9Z"/><path d="M8.2 8.6V7a2.4 2.4 0 0 1 2.4-2.4h2.8A2.4 2.4 0 0 1 15.8 7v1.6"/><path d="M2.4 12.6h4.2M4.5 10.5v4.2"/><circle cx="16.6" cy="11.4" r="1.05" fill="currentColor" stroke="none"/><circle cx="18.7" cy="13.6" r="1.05" fill="currentColor" stroke="none"/>',
    play:      '<circle cx="12" cy="12" r="8.3"/><path d="M10.2 8.9 15.4 12l-5.2 3.1Z"/>',
    trophy:    '<path d="M8 4.6h8v4.6a4 4 0 0 1-8 0Z"/><path d="M8 5.6H5.4v1.8a2.6 2.6 0 0 0 2.6 2.6M16 5.6h2.6v1.8a2.6 2.6 0 0 1-2.6 2.6"/><path d="M12 13.2v3.4"/><path d="M8.6 19.4h6.8l-.7-2.8H9.3Z"/>',
    keyboard:  '<rect x="2.4" y="6.4" width="19.2" height="11.2" rx="2.4"/><path d="M6.2 9.8h1.2M9.4 9.8h1.2M12.6 9.8h1.2M15.8 9.8h1.2M6.2 13h1.2M9.4 13h1.2M12.6 13h1.2M15.8 13h1.2"/><path d="M8.4 16.2h7.2"/>',
    download:  '<path d="M12 4.2v10.6"/><path d="m7.6 10.4 4.4 4.4 4.4-4.4"/><path d="M4.4 17.4v1.2a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-1.2"/>',
    eye:       '<path d="M2.6 12S5.9 6.4 12 6.4 21.4 12 21.4 12 18.1 17.6 12 17.6 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="2.9"/>',
    eyeOff:    '<path d="M4.2 4.2 19.8 19.8"/><path d="M9.5 9.6A2.9 2.9 0 0 0 12 14.9c.8 0 1.5-.32 2-.84"/><path d="M6.6 6.9A12.9 12.9 0 0 0 2.6 12s3.3 5.6 9.4 5.6c1.6 0 3-.4 4.2-1"/><path d="M9.9 6.7A9.4 9.4 0 0 1 12 6.4c6.1 0 9.4 5.6 9.4 5.6a16 16 0 0 1-2.8 3.3"/>',
    cloud:     '<path d="M7.2 18.4h9.6a4.2 4.2 0 0 0 .5-8.36 5.9 5.9 0 0 0-11.3 1.9A3.7 3.7 0 0 0 7.2 18.4Z"/>',

    /* ---- 站点标识 ----
       「方舟」二字画进同一个图形：方形帆 + 船身。
       纯色块拼装，没有细线，缩到 16px 也不会糊；
       favicon.svg 用的是同一套路径，改这里记得同步。 */
    arkMark:   '<rect x="6.2" y="3.2" width="2" height="12.6" rx="1" fill="currentColor" stroke="none"/><rect x="8.6" y="4.4" width="10.4" height="10.4" rx="1.8" fill="currentColor" stroke="none"/><path d="M2.6 15.8h18.8l-2.2 3.4a3.4 3.4 0 0 1-3 1.7H7.8a3.4 3.4 0 0 1-3-1.7Z" fill="currentColor" stroke="none"/>'
  };

  /* 别名：让调用方用更贴合语义的名字 */
  var ALIAS = {
    category: 'grid',
    history: 'clock',
    random: 'dice',
    theme: 'palette',
    external: 'link',
    close2: 'close',
    'view-card': 'grid',
    'view-list': 'list',
    'layout-grid': 'grid',
    'layout-dense': 'dense',
    'layout-masonry': 'masonry',
    changelog: 'book',
    about: 'info',
    favorites: 'star',
    filterbar: 'filter',
    back: 'left',
    shortcuts: 'keyboard',
    export: 'download',
    unvisited: 'eyeOff',
    visited: 'eye'
  };

  function pathOf(name) {
    var key = ALIAS[name] || name;
    return P[key] || P.dot;
  }

  /**
   * 生成图标 SVG 字符串
   * @param {string} name 图标名
   * @param {object} o { size, stroke, cls, title }
   */
  function svg(name, o) {
    o = o || {};
    var size = o.size || 18;
    var sw = o.stroke || 1.75;
    var cls = 'ico-svg' + (o.cls ? ' ' + o.cls : '');
    var a11y = o.title
      ? ' role="img" aria-label="' + o.title + '"'
      : ' aria-hidden="true" focusable="false"';
    return '<svg class="' + cls + '" viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-linejoin="round"' + a11y + '>' + pathOf(name) + '</svg>';
  }

  /**
   * 生成一个 <span class="ico"> 包裹的图标元素
   * @returns {Element}
   */
  function el(name, o) {
    var span = document.createElement('span');
    span.className = 'ico' + (o && o.cls ? ' ' + o.cls : '');
    span.innerHTML = svg(name, o);
    return span;
  }

  /** 图标名是否存在（含别名） */
  function has(name) { return !!(P[ALIAS[name] || name]); }

  /** 一份图标名清单，便于调试与文档展示 */
  function names() { return Object.keys(P); }

  /* ------------------------------------------------------------ 表情语义映射 */
  /**
   * 早期版本用 emoji 当图标，风格不统一且在不同系统上渲染差异很大。
   * 这里保留一张「表情 → 线性图标」的对照表，既能把旧文案里的表情自动升级成
   * SVG 图标，也能让 toast 之类的旧接口继续按 emoji 字符串传参。
   */
  var EMOJI_ICON = {
    '🔥': 'flame', '💎': 'gem', '🆕': 'wand', '📦': 'inbox', '🗂': 'folder',
    '🏷': 'tag', '🆓': 'check', '🌐': 'globe', '📜': 'book', '🧭': 'compass',
    '🔍': 'search', '🔎': 'search', '★': 'starFill', '☆': 'star', '🕘': 'clock',
    '📁': 'folder', '📂': 'folder', '🗑': 'trash', '🎲': 'dice', '✉': 'mail',
    '⧉': 'copy', '🐙': 'github', '⚡': 'zap', '✨': 'wand', '🧩': 'grid',
    '🎨': 'palette', '🧱': 'masonry', '📄': 'book', '📮': 'mail', '🧷': 'link',
    '🦴': 'masonry', '🔗': 'link', '⚠': 'warn', '⌂': 'home', '⌕': 'search',
    '◐': 'contrast', '☰': 'menu', '✕': 'close', '↑': 'top', '▦': 'grid',
    '▤': 'dense', '▥': 'masonry', '▣': 'grid', '💡': 'wand', '📝': 'book',
    '➕': 'plus', '💬': 'mail', '📅': 'calendar', '📊': 'trending',
    '🚀': 'zap', '🎯': 'compass', '⏳': 'clock', '🖼': 'grid', '🎬': 'grid',
    '🎵': 'grid', '🔖': 'star', '📌': 'star', '🕒': 'clock', '📈': 'trending'
  };

  /* 单个「表情字符」的判定：符号区段 + 代理对（星形平面） */
  var EMOJI_SINGLE = /^[\u2190-\u21FF\u2300-\u23FF\u25A0-\u27BF\u2900-\u29FF\u2B00-\u2BFF\u3030\u303D\u3297\u3299]$/;

  /** 截取字符串开头的表情簇（含变体选择符与零宽连接符），没有则返回空串 */
  function leadingEmoji(str) {
    var s = String(str == null ? '' : str);
    var i = 0;
    while (i < s.length && /\s/.test(s.charAt(i))) i++;
    var buf = '';
    while (i < s.length) {
      var ch = s.charAt(i);
      var one = ch;
      if (/[\uD800-\uDBFF]/.test(ch) && i + 1 < s.length && /[\uDC00-\uDFFF]/.test(s.charAt(i + 1))) {
        one = s.slice(i, i + 2);
      }
      var ok = EMOJI_SINGLE.test(one) || one === '\uFE0F' || one === '\u200D';
      if (!ok) break;
      buf += one;
      i += one.length;
    }
    return buf;
  }

  /** 表情 → 图标名；无法识别返回 null */
  function forEmoji(cluster) {
    var s = String(cluster || '').replace(/[\uFE0F\u200D]/g, '');
    if (!s) return null;
    var first = /^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(s) ? s.slice(0, 2) : s.slice(0, 1);
    return EMOJI_ICON[first] || EMOJI_ICON[cluster] || null;
  }

  /**
   * 把「🎲 随机推荐一条」这类带前缀表情的文案转成 [图标元素, 文本节点]。
   * 无法识别时原样保留文本，绝不会丢内容。
   */
  function label(str, opts) {
    var s = String(str == null ? '' : str);
    var em = leadingEmoji(s);
    var name = em ? forEmoji(em) : null;
    if (!name) return [document.createTextNode(s)];
    return [
      el(name, opts || { size: 16 }),
      document.createTextNode(s.slice(em.length))
    ];
  }

  /* ------------------------------------------------------------ 分类图标表 */
  /**
   * 十大分类各有专属线性图标。这张表只放在 JS 里，
   * 完全不改动 data/categories.json，保持「数据与表现分离」。
   */
  var CAT = {
    education:  'cap',
    coding:     'code',
    design:     'palette',
    office:     'chart',
    academic:   'book',
    tools:      'toolbox',
    news:       'news',
    life:       'leaf',
    media:      'film',
    opensource: 'github',
    game:       'gamepad'
  };

  /** 取分类图标名；表里没有时退化为「表情映射 → 文件夹图标」 */
  function catIcon(cat) {
    if (!cat) return 'folder';
    if (typeof cat === 'string') return CAT[cat] || 'folder';
    return CAT[cat.id] || forEmoji(cat.icon) || 'folder';
  }

  return {
    svg: svg, el: el, has: has, names: names, PATHS: P,
    leadingEmoji: leadingEmoji, forEmoji: forEmoji, label: label,
    catIcon: catIcon, CAT: CAT
  };
})();
