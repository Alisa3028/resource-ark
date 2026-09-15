# 资源方舟 ResourceArk

> 一站式优质网站资源导航库 · 纯前端单页应用 · 零后端 · 零数据库 · 零依赖 · 零构建

收录 **1446 个真实可用网站**，覆盖 **11 大分类 / 66 个子分类**，全部资源信息存放在独立 JSON 文件中，
页面代码与数据彻底分离 —— **新增、修改资源只需要编辑 JSON，不用改动任何 HTML**。

整个站点只有 `index.html` 一个页面外壳，其余全部由**哈希路由驱动局部渲染**：
切页不整页重载，面包屑 / 收藏 / 浏览历史 / 筛选状态全部保留。既可以直接部署到任意静态托管，
也可以双击本地 HTML 直接打开。

本站由 **「我很能忍11」** 制作。

---

## 一、快速开始

### 方式 1：本地直接打开（零配置）

双击 `index.html` 即可。

> 浏览器对 `file://` 协议有安全限制，禁止 `fetch` 本地 JSON，因此项目内置了一份由同一批 JSON
> 生成的兜底数据 `assets/js/data-fallback.js`，本地直开时自动降级使用它，功能完全一致。

### 方式 2：本地起一个静态服务器（推荐）

```bash
cd resource-hub
python -m http.server 8788
# 浏览器访问 http://127.0.0.1:8788
```

HTTP 环境下页面会直接读取 `data/*.json`，**改完 JSON 刷新页面即刻生效，不需要任何构建**。

### 方式 3：部署到静态托管

| 平台 | 操作 |
| --- | --- |
| **Vercel** | 导入仓库 → Framework Preset 选 `Other` → Build Command 留空 → Output Directory 填 `.` → 部署 |
| **GitHub Pages** | 仓库 Settings → Pages → Source 选 `GitHub Actions`，推送到 `main` 即自动发布（已内置 `.github/workflows/pages.yml`） |
| **Netlify / Cloudflare Pages** | 直接拖拽整个 `resource-hub` 文件夹上传，或连接仓库（无构建命令，发布目录填 `.`） |
| **任意静态服务器 / 对象存储** | 把整个目录原样上传即可，无需服务端 rewrite |

已内置 `.nojekyll`（GitHub Pages 必需）、`vercel.json`、`_headers`（缓存与安全响应头）。

---

## 二、目录结构

