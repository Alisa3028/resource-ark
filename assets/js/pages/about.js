/* ==========================================================================
   pages/about.js —— 关于本站
   --------------------------------------------------------------------------
   项目说明、功能清单、目录规范、二次开发指引、作者署名。
   ========================================================================== */
Ark.pages = Ark.pages || {};

Ark.pages.about = function () {
  var U = Ark.utils;
  var I = Ark.icons;
  var content = document.getElementById('ark-content');
  var crumb = document.getElementById('ark-crumb');
  var site = Ark.data.getSite();
  var stats = Ark.data.getStats();

  Ark.breadcrumb.render(crumb, [{ text: '关于本站', icon: 'info' }]);

  var TREE = [
    'resource-hub/',
    '├─ index.html                     ★ 唯一页面外壳（SPA 单页应用）',
    '├─ 404.html                       找不到页面时的兜底页',
    '├─ pages/                         旧版分层页面 -> 现在只是重定向壳，兼容历史链接',
    '├─ assets/',
    '│   ├─ css/',
    '│   │   ├─ theme.css              设计令牌 + 7 套主题',
    '│   │   ├─ base.css               重置、排版、按钮、表单、徽标',
    '│   │   ├─ components.css         导航栏 / 卡片 / 筛选栏 / 分页 / 骨架屏 …',
    '│   │   ├─ layout.css             页面骨架、网格 / 瀑布流、响应式',
    '│   │   ├─ background.css         全局背景插画（模糊 / 视差 / 明暗自适应）',
    '│   │   └─ animations.css         关键帧、滚动淡入、路由转场',
    '│   ├─ js/',
    '│   │   ├─ core/',
    '│   │   │   ├─ config.js          全局配置、主题清单、localStorage 键名',
    '│   │   │   ├─ utils.js           DOM / 字符串 / 模糊匹配 / 剪贴板工具',
    '│   │   │   ├─ icons.js           内联 SVG 图标系统（含分类图标表）',
    '│   │   │   ├─ store.js           本地存储（主题 / 收藏 / 历史 / 偏好）',
    '│   │   │   ├─ theme.js           多主题系统与主题面板',
    '│   │   │   ├─ data.js            数据加载、筛选、排序、分页、相关推荐',
    '│   │   │   ├─ search.js          全局模糊搜索与高亮',
    '│   │   │   ├─ virtual.js         虚拟滚动（按行窗口化）与渐进渲染',
    '│   │   │   ├─ lazyload.js        图片懒加载、滚动淡入、视差',
    '│   │   │   └─ router.js          哈希路由（SPA 的核心）',
    '│   │   ├─ components/            导航栏、页脚、面包屑、卡片、筛选栏、结果区 …',
    '│   │   │   ├─ shortcuts.js       全局键盘快捷键与帮助面板',
    '│   │   │   └─ background.js      全局背景插画控制器（视差 / 明暗自适应）',
    '│   │   ├─ pages/                 每个路由一个模块：Ark.pages.xxx',
    '│   │   ├─ data-fallback.js       本地 file:// 直开时的数据兜底（自动生成）',
    '│   │   └─ main.js                SPA 启动器：路由分发 + 局部渲染',
    '│   └─ img/                       图标、背景插画等静态图片',
    '├─ data/                         ★ 所有资源数据都在这里',
    '│   ├─ categories.json           分类体系（11 大类 / 66 子类）',
    '│   ├─ shards/                   按大分类拆分的资源源文件（手工编辑入口）',
    '│   ├─ resources.json            构建产物：运行时资源全集',
    '│   ├─ tags.json / stats.json    构建产物：标签索引与统计',
    '│   ├─ quotes.json               每日一句',
    '│   ├─ changelog.json            更新日志',
    '│   └─ site.json                 站点信息（站点名、作者、反馈表单地址等）',
    '└─ tools/                       数据构建与验证脚本（Python）'
  ].join('\n');

  var FEATURES = [
    ['search',    '全局模糊搜索', '名称、用途、标签、分类、域名五路检索，多关键词 AND 组合，命中字符高亮。'],
    ['route',     'SPA 单页路由', '哈希路由多级跳转，只重绘内容区，滚动位置、面包屑与筛选状态都保留。'],
    ['grid',      '多级分类 + 多标签', '大分类 → 子分类 → 标签三层筛选，标签可多选，支持「全部满足 / 任一满足」。'],
    ['zap',       '虚拟滚动 + 分页', '每页 24 / 48 / 96 或「全部」；选「全部」时自动按行窗口化，只渲染视口内卡片。'],
    ['palette',   '多主题与自定义', '7 套内置主题（含 2 套深色）+ 自定义主色 + 圆角风格 + 动效开关，选择记在本地。'],
    ['image',     '全局背景插画', '黑白动漫少女插画做背景：高斯模糊 + 轻微视差，跟随深浅主题，惰性加载不抢带宽。'],
    ['masonry',   '网格 / 瀑布流 / 列表', '同一批数据可在三种布局与两种视图间任意切换，每个页面可独立记忆。'],
    ['wand',      '动效与视差', '路由转场、滚动淡入、Hero 视差与鼠标跟随光斑、卡片悬浮抬升，可一键关闭。'],
    ['clock',     '浏览历史与收藏', '基于 localStorage，刷新与关机都不丢失；收藏页支持页内搜索、分类筛选与清空。'],
    ['eye',       '已访问标记', '卡片会标记看过的资源，结果区可一键「只看未访问」，把没逛过的挑出来。'],
    ['keyboard',  '键盘快捷键', '按 / 直接搜索、? 查看全部快捷键，支持随机推荐、切换主题与回到顶部。'],
    ['dice',      '随机推荐 + 每日一句', '一键随机跳转到某条资源；页脚每日一句由日期决定，全站同一天同一句。'],
    ['book',      '数据与页面分离', '所有资源存放在独立 JSON，增删改资源只需编辑 JSON，不用碰任何 HTML 或 JS。'],
    ['skeleton',  '骨架屏与空状态', '数据加载与筛选切换时先铺骨架屏，避免白屏与布局跳动；空结果给出明确的下一步指引。']
  ];

  content.appendChild(U.el('section.wrap', { style: { paddingTop: '18px' } }, [
    U.el('div.detail-head.reveal', {}, [
      U.el('div.detail-head-row', {}, [
        U.el('div.detail-ico', {}, [I.el('arkMark', { size: 30 })]),
        U.el('div', { style: { flex: '1 1 300px' } }, [
          U.el('h1', { text: site.name || '资源方舟' }),
          U.el('p.muted', { style: { marginTop: '8px', maxWidth: '660px' },
            text: '一个纯前端静态资源导航库：无后端、无数据库、无构建步骤，下载下来双击就能用。' })
        ])
      ]),
      U.el('div.detail-head-meta', {}, [
        U.el('span.badge.badge-soft', { text: stats ? stats.total + ' 个站点' : '' }),
        U.el('span.badge.badge-soft', { text: stats ? stats.tagTotal + ' 个标签' : '' }),
        U.el('span.badge.badge-soft', { text: 'HTML + CSS + 原生 JS' }),
        U.el('span.badge.badge-soft', { text: '零依赖 · 零构建' })
      ])
    ])
  ]));

  /* 功能清单 */
  var fs = U.el('section.sec.wrap');
  fs.appendChild(Ark.ui.sectionHead('本站做了什么', '十四项核心能力，全部由原生技术实现', null, 'zap'));
  var fg = U.el('div.feat-grid');
  FEATURES.forEach(function (f, i) {
    fg.appendChild(U.el('div.feat.reveal', { 'data-d': String(i % 6 + 1) }, [
      U.el('div.i', {}, I.el(f[0], { size: 22 })),
      U.el('div.t', { text: f[1] }),
      U.el('div.d', { text: f[2] })
    ]));
  });
  fs.appendChild(fg);
  content.appendChild(fs);

  /* ---------------- 开发者信息：默认收起，不占首屏 ---------------- */
  var es = U.el('section.sec.wrap#extend');
  es.appendChild(Ark.ui.sectionHead('开发者信息', '目录结构、数据格式与二次开发说明，点开查看', null, 'code'));

  /** 折叠块：标题行 + 说明 + 展开内容 */
  function fold(icon, title, hint, body) {
    return U.el('details.fold', {}, [
      U.el('summary.fold-head', {}, [
        I.el(icon, { size: 16, cls: 'fold-i' }),
        U.el('span.fold-t', { text: title }),
        U.el('span.fold-hint', { text: hint }),
        I.el('down', { size: 15, cls: 'fold-arrow' })
      ]),
      U.el('div.fold-body', {}, body)
    ]);
  }

  var steps = [
    ['1', '打开 data/shards/ 目录', '每个大分类对应一个文件，例如 data/shards/coding.json。'],
    ['2', '往对应子分类里追加一条记录', '字段：id / name / url / desc / tags / cat / sub / hot / lang / free / added。'],
    ['3', '运行 python tools/build-data.py', '脚本会校验分类合法性、字段完整性与全局域名去重，并重新生成运行时数据。'],
    ['4', 'HTTP 环境无需构建', '部署后改完 JSON 刷新页面即可生效；只有本地 file:// 直开依赖兜底数据。'],
    ['5', '新增分类', '编辑 data/categories.json，再到 assets/js/core/icons.js 的 CAT 表里给新分类挑个图标。']
  ];

  es.appendChild(U.el('div.fold-list', {}, [
    fold('folder', '项目目录规范', '页面 / 样式 / 脚本 / 数据 / 静态资源分开存放', [
      U.el('pre.tree', { text: TREE })
    ]),

    fold('wand', '如何新增 / 修改资源', '只编辑 JSON，不用改任何页面代码', [
      U.el('div.feat-grid', {}, steps.map(function (s, i) {
        return U.el('div.feat.reveal', { 'data-d': String(i % 6 + 1) }, [
          U.el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' } }, [
            U.el('span.mini-ico', { text: s[0] }),
            U.el('div.t', { text: s[1] })
          ]),
          U.el('div.d', { text: s[2] })
        ]);
      })),
      U.el('h3', { style: { marginTop: '18px' }, text: '一条资源数据的完整结构' }),
      U.el('pre.tree', { style: { marginTop: '10px' }, text: [
        '{',
        '  "id": "coding-playground-01",          // 唯一编号：分类-子分类-序号',
        '  "name": "CodePen",                      // 站点名称',
        '  "url": "https://codepen.io/",           // 访问链接（必须 https）',
        '  "desc": "前端代码在线演示与分享社区…",     // 30-60 字用途描述',
        '  "tags": ["前端", "在线编辑", "社区"],      // 3-5 个标签，用于筛选与搜索',
        '  "cat": "coding",                        // 所属大分类',
        '  "sub": "playground",                    // 所属子分类',
        '  "hot": 1,                               // 0 普通 / 1 热门 / 2 小众宝藏',
        '  "lang": "en",                           // zh / en / multi',
        '  "free": "freemium",                     // free / freemium / paid',
        '  "added": "2025-04-18",                  // 收录日期',
        '  "ext": {}                               // 预留扩展位，随便加字段',
        '}'
      ].join('\n') })
    ]),

    fold('route', '新增一个页面（路由）', '三步加一条新的 SPA 路由', [
      U.el('ol.prose', {}, [
        U.el('li', { text: '在 assets/js/pages/ 下新建模块：Ark.pages.xxx = function(){ 往 #ark-content 里追加内容 }。' }),
        U.el('li', { text: '在 assets/js/core/router.js 的 ROUTES 表里登记路由名与路径段，例如 xxx: \'xxx\'。' }),
        U.el('li', { text: '把新模块的 <script> 加到 index.html 的页面模块列表里，即可通过 #/xxx 访问。' }),
        U.el('li', { text: '公共能力（数据、搜索、卡片、结果区、面包屑）直接复用，无需重复实现。' })
      ])
    ])
  ]));
  content.appendChild(es);

  /* 作者 */
  var as = U.el('section.sec.wrap');
  as.appendChild(Ark.ui.sectionHead('关于作者', '', null, 'star'));
  as.appendChild(U.el('div.panel.panel-pad', {}, [
    U.el('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } }, [
      U.el('div.detail-ico', { style: { width: '56px', height: '56px', fontSize: '1.5rem' } }, [U.el('span', { text: '忍' })]),
      U.el('div', {}, [
        U.el('div', { style: { fontWeight: '800', fontSize: '1.1rem' }, text: site.author || '我很能忍11' }),
        U.el('div.sm.muted', { text: '资源整理与站点开发' })
      ])
    ]),
    U.el('div.hr'),
    U.el('p.prose.sm', { text: '本站由「' + (site.author || '我很能忍11') + '」制作。资源来自公开互联网的人工筛选，链接指向各站点官方地址，本站不存储、不代理、不修改任何第三方内容。发现死链或描述有误，欢迎通过反馈页告知。' }),
    U.el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } }, [
      U.el('a.btn.btn-primary', { href: Ark.router.href('feedback') }, [I.el('mail', { size: 15 }), U.el('span', { text: '提交反馈' })]),
      U.el('a.btn.btn-soft', { href: Ark.router.href('changelog') }, [I.el('book', { size: 15 }), U.el('span', { text: '查看更新日志' })])
    ])
  ]));
  content.appendChild(as);

  Ark.lazy.scan(content);
};
