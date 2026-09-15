/* ==========================================================================
   core/config.js —— 全局配置与路径解析
   --------------------------------------------------------------------------
   全局命名空间约定：所有模块都挂在 window.Ark 下（不使用 ES Module），
   这样以 file:// 直接双击打开页面时也不会被浏览器的模块 CORS 策略拦住。
   ========================================================================== */
window.Ark = window.Ark || {};

Ark.config = (function () {
  // 判断当前页面所在层级：pages/ 下的页面需要回退一级才能访问站根资源
  var inPages = /\/pages\//.test(location.pathname);
  var ROOT = inPages ? '../' : './';

  return {
    /** 站点根目录的相对前缀（根页面为 './'，pages/ 下为 '../'） */
    ROOT: ROOT,

    /** 站点元信息（会被 data/site.json 覆盖） */
    site: {
      name: '资源方舟',
      enName: 'ResourceArk',
      slogan: '一站式优质网站资源导航库',
      author: '我很能忍11',
      icp: '',
      repo: 'https://github.com/',
      email: 'feedback@example.com',
      feedbackEmbedUrl: '',   // 第三方反馈表单地址（腾讯问卷/金数据/Formspree 等），留空则用内置表单
      analytics: ''           // 可粘贴第三方统计脚本地址
    },

    /** 主题清单：id 与 theme.css 中的 [data-theme] 对应 */
    themes: [
      { id: 'light',  name: '晨曦白', grad: 'linear-gradient(135deg,#ffe9f5,#e8ecff 45%,#d8f3ff)', scheme: 'light' },
      { id: 'dark',   name: '深空黑', grad: 'linear-gradient(135deg,#0b1020,#1b2340 55%,#3b1d52)', scheme: 'dark' },
      { id: 'aurora', name: '极光紫', grad: 'linear-gradient(135deg,#7c3aed,#4f46e5 50%,#06b6d4)', scheme: 'light' },
      { id: 'forest', name: '森林绿', grad: 'linear-gradient(135deg,#0f9d58,#22c55e 50%,#a3e635)', scheme: 'light' },
      { id: 'sunset', name: '落日橘', grad: 'linear-gradient(135deg,#f97316,#f43f5e 50%,#ec4899)', scheme: 'light' },
      { id: 'cyber',  name: '赛博青', grad: 'linear-gradient(135deg,#04141a,#0a1f2e 50%,#22d3ee)', scheme: 'dark' },
      { id: 'sakura', name: '樱花粉', grad: 'linear-gradient(135deg,#f9a8d4,#ec4899 50%,#8b5cf6)', scheme: 'light' }
    ],

    /** 每页条数档位；'all' 表示不限条数并启用虚拟滚动 */
    pageSizes: [24, 48, 96, 'all'],

    /** 布局：网格 / 紧凑网格 / 瀑布流 —— 页面可自由混用（icon 对应 core/icons.js 的图标名） */
    layouts: [
      { id: 'grid',    name: '网格',   ico: '▦', icon: 'grid' },
      { id: 'dense',   name: '紧凑',   ico: '▤', icon: 'dense' },
      { id: 'masonry', name: '瀑布流', ico: '▥', icon: 'masonry' }
    ],

    /** 视图：卡片 / 列表 */
    views: [
      { id: 'card', name: '卡片', ico: '▣', icon: 'grid' },
      { id: 'list', name: '列表', ico: '☰', icon: 'list' }
    ],

    /** 排序方式（全部基于数据里真实存在的字段） */
    sorts: [
      { id: 'default', name: '综合排序' },
      { id: 'hot',     name: '热度优先' },
      { id: 'new',     name: '最新收录' },
      { id: 'name',    name: '名称排序' }
    ],

    /** 热度标记 */
    hotMap: { 1: { cls: 'badge-hot', text: '热门' }, 2: { cls: 'badge-gem', text: '宝藏' } },

    /** localStorage 键名（统一前缀，避免与同域其它站点冲突） */
    KEY: {
      theme: 'ark.theme',
      accent: 'ark.accent',
      radius: 'ark.radius',
      motion: 'ark.motion',
      view: 'ark.view',
      layout: 'ark.layout',
      pageSize: 'ark.pageSize',
      history: 'ark.history',
      favorites: 'ark.favorites',
      seenQuote: 'ark.quote',
      visited: 'ark.visited',
      keyword: 'ark.recentSearch'
    },

    /** 单页最多保留的浏览历史条数 */
    historyMax: 60,
    /** 首页/详情页推荐条数 */
    relatedCount: 8,
    /** 超过该数量时启用虚拟滚动（低于则直接全量渲染以获得更好的动画效果） */
    virtualThreshold: 80
  };
})();

/** 拼接站内相对路径：Ark.path('data/resources.json') */
Ark.path = function (p) {
  return Ark.config.ROOT + String(p).replace(/^\.?\//, '');
};