```
resource-hub/
├─ index.html                     ★ 唯一页面外壳（SPA）：导航 / 面包屑容器 / #ark-content / 页脚
├─ 404.html                       404 兜底页（提供 #/home、#/search 入口）
├─ pages/                         旧地址兼容壳（只做重定向，不含任何业务逻辑）
│   ├─ category.html              跳转到 #/category…
│   ├─ detail.html                跳转到 #/detail…
│   ├─ search.html                跳转到 #/search…
│   ├─ changelog.html / about.html / history.html / favorites.html / feedback.html / tags.html
├─ assets/
│   ├─ css/
│   │   ├─ theme.css              设计令牌与 7 套主题（含间距刻度 --sp-*、图标尺寸 --ico*）
│   │   ├─ base.css               重置、排版、按钮、表单、徽标、空状态、内联图标、防溢出保护
│   │   ├─ components.css         导航栏/搜索联想/页脚/面包屑/卡片/筛选栏/分页/骨架屏/提示条/返回顶部/主题面板/详情头
│   │   ├─ layout.css             页面骨架、网格/瀑布流/列表、各页专有布局、响应式断点
│   │   ├─ background.css         全局插画层（模糊 / 遮罩 / 深色反转 / 断点降级）
│   │   └─ animations.css         关键帧、滚动淡入、视差、SPA 路由转场
│   ├─ js/
│   │   ├─ core/
│   │   │   ├─ config.js          站点配置、主题清单、布局清单、存储键名、阈值
│   │   │   ├─ utils.js           DOM/字符串/数字/模糊匹配/剪贴板等工具（含哈希查询解析）
│   │   │   ├─ icons.js           ★ 内联 SVG 图标系统（60+ 图标 + 别名 + 表情映射 + 分类图标表）
│   │   │   ├─ store.js           localStorage 封装（偏好 / 历史 / 收藏 / 搜索词）
│   │   │   ├─ theme.js           主题系统与主题面板（切换后广播 ark:theme）
│   │   │   ├─ data.js            数据加载、索引、筛选、排序、分页、相关推荐
│   │   │   ├─ search.js          全局模糊搜索引擎 + 搜索联想
│   │   │   ├─ virtual.js         虚拟滚动（行窗口化）与渐进式渲染
│   │   │   ├─ lazyload.js        图片懒加载、滚动淡入、视差
│   │   │   └─ router.js          ★ 哈希 SPA 路由（href/parse/go/replace/滚动位置记忆）
│   │   ├─ components/            navbar / footer / breadcrumb / card / filterbar /
│   │   │                         results / pagination / skeleton / backtotop / toast / quote /
│   │   │                         background（全局插画控制器）/ shortcuts（键盘快捷键面板）
│   │   ├─ pages/                 home / category / detail / search / changelog /
│   │   │                         about / history / favorites / feedback / tags
│   │   ├─ data-fallback.js       构建产物：file:// 直开时的兜底数据
│   │   └─ main.js                站点启动器（事件总线 Ark.bus + UI 工具 + 路由分发）
│   └─ img/
│       ├─ favicon.svg            自绘站点标识：方形帆 + 船身（渐变圆角底，16px 仍清晰）
│       └─ bg-girl.webp           构建产物：透明底黑白线稿插画（720×1080，约 124 KB）
├─ data/                          ★ 所有资源数据都在这里
│   ├─ categories.json            分类体系（11 大类 / 66 子类）
│   ├─ shards/                    ★ 按大分类拆分的资源源文件 —— 手工编辑入口
│   ├─ resources.json             构建产物：运行时资源全集
│   ├─ tags.json / stats.json     构建产物：标签索引与统计快照
│   ├─ quotes.json                每日一句
│   ├─ changelog.json             更新日志
│   └─ site.json                  站点信息（站名、作者、邮箱、反馈表单地址、仓库地址）
├─ tools/                         Python 工具链
│   ├─ build-data.py              校验 + 合并 + 生成构建产物
│   ├─ build-changelog.py         生成更新日志
│   ├─ build-bg.py                背景插画预处理（去底 + 烘焙模糊 + 压缩为 WebP）
│   ├─ build-page-stubs.py        生成 pages/*.html 旧地址重定向壳
│   ├─ merge-topup.py             合并补充数据（可选）
│   ├─ verify.py                  ★ Playwright 全站回归（路由/交互/控制台/响应式）
│   ├─ audit-classes.py           ★ 类名覆盖率审计（JS 用到但 CSS 未定义）
│   └─ audit-layout.py            ★ 多断点横向溢出审计（14 路由 × 11 宽度）
├─ vercel.json / _headers / .nojekyll
└─ .github/workflows/pages.yml
```

### 路由表（哈希 SPA）

所有页面都由 `index.html` 一个外壳承载，切页只重绘 `#ark-content`，**不整页重载**：

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `#/` | 首页 | 视差 Hero + 分类导航 + 推荐分区 + 全站速览 |
| `#/category` | 分类总览 | 十一大分类入口 |
| `#/category?cat=education` | 分类二级 | 某大分类的子分类入口 + 结果区 |
| `#/category?cat=education&sub=courses` | 分类三级 | 子分类结果区 |
| `#/detail?id=xxx` | 资源详情 | 完整字段 + 相关推荐 + 上下条 |
| `#/search?q=&tags=&cat=&sort=&page=` | 搜索 / 筛选 | 支持多标签组合、排序、分页 |
| `#/tags?cat=&q=&all=1` | 标签云 | 标签按收录量分级展示，可领域限定 / 页内搜索 / 一键展开全量 |
| `#/changelog` `#/about` `#/history` `#/favorites` `#/feedback` | 其余页面 | 更新日志 / 关于 / 历史 / 收藏 / 反馈 |

