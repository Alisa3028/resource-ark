# -*- coding: utf-8 -*-
"""全站自动化验证（SPA 哈希路由版）
------------------------------------------------------------------------------
覆盖三类检查：
  1. 路由可用性：用真实哈希地址逐个进入 9 个页面，校验关键元素是否渲染
  2. 控制台洁净：每个路由下 console.error / pageerror 必须为 0
  3. 交互与不变量：
     · 站内跳转不整页重载（window 上的自定义标记必须存活）
     · 前进/后退后状态与滚动位置保留
     · 虚拟滚动、分页、视图/布局切换、搜索高亮、收藏联动
     · 背景插画、图标系统、移动端抽屉、主题切换
     · 旧 .html 地址自动重定向到新哈希路由

运行前先起静态服务：
  python -m http.server 8788 --bind 127.0.0.1
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8788"
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "_shots")
os.makedirs(OUT, exist_ok=True)

# (名称, 哈希路由, 期望的关键断言回调名)
ROUTES = [
    ("home",            "#/"),
    ("category-all",    "#/category"),
    ("category-edu",    "#/category?cat=education"),
    ("category-sub",    "#/category?cat=education&sub=courses"),
    ("category-game",   "#/category?cat=game"),
    ("search",          "#/search"),
    ("search-q",        "#/search?q=%E8%A7%86%E9%A2%91"),
    ("search-tags",     "#/search?tags=%E5%85%8D%E8%B4%B9,%E4%B8%AD%E6%96%87"),
    ("tags",            "#/tags"),
    ("tags-cat",        "#/tags?cat=design"),
    ("detail",          "#/detail?id=education-courses-01"),
    ("detail-game",     "#/detail?id=game-platform-01"),
    ("changelog",       "#/changelog"),
    ("about",           "#/about"),
    ("history",         "#/history"),
    ("favorites",       "#/favorites"),
    ("feedback",        "#/feedback"),
    ("legacy-redirect", "#/home"),
]

report = []
errors = []


def check(page, name, label, sel, expect_min=1):
    try:
        n = page.locator(sel).count()
    except Exception:
        n = -1
    ok = n >= expect_min
    report.append((name, label, n, ok))
    if not ok:
        errors.append("[%s] %s 期望>=%d 实际=%s (%s)" % (name, label, expect_min, n, sel))
    return ok


def check_eq(name, label, got, want):
    ok = got == want
    report.append((name, label, got, ok))
    if not ok:
        errors.append("[%s] %s 期望 %r 实际 %r" % (name, label, want, got))
    return ok


def check_true(name, label, cond, detail=""):
    ok = bool(cond)
    report.append((name, label, ok, ok))
    if not ok:
        errors.append("[%s] %s %s" % (name, label, detail))
    return ok


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 950}, device_scale_factor=1,
                                  accept_downloads=True)
        page = ctx.new_page()

        console_errors = []

        def on_console(m):
            if m.type != "error":
                return
            t = m.text
            # 第三方站点 favicon 的加载失败属于网络层提示，站点已用 onerror 兜底
            if "Failed to load resource" in t or "favicon" in t:
                return
            if "net::ERR" in t or "ERR_NAME_NOT_RESOLVED" in t:
                return
            console_errors.append(t)

        page.on("console", on_console)
        page.on("pageerror", lambda e: console_errors.append("PAGEERROR: " + str(e)))

        # ================= 1. 逐路由渲染 + 控制台洁净 =================
        print("===== 1. 路由渲染检查 =====")
        for name, hash_ in ROUTES:
            console_errors.clear()
            if name == "legacy-redirect":
                # 旧地址 -> 新哈希路由：pages/category.html?cat=education
                page.goto(BASE + "/pages/category.html?cat=education", wait_until="load", timeout=30000)
                page.wait_for_timeout(1800)
                url = page.url
                check_true(name, "旧地址重定向", "#/category?cat=education" in url, url)
                # 带 cat 参数进的是「某个大分类的子分类视图」，卡片数等于该分类的子分类数
                check(page, name, "重定向后子分类卡", ".cat-grid .cat-card", 5)
                check(page, name, "重定向后面包屑", "#ark-crumb .crumb-item", 3)
                page.screenshot(path=os.path.join(OUT, "legacy-redirect.png"))
                if console_errors:
                    errors.append("[%s] 控制台错误: %s" % (name, console_errors[:3]))
                continue

            try:
                page.goto(BASE + "/index.html" + hash_, wait_until="load", timeout=30000)
                page.wait_for_timeout(1700)
            except Exception as e:
                errors.append("[%s] 打开失败: %s" % (name, e))
                continue

            # 每个路由都应在的常驻组件
            check(page, name, "导航栏", "#ark-nav .logo-text")
            check(page, name, "页脚署名", "#ark-footer .made-by")
            check(page, name, "主题面板", "#ark-theme-pop .theme-swatch", 7)
            check(page, name, "返回顶部按钮", ".totop")
            check(page, name, "每日一句", ".quote .q-text")
            check(page, name, "内联 SVG 图标", "svg.ico-svg", 20)
            # 站点标识：顶栏与页脚都应是自绘的「方帆 + 船身」矢量标记，而不是一个「舟」字
            check(page, name, "顶栏站点标识", "#ark-nav .logo-mark svg")
            check(page, name, "页脚站点标识", "#ark-footer .logo-mark svg")

            # 顶栏导航必须一行显示。中文的最小内容宽度只有「一个字」，
            # 早年漏写 white-space: nowrap 时「资源分类」会被压成两字一排竖着码。
            nav_h = page.evaluate(
                "() => [...document.querySelectorAll('#ark-nav .nav-link')]"
                ".map(e => Math.round(e.getBoundingClientRect().height))")
            check_true(name, "顶栏导航各项都是一行（没被压成两字一排）",
                       bool(nav_h) and max(nav_h) <= 44,
                       "各项高度 %s（单行约 34px，折成两行会 >44px）" % str(nav_h))

            if name == "home":
                check(page, name, "Hero 标题", ".hero h1")
                check(page, name, "Hero 主操作区", ".hero-cta .btn", 3)
                check(page, name, "分类卡片", ".cat-grid .cat-card", 11)
                check(page, name, "统计卡图标", ".stat .stat-ico", 4)
                check(page, name, "推荐卡片", ".grid-cards .card, .masonry .card", 12)

            if name.startswith("category"):
                check(page, name, "面包屑", "#ark-crumb .crumb-item", 2)
                if name == "category-all":
                    check(page, name, "分类卡片", ".cat-grid .cat-card", 11)
                elif name == "category-game":
                    # 新增的「游戏娱乐」分类：6 个子分类快捷卡 + 结果区
                    check(page, name, "游戏分类子分类卡", ".cat-grid .cat-card", 6)
                    check(page, name, "游戏分类结果卡", ".results .card", 6)
                    check(page, name, "游戏分类快捷筛选", ".quick-bar .quick-btn", 4)
                else:
                    check(page, name, "筛选栏", ".filterbar .tag", 5)
                    check(page, name, "筛选栏标签", ".filterbar .check", 5)
                    check(page, name, "资源卡片", ".results .card", 6)

            if name.startswith("search"):
                check(page, name, "搜索框", ".panel input[type=search]")
                check(page, name, "结果统计", "#ark-content .count-badge")
                check(page, name, "筛选栏", ".filterbar .tag", 5)
                # 「评分最高」档位已随编造的评分字段一起下线
                check_true(name, "排序里不再有「评分最高」",
                           "评分最高" not in page.locator("#ark-content").inner_text(), "仍能找到旧排序档位")

            if name.startswith("tags"):
                if name == "tags-cat":
                    # 限定领域后阈值下调一档（>=2），条目数天然少于全站视图
                    check(page, name, "标签云条目", ".tagcloud-item", 15)
                    counts = [int(x) for x in page.locator(".tagcloud-item .tc-n").all_inner_texts()]
                    check_true(name, "分类限定后标签计数都 >0",
                               bool(counts) and all(c > 0 for c in counts),
                               "出现 0 计数的标签：" + str([c for c in counts if c <= 0][:5]))
                else:
                    check(page, name, "标签云条目", ".tagcloud-item", 40)
                check(page, name, "标签云分类筛选", ".tag-cat", 12)
                check(page, name, "标签云搜索框", ".panel input[type=search]")
                check(page, name, "标签云计数", ".panel .count-badge")

            if name.startswith("detail"):
                check(page, name, "资源标题", ".detail-head h1")
                check(page, name, "详情头图标", ".detail-ico svg")
                check(page, name, "详情徽标行", ".detail-badges .badge", 2)
                check(page, name, "主操作区", ".detail-cta .btn", 4)
                check(page, name, "数据胶囊", ".detail-chips .chip", 3)
                check(page, name, "标签行", ".detail-tags .tag", 2)
                check(page, name, "访问按钮", 'a[target="_blank"]', 1)
                check(page, name, "信息表", ".kv dt", 4)
                # 曾经展示的「综合评分 / 累计访问量 / 支持平台 / 更新日期」都是构建期伪随机生成的，
                # 已整体删除；这里断言它们不会悄悄回来
                _dtext = page.locator("#ark-content").inner_text()
                for _bad in ("次访问", "综合评分", "支持平台"):
                    check_true(name, "详情页不含编造字段「%s」" % _bad,
                               _bad not in _dtext, "页面上仍出现「%s」" % _bad)
                check(page, name, "相关推荐", ".grid-cards .card, .masonry .card", 4)
                if name == "detail-game":
                    check(page, name, "游戏资源分类徽标", ".badge", 2)

            if name == "changelog":
                check(page, name, "时间线节点", ".timeline .tl-item", 10)
                check(page, name, "时间线分组标", ".tl-gt", 3)

            if name == "about":
                check(page, name, "特性卡", ".feat-grid .feat", 10)
                # 开发者文档已折叠：目录树仍在 DOM 里，但默认不可见
                check(page, name, "折叠面板", ".fold-list .fold", 3)
                check_true(name, "目录树默认收起", not page.locator("pre.tree").first.is_visible(),
                           "pre.tree 初始就是可见的，折叠没生效")

            if name == "feedback":
                check(page, name, "反馈类型", ".fb-type button", 5)
                check(page, name, "文本域", "textarea")

            if name == "favorites":
                check(page, name, "页内搜索框", ".fav-tools input[type=search]")
                check(page, name, "分类筛选行", ".fav-tools .filter-row")
                check(page, name, "工具条按钮", ".fav-tools-row .btn", 3)
                check(page, name, "导出/导入入口", ".fav-tools-row .btn", 3)

            if name == "history":
                check(page, name, "页头图标", ".detail-ico svg")

            page.screenshot(path=os.path.join(OUT, name + ".png"), full_page=False)

            if console_errors:
                errors.append("[%s] 控制台错误: %s" % (name, console_errors[:3]))

        # ---- 404 兜底页（纯静态，不依赖任何数据） ----
        console_errors.clear()
        page.goto(BASE + "/404.html", wait_until="load", timeout=30000)
        page.wait_for_timeout(700)
        check(page, "404", "404 提示图标", ".empty .ico svg")
        check(page, "404", "404 主文案", ".empty-t")
        check(page, "404", "404 返回入口", ".empty-actions .btn", 2)
        check(page, "404", "署名", "body")
        page.screenshot(path=os.path.join(OUT, "404.png"))
        if console_errors:
            errors.append("[404] 控制台错误: %s" % (console_errors[:3],))

        # ================= 2. SPA 不整页重载 =================
        print("\n===== 2. SPA 局部渲染检查 =====")
        console_errors.clear()
        page.goto(BASE + "/index.html#/", wait_until="load")
        page.wait_for_timeout(1700)

        # 在 window 上打标记：若发生整页重载，标记会消失
        page.evaluate("window.__arkSpaMark = 'alive'; window.__arkRenderCount = 0;")
        page.evaluate("""
            (function () {
              var host = document.getElementById('ark-content');
              new MutationObserver(function () { window.__arkRenderCount++; })
                .observe(host, { childList: true });
            })();
        """)

        # 用导航链接做一串站内跳转
        page.click("#ark-nav .nav-link[data-nav='category']")
        page.wait_for_timeout(900)
        mark1 = page.evaluate("window.__arkSpaMark")
        url1 = page.url
        check_eq("spa", "跳转后 window 标记存活", mark1, "alive")
        check_true("spa", "跳转到分类路由", "#/category" in url1, url1)
        check(page, "spa", "分类页内容已渲染", ".cat-grid .cat-card", 10)

        page.click("#ark-nav .nav-link[data-nav='changelog']")
        page.wait_for_timeout(900)
        check_eq("spa", "二次跳转 window 标记存活", page.evaluate("window.__arkSpaMark"), "alive")
        check_true("spa", "跳转到更新日志", "#/changelog" in page.url, page.url)
        check(page, "spa", "日志时间线已渲染", ".timeline .tl-item", 8)

        # 面包屑在切页后仍然正确
        page.click("#ark-nav .nav-link[data-nav='home']")
        page.wait_for_timeout(800)
        page.click(".cat-grid .cat-card >> nth=1")
        page.wait_for_timeout(1000)
        check(page, "spa", "分类页面包屑", "#ark-crumb .crumb-item", 2)
        crumb_txt = page.locator("#ark-crumb").inner_text().replace("\n", " ")
        check_true("spa", "面包屑含首页", "首页" in crumb_txt, crumb_txt)

        # 详情 -> 返回：滚动位置与标记
        # 注意点卡片标题而不是卡片中心：卡片中间可能就是标签胶囊，
        # 点标签的语义是「按这个标签筛选」，不会进详情页。
        page.click(".results .card .card-name >> nth=0")
        page.wait_for_timeout(1000)
        check_true("spa", "进入详情页", "#/detail" in page.url, page.url)
        check_eq("spa", "详情页标记存活", page.evaluate("window.__arkSpaMark"), "alive")
        page.go_back()
        page.wait_for_timeout(1100)
        check_eq("spa", "后退后标记存活", page.evaluate("window.__arkSpaMark"), "alive")
        check(page, "spa", "后退回到上一路由内容", ".results .card", 6)
        page.screenshot(path=os.path.join(OUT, "spa-back.png"))

        # ================= 3. 虚拟滚动 / 视图 / 布局 =================
        print("\n===== 3. 结果区交互检查 =====")
        console_errors.clear()
        page.goto(BASE + "/index.html#/category?cat=coding", wait_until="load")
        page.wait_for_timeout(1800)

        # 列表视图
        page.click(".bar-row .seg >> nth=0 >> button[data-v='list']")
        page.wait_for_timeout(800)
        n_list = page.locator(".results .view-list .card").count()
        print("  列表视图卡片数 =", n_list)
        check_true("view", "列表视图渲染", n_list >= 5, "仅 %d 张" % n_list)
        page.screenshot(path=os.path.join(OUT, "view-list.png"))

        page.click(".bar-row .seg >> nth=0 >> button[data-v='card']")
        page.wait_for_timeout(600)

        # 瀑布流
        segs = page.locator(".bar-row .seg")
        if segs.count() >= 2:
            page.click(".bar-row .seg >> nth=1 >> button[data-v='masonry']")
            page.wait_for_timeout(1000)
            n_ma = page.locator(".masonry .card").count()
            print("  瀑布流卡片数 =", n_ma)
            check_true("view", "瀑布流渲染", n_ma >= 5, "仅 %d 张" % n_ma)
            page.screenshot(path=os.path.join(OUT, "view-masonry.png"))
            page.click(".bar-row .seg >> nth=1 >> button[data-v='grid']")
            page.wait_for_timeout(600)

        # 虚拟滚动：每页选「全部」
        page.select_option(".bar-row select >> nth=1", "all")
        page.wait_for_timeout(2000)
        total = page.evaluate("document.querySelectorAll('.results .card').length")
        hint = page.locator(".bar-row .chip-accent").count()
        print("  虚拟滚动 DOM 卡片数 =", total, "| 提示胶囊 =", hint)
        check_true("virtual", "虚拟滚动未渲染全量卡片", total <= 90, "DOM 中 %d 张" % total)
        check_true("virtual", "虚拟滚动提示已显示", hint >= 1)
        page.screenshot(path=os.path.join(OUT, "view-virtual.png"))

        page.mouse.wheel(0, 8000)
        page.wait_for_timeout(900)
        total2 = page.evaluate("document.querySelectorAll('.results .card').length")
        print("  滚动 8000px 后 DOM 卡片数 =", total2)
        check_true("virtual", "滚动后卡片数保持窗口化", total2 <= 110, "DOM 中 %d 张" % total2)
        page.screenshot(path=os.path.join(OUT, "view-virtual-scrolled.png"))

        # 分页：切回每页 24 条
        page.select_option(".bar-row select >> nth=1", "24")
        page.wait_for_timeout(1200)
        pager = page.locator(".pager:not([hidden]) .pager-btn").count()
        cur = page.locator(".pager .pager-btn[aria-current='page']").count()
        page_info = page.locator(".pager .pager-info").first.inner_text() if page.locator(".pager .pager-info").count() else "?"
        print("  分页按钮数 =", pager, "| 当前页标记 =", cur, "|", page_info)
        check_true("pager", "分页器已渲染页码", pager >= 3, "仅 %d 个按钮" % pager)
        check_true("pager", "当前页高亮唯一", cur == 1, "有 %d 个高亮" % cur)
        page.screenshot(path=os.path.join(OUT, "view-pager.png"))

        # ---- 快捷筛选（全部 / 未访问 / 收藏 / 免费）----
        page.select_option(".bar-row select >> nth=1", "48")
        page.wait_for_timeout(900)
        base_total = page.locator(".results .card").count()

        def rendered_ids():
            return page.evaluate(
                "() => [...document.querySelectorAll('.results .card')].map(c => c.dataset.id)")

        # 「只看免费」：断言渲染出来的每一条确实都是 free，
        # 而不是断言「条数变少了」——某些分类里免费资源本来就占大多数，条数可能不变。
        page.click(".quick-bar .quick-btn[data-quick='free']")
        page.wait_for_timeout(1000)
        free_ids = rendered_ids()
        bad = page.evaluate(
            """() => {
                var byId = {};
                Ark.data.allResources().forEach(function (r) { byId[r.id] = r; });
                return [...document.querySelectorAll('.results .card')]
                  .filter(function (c) { return !byId[c.dataset.id] || byId[c.dataset.id].free !== 'free'; })
                  .map(function (c) { return c.dataset.id; });
            }""")
        on_cnt = page.locator(".quick-bar .quick-btn[data-quick='free'].on").count()
        print("  快捷筛选「免费」= %d 条（原 %d 条），非免费残留 %d 条" % (len(free_ids), base_total, len(bad)))
        check_true("quick", "免费快捷筛选已激活", on_cnt == 1, "高亮按钮 %d 个" % on_cnt)
        check_true("quick", "结果里全部是真的免费资源", len(bad) == 0, "混入 %s" % bad[:5])
        check_true("quick", "免费筛选非空", len(free_ids) > 0)

        page.click(".quick-bar .quick-btn[data-quick='free']")
        page.wait_for_timeout(800)
        check_true("quick", "再次点击可取消快捷筛选",
                   page.locator(".quick-bar .quick-btn[data-quick='free'].on").count() == 0)
        check_true("quick", "取消后结果恢复", page.locator(".results .card").count() == base_total)

        # 收藏筛选：清掉本地状态，把一条资源加进收藏，再断言「只看收藏」只剩它
        page.evaluate("localStorage.clear()")
        page.goto(BASE + "/index.html#/category?cat=coding", wait_until="load")
        page.wait_for_timeout(1800)
        page.locator(".results .card .card-fav").first.click()
        page.wait_for_timeout(700)
        faved_id = page.locator(".results .card").first.get_attribute("data-id")
        page.click(".quick-bar .quick-btn[data-quick='fav']")
        page.wait_for_timeout(1000)
        fav_ids = rendered_ids()
        print("  快捷筛选「收藏」= %d 条（应为 1）" % len(fav_ids))
        check_true("quick", "「只看收藏」只剩收藏的那一条",
                   fav_ids == [faved_id], "%s vs %s" % (fav_ids, faved_id))
        page.screenshot(path=os.path.join(OUT, "quick-filter.png"))
        page.click(".quick-bar .quick-btn[data-quick='fav']")
        page.wait_for_timeout(600)
        # 复位收藏，避免影响后面「收藏页」那一段的预期条数
        page.evaluate("localStorage.setItem('ark.favorites', '[]')")
        page.wait_for_timeout(200)

        # 「未访问」：先看一条详情，回到列表后该条应带已访问标记，并被「未访问」排除
        target_id = page.locator(".results .card").first.get_attribute("data-id")
        page.goto(BASE + "/index.html#/detail?id=" + target_id, wait_until="load")
        page.wait_for_timeout(1500)
        page.go_back()
        page.wait_for_timeout(1600)
        seen_chip = page.locator(".results .card[data-id='%s'] .chip-seen" % target_id).count()
        check_true("visited", "看过的卡片出现已访问标记", seen_chip == 1,
                   "card=%s 上找到 %d 个标记" % (target_id, seen_chip))

        page.click(".quick-bar .quick-btn[data-quick='unseen']")
        page.wait_for_timeout(1100)
        unseen_ids = rendered_ids()
        seen_set = page.evaluate("() => Object.keys(Ark.store.seen())")
        leaked = [i for i in unseen_ids if i in set(seen_set)]
        print("  「未访问」渲染 %d 条，混入已看过的 %d 条" % (len(unseen_ids), len(leaked)))
        check_true("visited", "「未访问」筛选排除了看过的资源", len(leaked) == 0, "混入 %s" % leaked[:5])
        page.click(".quick-bar .quick-btn[data-quick='unseen']")
        page.wait_for_timeout(600)

        # ================= 4. 搜索与高亮 =================
        print("\n===== 4. 搜索检查 =====")
        console_errors.clear()
        page.goto(BASE + "/index.html#/", wait_until="load")
        page.wait_for_timeout(1700)
        page.fill(".hero-search input", "设计 素材")
        page.click(".hero-search .go")
        page.wait_for_timeout(1800)
        print("  搜索跳转 =", page.url)
        check_true("search", "搜索跳转到 search 路由", "#/search" in page.url, page.url)
        cnt = page.locator(".count-badge").first.inner_text() if page.locator(".count-badge").count() else "?"
        marks = page.locator("mark.hit").count()
        tag_hits = page.locator(".tag.hit").count()
        print("  结果 =", cnt, "| 字符命中 =", marks, "| 标签命中 =", tag_hits)
        check_true("search", "结果命中提示存在", marks + tag_hits > 0)
        page.screenshot(path=os.path.join(OUT, "search-result.png"))

        page.goto(BASE + "/index.html#/search?q=%E5%8D%83%E5%9B%BE", wait_until="load")
        page.wait_for_timeout(1700)
        nm = page.locator(".card-name mark.hit").count()
        dm = page.locator(".card-desc mark.hit").count()
        print("  『千图』名称高亮 =", nm, "| 描述高亮 =", dm)
        check_true("search", "字符级高亮生效", nm + dm > 0)
        page.screenshot(path=os.path.join(OUT, "search-highlight.png"))

        page.goto(BASE + "/index.html#/search?q=%E5%9C%A8%E7%BA%BF%E5%B7%A5%E5%85%B7", wait_until="load")
        page.wait_for_timeout(1600)
        print("  模糊搜索『在线工具』=", page.locator(".count-badge").first.inner_text())

        # 导航栏搜索联想
        page.goto(BASE + "/index.html#/", wait_until="load")
        page.wait_for_timeout(1600)
        page.fill("#ark-nav .nav-search input", "视频")
        page.wait_for_timeout(600)
        sug_vis = page.locator("#ark-nav .nav-suggest.open").count()
        sug_items = page.locator("#ark-nav .nav-suggest .sug-item, #ark-nav .nav-suggest .tag").count()
        print("  搜索联想面板 =", sug_vis, "| 条目 =", sug_items)
        check_true("search", "搜索联想面板可展开", sug_vis >= 1)
        check_true("search", "联想有候选项", sug_items >= 1)
        page.screenshot(path=os.path.join(OUT, "search-suggest.png"))

        # ================= 5. 收藏 / 历史联动 =================
        print("\n===== 5. 收藏与历史 =====")
        console_errors.clear()
        page.goto(BASE + "/index.html#/detail?id=coding-playground-01", wait_until="load")
        page.wait_for_timeout(1700)
        fav_icon_before = page.locator(".js-fav .js-fav-ico").count()
        check_true("favorite", "详情页收藏按钮图标已渲染", fav_icon_before >= 1)

        page.click(".js-fav")
        page.wait_for_timeout(700)
        favs = page.evaluate("localStorage.getItem('ark.favorites')")
        hist = page.evaluate("localStorage.getItem('ark.history')")
        print("  favorites =", favs)
        print("  history   =", (hist or "")[:90])
        check_true("favorite", "收藏已写入 localStorage", favs and "coding-playground-01" in favs, str(favs))
        check_true("history", "浏览历史已写入 localStorage", hist and "coding-playground-01" in hist, str(hist)[:60])
        check_eq("favorite", "收藏按钮文案已更新", page.locator(".js-fav .js-fav-txt").inner_text(), "已收藏")
        page.screenshot(path=os.path.join(OUT, "detail-fav.png"))

        # 导航角标应随收藏变化
        badge_on = page.locator("#ark-nav .icon-badge.on").count()
        check_true("favorite", "导航收藏角标已点亮", badge_on >= 1)

        # 回到首页点一张卡片的星标，收藏页应联动
        page.goto(BASE + "/index.html#/favorites", wait_until="load")
        page.wait_for_timeout(1800)
        n_fav = page.locator(".results .card, .grid-cards .card").count()
        print("  收藏页卡片数 =", n_fav)
        check_true("favorite", "收藏页读到收藏数据", n_fav >= 1, "0 张")
        # 只有一条收藏时不该出现分页器（< 1 页）
        pager_hidden = page.locator(".pager[hidden]").count()
        check_true("pager", "单页时自动收起分页器", pager_hidden >= 1, "仍有分页器")
        page.screenshot(path=os.path.join(OUT, "favorites-filled.png"))

        # 收藏页内搜索
        page.fill(".fav-tools input[type=search]", "代码")
        page.wait_for_timeout(900)
        print("  收藏页内搜索后卡片数 =", page.locator(".results .card, .grid-cards .card").count())
        page.screenshot(path=os.path.join(OUT, "favorites-search.png"))
        page.fill(".fav-tools input[type=search]", "")
        page.wait_for_timeout(700)

        # ---- 导出清单 / 备份：真实触发下载并校验文件内容 ----
        with page.expect_download() as dl_info:
            page.click(".fav-tools-row .btn >> nth=0")
        d = dl_info.value
        md_file = os.path.join(OUT, "export-favorites.md")
        d.save_as(md_file)
        with open(md_file, encoding="utf-8") as f:
            md_text = f.read()
        print("  导出 Markdown =", d.suggested_filename, "| 字节 =", len(md_text))
        check_true("export", "清单文件名以 .md 结尾", d.suggested_filename.endswith(".md"),
                   d.suggested_filename)
        check_true("export", "清单里含 Markdown 链接", "](" in md_text and "http" in md_text,
                   md_text[:100])

        with page.expect_download() as dl_info2:
            page.click(".fav-tools-row .btn >> nth=1")
        d2 = dl_info2.value
        json_file = os.path.join(OUT, "export-favorites.json")
        d2.save_as(json_file)
        with open(json_file, encoding="utf-8") as f:
            raw = f.read()
        parsed = json.loads(raw)
        print("  导出 JSON =", d2.suggested_filename, "| favorites =", parsed.get("favorites"))
        check_true("export", "备份文件名以 .json 结尾", d2.suggested_filename.endswith(".json"),
                   d2.suggested_filename)
        check_true("export", "备份内容含收藏 id 列表", isinstance(parsed.get("favorites"), list)
                   and len(parsed["favorites"]) >= 1, str(parsed)[:120])
        page.screenshot(path=os.path.join(OUT, "favorites-export.png"))

        # 历史页
        page.goto(BASE + "/index.html#/history", wait_until="load")
        page.wait_for_timeout(1800)
        n_hist = page.locator(".grid-cards .card, .masonry .card").count()
        print("  历史页卡片数 =", n_hist)
        check_true("history", "历史页读到浏览记录", n_hist >= 1, "0 张")
        page.screenshot(path=os.path.join(OUT, "history-filled.png"))

        # ================= 6. 背景插画 / 主题 / 随机 / 复制 =================
        print("\n===== 6. 外观与杂项 =====")
        console_errors.clear()
        page.goto(BASE + "/index.html#/", wait_until="load")
        page.wait_for_timeout(2600)
        bg_img = page.evaluate("""() => {
            var el = document.querySelector('#ark-bg img');
            if (!el) return null;
            return { src: el.getAttribute('src'), natural: el.naturalWidth, ready: el.classList.contains('is-ready') };
        }""")
        print("  背景插画 =", bg_img)
        check_true("background", "背景插画已加载", bool(bg_img) and bg_img["natural"] > 0, str(bg_img))
        check_true("background", "背景插画标记就绪", bool(bg_img) and bg_img["ready"], str(bg_img))
        scheme = page.get_attribute("html", "data-bg-scheme")
        print("  背景配色方案 =", scheme)
        check_true("background", "背景配色方案已设置", scheme in ("light", "dark"), str(scheme))
        page.screenshot(path=os.path.join(OUT, "bg-light.png"))

        # 深浅切换
        page.click("#ark-dark")
        page.wait_for_timeout(800)
        theme = page.get_attribute("html", "data-theme")
        print("  深色切换后 data-theme =", theme)
        check_true("theme", "深色模式已生效", theme == "dark", str(theme))
        check_eq("background", "背景方案跟随主题", page.get_attribute("html", "data-bg-scheme"), "dark")
        page.screenshot(path=os.path.join(OUT, "bg-dark.png"))

        # 主题面板
        page.click("#ark-theme")
        page.wait_for_timeout(500)
        check_true("theme", "主题面板已展开", page.locator("#ark-theme-pop.open").count() >= 1)
        page.click("#ark-theme-pop .theme-swatch[data-theme-id='aurora']")
        page.wait_for_timeout(700)
        check_eq("theme", "主题面板切换生效", page.get_attribute("html", "data-theme"), "aurora")
        page.screenshot(path=os.path.join(OUT, "theme-aurora.png"))
        page.click("body", position={"x": 6, "y": 500})
        page.wait_for_timeout(300)

        # 回到浅色
        page.click("#ark-theme")
        page.wait_for_timeout(300)
        page.click("#ark-theme-pop .theme-swatch[data-theme-id='light']")
        page.wait_for_timeout(500)
        page.click("body", position={"x": 6, "y": 500})

        # 随机推荐
        page.click("#ark-random")
        page.wait_for_timeout(1600)
        print("  随机推荐 ->", page.url)
        check_true("random", "随机推荐跳到详情页", "#/detail" in page.url, page.url)

        # 复制链接
        page.context.grant_permissions(["clipboard-read", "clipboard-write"])
        page.goto(BASE + "/index.html#/search", wait_until="load")
        page.wait_for_timeout(1800)
        page.locator(".js-copy").first.click()
        page.wait_for_timeout(600)
        toast = page.locator(".toast").count()
        print("  复制后提示条 =", toast)
        check_true("copy", "复制链接有反馈", toast >= 1)
        page.screenshot(path=os.path.join(OUT, "copy-toast.png"))

        # ================= 7. 键盘快捷键与标签云 =================
        print("\n===== 7. 键盘快捷键与标签云 =====")
        console_errors.clear()
        page.goto(BASE + "/index.html#/", wait_until="load")
        page.wait_for_timeout(1800)

        def blur():
            page.evaluate("() => document.activeElement && document.activeElement.blur()")

        # ? 打开帮助面板
        blur()
        page.keyboard.press("?")
        page.wait_for_timeout(700)
        modal_open = page.locator(".kbd-modal.open").count()
        rows = page.locator(".kbd-modal .kbd-row").count()
        print("  快捷键面板 =", modal_open, "| 条目 =", rows)
        check_true("keys", "按 ? 打开快捷键面板", modal_open == 1, "找到 %d 个面板" % modal_open)
        check_true("keys", "面板列出了快捷键条目", rows >= 6, "仅 %d 条" % rows)
        page.screenshot(path=os.path.join(OUT, "kbd-help.png"))

        # Esc 关闭
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        check_true("keys", "Esc 关闭快捷键面板", page.locator(".kbd-modal.open").count() == 0)

        # / 聚焦导航搜索框
        blur()
        page.keyboard.press("/")
        page.wait_for_timeout(500)
        focused = page.evaluate(
            "() => !!document.activeElement && document.activeElement.tagName === 'INPUT'"
            " && !!document.activeElement.closest('#ark-nav')")
        check_true("keys", "按 / 聚焦导航搜索框", focused)

        # 正在输入时，单键快捷键必须让路
        page.keyboard.type("?r")
        page.wait_for_timeout(500)
        val = page.locator("#ark-nav .nav-search input").input_value()
        print("  输入框内容 =", repr(val))
        check_true("keys", "输入框内输入 ? 不会弹出面板",
                   page.locator(".kbd-modal.open").count() == 0)
        check_true("keys", "输入框内输入 r 不会触发随机跳转", "#/detail" not in page.url, page.url)
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

        # g 回到顶部
        page.mouse.wheel(0, 2600)
        page.wait_for_timeout(600)
        blur()
        page.keyboard.press("g")
        page.wait_for_timeout(1400)
        y = page.evaluate("() => window.pageYOffset")
        print("  按 g 之后滚动位置 =", y)
        check_true("keys", "按 g 回到页面顶部", y < 80, "y=%s" % y)

        # ---- 标签云 ----
        page.goto(BASE + "/index.html#/tags", wait_until="load")
        page.wait_for_timeout(1900)
        n_all = page.locator(".tagcloud-item").count()
        page.click(".tag-cat[data-cat='game']")
        page.wait_for_timeout(1000)
        n_cat = page.locator(".tagcloud-item").count()
        print("  标签云：全部 %d 个 -> 限定游戏娱乐 %d 个" % (n_all, n_cat))
        check_true("tags", "分类限定收窄了标签范围", 0 < n_cat < n_all, "%d -> %d" % (n_all, n_cat))
        page.screenshot(path=os.path.join(OUT, "tags-cat.png"))

        # 页内搜索
        page.fill(".panel input[type=search]", "游戏")
        page.wait_for_timeout(900)
        names = page.locator(".tagcloud-item .tc-name").all_inner_texts()
        print("  标签搜索「游戏」= %d 个 |" % len(names), names[:6])
        check_true("tags", "标签搜索有命中", len(names) > 0)
        check_true("tags", "标签搜索确实过了滤", all("游戏" in x for x in names), str(names[:8]))

        # 恢复全部后展开全量标签
        page.fill(".panel input[type=search]", "")
        page.click(".tag-cat[data-cat='']")
        page.wait_for_timeout(1000)
        n_default = page.locator(".tagcloud-item").count()
        page.click(".tc-foot .btn")
        page.wait_for_timeout(1500)
        n_full = page.locator(".tagcloud-item").count()
        print("  默认 %d 个 -> 展开全部 %d 个" % (n_default, n_full))
        check_true("tags", "可以展开全部标签", n_full > n_default, "%d -> %d" % (n_default, n_full))
        page.screenshot(path=os.path.join(OUT, "tags-full.png"))

        # 点标签进入筛选结果
        first_tag = page.locator(".tagcloud-item").first.get_attribute("data-tag")
        page.locator(".tagcloud-item").first.click()
        page.wait_for_timeout(1700)
        print("  点击标签「%s」-> %s" % (first_tag, page.url))
        check_true("tags", "点击标签跳到带 tags 参数的搜索页",
                   "#/search" in page.url and "tags=" in page.url, page.url)
        check_true("tags", "标签筛选有结果", page.locator(".results .card").count() > 0)

        # ================= 8. 筛选栏收起 / 展开 =================
        print("\n===== 8. 筛选栏收起 / 展开 =====")
        fp = ctx.new_page()
        fp.set_viewport_size({"width": 390, "height": 844})
        fp.goto(BASE + "/index.html#/category?cat=design", wait_until="load")
        fp.wait_for_timeout(2000)

        def fb_state(pg):
            return pg.evaluate("""() => {
                var fb = document.querySelector('.filterbar');
                if (!fb) return null;
                var r = fb.getBoundingClientRect();
                return { folded: fb.classList.contains('fb-folded'),
                         h: Math.round(r.height), top: Math.round(r.top),
                         pos: getComputedStyle(fb).position };
            }""")

        s0 = fb_state(fp)
        print("  手机首屏筛选栏：折叠=%s 高度=%d 定位=%s" % (s0["folded"], s0["h"], s0["pos"]))
        check_true("filterbar", "手机首屏筛选栏默认收起（不再占满整屏）",
                   s0["folded"] and s0["h"] < 100, "高度 %dpx" % s0["h"])
        check_true("filterbar", "收起态吸顶常驻", s0["pos"] == "sticky", s0["pos"])
        fp.screenshot(path=os.path.join(OUT, "filterbar-folded.png"))

        # 点开：应当展开成完整面板，并把筛选区带回视野顶部
        fp.evaluate("() => document.querySelector('.fb-toggle').click()")
        fp.wait_for_timeout(400)
        s1 = fb_state(fp)
        print("  点开后：折叠=%s 高度=%d 顶部=%d" % (s1["folded"], s1["h"], s1["top"]))
        check_true("filterbar", "点小条可以展开筛选栏",
                   (not s1["folded"]) and s1["h"] > 300, "高度 %dpx" % s1["h"])
        check_true("filterbar", "展开后筛选区回到视野顶部", -20 <= s1["top"] <= 140, "顶部 %dpx" % s1["top"])
        check_true("filterbar", "展开态不吸顶（不会盖住结果）", s1["pos"] == "static", s1["pos"])
        fp.screenshot(path=os.path.join(OUT, "filterbar-expanded.png"))

        # 再收起：结果卡片在视口里必须原地不动
        def card_top(pg):
            return pg.evaluate("() => Math.round("
                               "document.querySelector('.results .card').getBoundingClientRect().top)")
        before = card_top(fp)
        fp.evaluate("() => document.querySelector('.fb-toggle').click()")
        fp.wait_for_timeout(400)
        after = card_top(fp)
        s2 = fb_state(fp)
        print("  收起前后卡片视口位置：%d -> %d（差 %+dpx）" % (before, after, after - before))
        check_true("filterbar", "收起后结果卡片不跳动", abs(after - before) <= 4, "位移 %+dpx" % (after - before))
        check_true("filterbar", "收起后高度回到一行", s2["folded"] and s2["h"] < 100, "高度 %dpx" % s2["h"])

        # 下滑：展开态应自动收起，且结果卡片全程不会被整块盖住
        fp.goto(BASE + "/index.html#/search", wait_until="load")
        fp.wait_for_timeout(2000)
        vis_min = None
        for _ in range(16):
            fp.mouse.wheel(0, 150)
            fp.wait_for_timeout(150)
            n = fp.evaluate("""() => {
                var nav = document.querySelector('#ark-nav');
                var fb = document.querySelector('.filterbar');
                var box = document.querySelector('.results');
                if (!fb || !box) return -1;
                // 结果区还没滚进视野的帧不算数（页面上半部的搜索面板本来就该占屏）
                if (box.getBoundingClientRect().top > window.innerHeight) return -1;
                var top = Math.max(nav ? nav.getBoundingClientRect().bottom : 60,
                                   fb.getBoundingClientRect().bottom);
                var n = 0;
                document.querySelectorAll('.results .card').forEach(function (c) {
                  var r = c.getBoundingClientRect();
                  if (r.bottom > top && r.top < window.innerHeight) n++;
                });
                return n;
            }""")
            if n >= 0:
                vis_min = n if vis_min is None else min(vis_min, n)
        s3 = fb_state(fp)
        print("  下滑后：折叠=%s 高度=%d，全程最少可见卡片 %s 张" % (s3["folded"], s3["h"], vis_min))
        check_true("filterbar", "下滑后自动收起", s3["folded"] and s3["h"] < 100, "高度 %dpx" % s3["h"])
        check_true("filterbar", "下滑过程中结果没有被整块盖住",
                   vis_min is not None and vis_min > 0, "最少可见 %s 张" % vis_min)
        fp.screenshot(path=os.path.join(OUT, "filterbar-scrolled.png"))
        fp.close()

        # ================= 9. 响应式 =================
        print("\n===== 9. 响应式检查 =====")
        mob = ctx.new_page()
        mob.set_viewport_size({"width": 390, "height": 844})
        mob.goto(BASE + "/index.html#/", wait_until="load")
        mob.wait_for_timeout(2000)
        burger_visible = mob.locator("#ark-nav .burger").is_visible()
        print("  移动端汉堡菜单可见 =", burger_visible)
        check_true("mobile", "汉堡菜单可见", burger_visible)
        mob.screenshot(path=os.path.join(OUT, "mobile-home.png"))
        mob.click("#ark-nav .burger")
        mob.wait_for_timeout(700)
        drawer_open = mob.locator(".drawer.open").count()
        print("  抽屉打开 =", drawer_open)
        check_true("mobile", "移动端抽屉可打开", drawer_open >= 1)
        mob.screenshot(path=os.path.join(OUT, "mobile-drawer.png"))
        mob.goto(BASE + "/index.html#/category?cat=design", wait_until="load")
        mob.wait_for_timeout(2000)
        mob.screenshot(path=os.path.join(OUT, "mobile-category.png"))
        mob.goto(BASE + "/index.html#/detail?id=education-courses-01", wait_until="load")
        mob.wait_for_timeout(1800)
        mob.screenshot(path=os.path.join(OUT, "mobile-detail.png"))

        tab = ctx.new_page()
        tab.set_viewport_size({"width": 834, "height": 1112})
        tab.goto(BASE + "/index.html#/search", wait_until="load")
        tab.wait_for_timeout(1900)
        tab.screenshot(path=os.path.join(OUT, "tablet-search.png"))

        browser.close()

    # ================= 汇总 =================
    print("\n===== 元素检查明细 =====")
    bad = [r for r in report if not r[3]]
    print("检查项 %d 个，通过 %d，失败 %d" % (len(report), len(report) - len(bad), len(bad)))
    for r in bad:
        print("  ✗ [%s] %s -> %s" % (r[0], r[1], r[2]))

    print("\n===== 错误汇总 =====")
    if errors:
        for e in errors:
            print("  ✗", e)
        sys.exit(1)
    print("  ✓ 全部通过")


if __name__ == "__main__":
    run()
