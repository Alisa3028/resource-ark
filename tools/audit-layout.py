# -*- coding: utf-8 -*-
"""多断点横向溢出审计：任意路由 × 任意视口宽度，都不允许出现横向滚动条
------------------------------------------------------------------------------
为什么需要它：
  单点目测很容易漏掉「某个断点下某个页面被撑宽 20px」这类问题，而横向滚动条
  一旦出现，整个站的精致感就没了。这里把 11 条路由 × 11 档宽度全部跑一遍，
  只要 documentElement.scrollWidth 超过 clientWidth，就打印撑破布局的元素。

判定口径：只统计文档流内的元素（fixed / absolute 定位子树不会产生滚动条，
  会被自动跳过），并以 scrollWidth / clientWidth 作为最终结论。

用法（先起静态服务）：
  python -m http.server 8788 --bind 127.0.0.1
  python tools/audit-layout.py
退出码：出现任何溢出即为 1，可直接接进 CI。
"""
import sys

from playwright.sync_api import sync_playwright

ROUTES = [
    ("home", "#/"),
    ("category-all", "#/category"),
    ("category-cat", "#/category?cat=design"),
    ("category-sub", "#/category?cat=education&sub=courses"),
    ("category-game", "#/category?cat=game"),
    ("detail", "#/detail?id=education-courses-01"),
    ("search", "#/search?q=%E8%A7%86%E9%A2%91"),
    ("tags", "#/tags"),
    ("tags-cat", "#/tags?cat=design"),
    ("favorites", "#/favorites"),
    ("history", "#/history"),
    ("feedback", "#/feedback"),
    ("changelog", "#/changelog"),
    ("about", "#/about"),
]
# 宽度覆盖：360→1920 逐档加宽。1100 / 1220 / 1366 是顶栏最挤的一带
# （导航栏还在、抽屉还没接管），加进来专门盯「导航文字被压成两字一排」这类问题。
WIDTHS = [360, 390, 414, 480, 640, 768, 834, 1024, 1100, 1220, 1280, 1366, 1440, 1920]

JS = """() => {
    var vw = document.documentElement.clientWidth;
    var bad = [];
    document.querySelectorAll('body *').forEach(function (el) {
        // 跳过 fixed / absolute 定位子树（它们不参与文档流，不会产生滚动条）
        var p = el, fixed = false;
        while (p && p !== document.body) {
            var pos = getComputedStyle(p).position;
            if (pos === 'fixed' || pos === 'absolute') { fixed = true; break; }
            p = p.parentElement;
        }
        if (fixed) return;
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (r.right > vw + 1 || r.left < -1) {
            bad.push([el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
                      (typeof el.className === 'string' && el.className
                        ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''),
                      Math.round(r.left), Math.round(r.right)]);
        }
    });
    return { vw: vw, docScrollW: document.documentElement.scrollWidth, bad: bad.slice(0, 6) };
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    fails = 0
    for w in WIDTHS:
        pg = b.new_context(viewport={"width": w, "height": 900}).new_page()
        for name, h in ROUTES:
            pg.goto("http://127.0.0.1:8788/index.html" + h, wait_until="load")
            pg.wait_for_timeout(1200)
            r = pg.evaluate(JS)
            if r["docScrollW"] > r["vw"] + 1:
                fails += 1
                print("OVER w=%-5d %-13s docScrollW=%d" % (w, name, r["docScrollW"]))
                for x in r["bad"]:
                    print("        ", x)
        pg.close()
    b.close()
    print("完成：%d 个组合，%d 个溢出" % (len(WIDTHS) * len(ROUTES), fails))
    sys.exit(1 if fails else 0)