**为什么用哈希而不是 History API**：本站要求「双击本地 HTML 也能完整运行」，
而 `file://` 协议下浏览器禁止 `pushState` / `replaceState` 改写路径。哈希路由在
HTTP 与 `file://` 两种环境下行为完全一致，静态托管也无需任何 rewrite 配置。
旧的 `pages/xxx.html` 地址会被自动重定向到对应哈希路由，历史外链不会失效。

---

## 三、核心功能

| # | 能力 | 实现要点 |
| --- | --- | --- |
| 1 | **全局模糊搜索** | 检索名称、描述、标签、分类名、子分类名、域名六路；多关键词 AND；子序列模糊匹配 + 字段权重 + 连续命中加成；命中字符高亮（含标签高亮与「命中分类」提示） |
| 2 | **多级分类 + 多标签筛选** | 大分类 → 子分类 → 标签三层，每层带实时数量；标签可多选，支持「全部满足 / 任一满足」切换 |
| 3 | **虚拟滚动 + 分页** | 每页 24 / 48 / 96 / 全部；条数超过阈值自动切换为按行窗口化的虚拟滚动（DOM 节点恒定在几十个），也可对网格/列表视图生效；瀑布流走渐进式渲染 |
| 4 | **外链新标签页 + 返回顶部** | 所有外链 `target="_blank" rel="noopener noreferrer"`；返回顶部按钮带整页滚动进度环 |
| 5 | **数据与页面分离** | 资源只存在于 `data/shards/*.json`，页面零硬编码 |
| 6 | **第三方反馈表单（无后端）** | 内置表单可一键生成邮件 / GitHub Issue / 复制内容；在 `data/site.json` 填 `feedbackEmbedUrl` 即自动 iframe 嵌入腾讯问卷、金数据、Formspree 等 |
| 7 | **骨架屏 + 加载动画** | 首屏、数据加载、筛选切换三处均有骨架屏；顶部加载进度条 |
| 8 | **更新日志** | `data/changelog.json` 驱动，10 个版本 154 条变更记录，新增/优化/修复/移除四类分色 |
| 9 | **多主题** | 7 套内置主题（晨曦白、深空黑、极光紫、森林绿、落日橘、赛博青、樱花粉）+ 自定义主色 + 圆角风格 + 动效开关，全部记忆在本地 |
| 10 | **多布局 / 多视图** | 网格、紧凑网格、瀑布流 × 卡片视图、列表视图，任意组合，选择被记住 |
| 11 | **动效体系** | 页面转场、滚动淡入（交错延迟）、Hero 视差 + 鼠标跟随光斑、卡片悬浮抬升、主题切换过渡；可在主题面板一键关闭 |
| 12 | **趣味小功能** | 随机推荐（可反复抽）、热度标记（热门/宝藏）、浏览历史（本地存储、独立管理页）、一键复制链接、每日一句彩蛋、收藏（本地存储） |
| 13 | **面包屑导航** | 首页 → 全部资源 → 大分类 → 子分类 → 资源名，五级可回溯；同时输出 JSON-LD 结构化数据 |
| 14 | **全响应式** | 手机（≤420px 单列）、平板、桌面四档断点，移动端抽屉菜单 + 底部保护区域适配 |
| 15 | **SPA 单页路由** | 哈希路由 + 局部渲染，10 个页面共用 `index.html` 外壳；面包屑 / 收藏 / 历史 / 筛选状态在切页时全部保留；返回时按页面恢复滚动位置；旧 `.html` 地址自动重定向 |
| 16 | **内联 SVG 图标系统** | `core/icons.js` 内置 60+ 手绘线性图标，零第三方依赖、零额外请求；全部跟随 `currentColor`；并把旧文案里的 emoji（🎲 / ⚡ / 🔥…）自动升级为同语义线性图标 |
| 17 | **全局背景插画** | 黑白动漫少女线稿（透明底 WebP，约 124 KB）：固定全屏 + 高斯模糊 + 径向遮罩 + 滚动/鼠标视差；深色主题自动 `invert` 反转成浅色线条；首屏后惰性加载，加载失败静默降级 |
| 18 | **增强收藏页** | 页内关键词搜索（带命中高亮）、按大分类过滤（只列出收藏里真实存在的分类）、排序 / 视图 / 布局切换、单条取消、一键清空；**支持导出 Markdown 清单 / JSON 备份与导入还原**；导航角标实时联动 |
| 19 | **标签云** | `#/tags` 把 1800+ 个标签按收录量分 6 档字号展示；阈值随范围自适应（全站 ≥3 次 / 领域内 ≥2 次），支持领域限定、页内即时搜索与一键展开全量；点任意标签直达筛选结果 |
| 20 | **键盘快捷键** | 单键 `r` 随机 / `t` 换主题 / `g` 回顶 / `h` 回首页 / `/` 聚焦搜索 / `?` 唤起键位面板，`Esc` 逐层关闭浮层，`Ctrl+K` 聚焦搜索；输入态自动让路，顶栏与抽屉均有入口 |
| 21 | **已访问标记** | 浏览过的资源卡片加弱化态与眼形角标；`Ark.store.seen()` 维护已读集合，历史增删时统一失效并广播 `ark:visitchange` |
| 22 | **结果区快捷筛选** | 结果区顶部一行「全部 / 未访问 / 已收藏 / 免费」快捷按钮，叠加在分类与标签筛选之上；空结果时提示「切回全部即可看到这 N 条」，与分页、排序、视图互不干扰 |
| 23 | **自绘站点标识** | `arkMark` 图标：**方形帆 + 船身**，把「方」「舟」两个字画进同一个图形；纯色块拼装、无细描边，16px 标签页图标也不糊。favicon、顶栏 Logo、页脚与关于页共用同一套路径（`core/icons.js` 的 `arkMark` 与 `assets/img/favicon.svg` 需同步改） |
| 24 | **数据可信** | 构建脚本**不生成任何编造字段**——页面上每个数字都能在 `data/shards/` 里核对；排序与推荐全部基于人工标记（`hot`）、收录日期（`added`）、标签重合度等真实字段 |
| 25 | **筛选栏可收起** | 三层筛选铺开时能占掉整屏，所以**展开态不吸顶**（随页面正常滚走，不会盖住结果），滚出视野后自动收成一行吸顶小条「当前条件 + 筛选」；点一下即展开并把筛选区带回视野顶部。高度超过七成屏幕时默认收起。切换时反向补偿滚动位置 + 临时关闭浏览器滚动锚定，正在看的内容位移 0px |

---

## 四、数据规范

### 4.1 一条资源

```json
{
  "id": "coding-playground-01",
  "name": "CodePen",
  "url": "https://codepen.io/",
  "desc": "前端代码在线演示与分享社区，支持 HTML/CSS/JS 实时预览。",
  "tags": ["前端", "在线编辑", "社区"],
  "cat": "coding",
  "sub": "playground",
  "hot": 1,
  "lang": "en",
  "free": "freemium",
  "added": "2025-04-18"
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 唯一编号，建议 `分类-子分类-序号` |
| `name` | string | 站点名称 |
| `url` | string | 访问链接，必须 `https://`，不带跟踪参数 |
| `desc` | string | 30–60 字用途描述 |
| `tags` | string[] | 3–5 个标签，参与筛选与搜索 |
| `cat` / `sub` | string | 所属大分类 / 子分类，必须存在于 `categories.json` |
| `hot` | number | `0` 普通 / `1` 热门 / `2` 小众宝藏 |
| `lang` | string | `zh` / `en` / `multi` |
| `free` | string | `free` / `freemium` / `paid` |
| `added` | string | 收录日期 `YYYY-MM-DD` |

构建脚本只补全**缺失的默认值**（`hot` / `lang` / `free` / `added`），
**不会生成任何编造数据** —— 页面上的每一个数字都必须能在 `data/shards/` 里找到出处。

> **关于「数据可信」的一条硬规矩**：早期版本曾用脚本按 id 伪随机生成 `views`（浏览量）、
> `rating`（评分）、`platform`（支持平台）、`featured`（是否精选）四个展示字段，
> 并据此做了「评分最高」排序与首页榜单。这些数字**与真实站点毫无关系，属于编造数据**，
> 已于 2026-09-15 整体移除：排序改为基于 `hot`（人工标记）、`added`（收录日期）等真实字段，
> 相关推荐按标签重合度计算。若将来要展示真实统计量，请接入外部接口，
> **不要再用脚本"造"一个出来**。

### 4.2 新增 / 修改资源（三步）

```bash
# 1. 编辑对应大分类的分片文件，例如往「编程开发」加一条
vim data/shards/coding.json

# 2. 重新构建（会做完整校验：分类合法性、字段完整性、全局域名去重）
python tools/build-data.py

# 3. 完成
#    HTTP 部署环境：改完 JSON 就已生效，构建只是为了同步 tags/stats 与本地兜底数据
```

新建分类时，编辑 `data/categories.json` 增加大分类与子分类，再跑一次构建脚本 ——
页面会自动多出一个分类卡片与独立的子页面，**不需要改任何 HTML / JS**。

### 4.3 数据规模快照

| 分类 | 数量 | 分类 | 数量 |
| --- | --- | --- | --- |
| 学习教育 | 142 | 工具转换 | 148 |
| 编程开发 | 120 | 资讯数据 | 130 |
| 设计素材 | 120 | 生活实用 | 131 |
| 办公效率 | 134 | 影音素材 | 135 |
| 文献学术 | 120 | 开源工具 | 146 |
| 游戏娱乐 | 120 | **合计** | **1446** |

标签总数 1852 个 · 热门 459 个 · 小众宝藏 247 个 · 完全免费 1026 个。

---

## 五、二次开发

### 新增一个页面（SPA 路由）

1. 在 `assets/js/pages/` 新建模块：`Ark.pages.xxx = function () { ... }`，
   内部只负责往 `#ark-content` 里追加内容（面包屑用 `Ark.breadcrumb.render`）；
2. 在 `assets/js/core/router.js` 的 `ROUTES` 里加一行 `xxx: 'xxx'`（值为哈希路径段）；
3. 在 `index.html` 脚本列表末尾引入新模块（必须在 `main.js` **之前**）；
4. 如果要放进顶栏，在 `assets/js/components/navbar.js` 的 `navItems()` 里加一项
   （带 `icon` 字段即自动渲染 SVG 图标与高亮态）；
5. 想让 `pages/xxx.html` 这类旧地址也能落到新页面，在 `tools/build-page-stubs.py`
   的 `MAP` 里加一行并重跑该脚本，同时给 `router.js` 的 `LEGACY` 补一条映射；
6. 最后跑一遍 `tools/verify.py` 与 `tools/audit-layout.py`（记得把新路由加进两个脚本的路由清单）。

生成站内链接一律走 `Ark.router.href('xxx', { id: 1 })`，跳转走 `Ark.router.go(href)`；
页面内部筛选只改地址栏时用 `Ark.router.replace(href)`（不触发重绘，输入焦点不丢）。

⚠️ **新增样式后务必跑一次 `tools/audit-classes.py`**：SPA 下大量类名是拼在 JS 字符串里
生成的，写错不会报错，只会静默没有样式。

### 换一张背景插画

1. 把原图（建议黑白线稿、白底、人物占比大）放到 `tools/_src/bg-girl-source.png`；
2. 运行 `python tools/build-bg.py` —— 它会自动做「亮度 → 透明度」去底、中值滤波、
   烘焙高斯模糊、降采样到 720px 宽并压缩为 WebP，输出 `assets/img/bg-girl.webp`；
3. 想调存在感（透明度 / 模糊半径 / 位置 / 断点降级），改 `assets/css/background.css`
   顶部的 `--bg-op` / `--bg-blur` / `--bg-scale` 即可，无需碰 JS。

### 换一个站点信息

编辑 `data/site.json`：站点名、副标题、作者署名、邮箱、GitHub 仓库、第三方反馈表单地址、备案号。
页脚的「本站由 … 制作」会自动跟随 `author` 字段。

### 换一套配色

编辑 `assets/css/theme.css`，在 `:root` 之后复制一个 `[data-theme="你的id"]` 区块改掉变量，
再到 `assets/js/core/config.js` 的 `themes` 数组里加一项（带 `scheme: 'dark'` 即自动
启用深色适配，背景插画也会跟着反转），主题面板会自动出现新色块。

### 用图标

```js
Ark.icons.svg('star', { size: 18 })              // → SVG 字符串，可拼进 innerHTML
Ark.icons.el('search', { size: 16, cls: 'nav-i' }) // → <span class="ico"><svg …/></span>
Ark.icons.label('🎲 随机推荐一条')                // → [图标元素, 文本节点]，自动把 emoji 升级成线性图标
Ark.icons.catIcon(cat)                            // → 该分类的专属图标名
Ark.icons.has('flame')                            // → 图标是否存在（含别名）
```

新增图标只需在 `core/icons.js` 的 `P` 字典里加一条 `24×24` 视窗下的路径；
想让旧名字指向新图标，加到 `ALIAS` 即可（不会影响已有调用）。

### 换一个站点标识

站点标识有两处实现，**改的时候必须一起改**：

1. `core/icons.js` 的 `arkMark` —— 24×24 网格，纯色块（`fill="currentColor"`），
   顶栏 Logo、页脚 Logo、关于页图标都用它，跟随主题变色；
2. `assets/img/favicon.svg` —— 同一套路径，外面套一层 64×64 的渐变圆角底。

设计约束：**只用色块，不用细描边**；保证 16px 标签页尺寸下仍然认得出形状。

### 回归测试

三个脚本各有分工，建议改完 UI 后依次跑一遍。前两个不需要浏览器，第三个需要：

```bash
# 1) 类名覆盖率：找出「JS/HTML 用到但 CSS 没定义」的类名（写错字母不会报错，只会静默失效）
python tools/audit-classes.py

# 2) 全站回归：314 项元素检查 + 交互测试，覆盖 SPA 路由、虚拟滚动、快捷筛选、
#    标签云、键盘快捷键、收藏导出、筛选栏收起、背景插画、主题切换、移动端抽屉等（需要先起静态服务器）
pip install playwright && playwright install chromium
python -m http.server 8788 --bind 127.0.0.1 &
python tools/verify.py

# 3) 多断点横向溢出：14 条路由 × 14 档宽度（360 → 1920），出现横向滚动条即失败
python tools/audit-layout.py
```

截图会输出到 `_shots/`，便于肉眼复核。`verify.py` 会统计控制台错误，
**要求 0 报错**（第三方站点 favicon 的网络失败已单独豁免）。

---

## 六、性能与兼容

- **虚拟滚动**：1446 条数据在「全部」模式下，DOM 中常驻卡片节点始终只有 20–50 个
- **图片懒加载**：站点图标通过 `IntersectionObserver` 按需请求，取不到 favicon 时自动退回字母方块
- **首屏防闪白**：主题在 `<head>` 内联脚本中同步应用，无 JS 也能显示正确底色
- **SPA 局部渲染**：10 个页面共用一个外壳，切页只重绘 `#ark-content`；常驻的导航栏、
  搜索框内容、主题面板都不会被销毁重建
- **图标零成本**：全部图标内联为 SVG，无字体、无雪碧图、无额外请求，不会出现「方块」闪烁
- **背景插画**：透明底 WebP 约 124 KB，首屏内容稳定后由 `requestIdleCallback` 惰性加载，
  视差全部走 `requestAnimationFrame` 合并，滚动时几乎无额外开销
- **CSS 隔离**：卡片启用 `contain: layout style paint`，减少重排范围
- **零运行时依赖**：不使用任何框架与 CDN，全部原生 HTML / CSS / JS
- **兼容**：Chrome / Edge / Firefox / Safari 近三年版本；`color-mix()`、`:has()` 等新特性降级后仅损失少量视觉细节

---

## 七、版权与免责声明

- 本站为**资源导航类站点**，所有链接均指向第三方站点的官方地址，本站**不存储、不代理、不镜像、不修改**任何第三方内容。
- 资源信息由人工整理，仅用于学习与工作效率提升；如你是某站点站长并希望调整收录信息或要求下架，请通过反馈页联系。
- 本站不收录盗版资源、破解软件、成人内容及任何违法违规站点。
- 站点代码与数据结构由 **「我很能忍11」** 制作，可自由用于学习与二次开发。

---

<p align="center"><strong>本站由「我很能忍11」制作</strong></p>
