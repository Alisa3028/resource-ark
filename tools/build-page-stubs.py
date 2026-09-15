# -*- coding: utf-8 -*-
"""把 pages/*.html 生成「重定向壳」。
站点已改造为 SPA 单页应用，所有页面由 index.html + 哈希路由承载；
保留这些文件只为兼容历史外链与收藏夹里的旧地址：
它们不含任何业务逻辑，只把 ?参数 原样带到 #/路由 上。
"""
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PAGES = os.path.join(ROOT, "pages")

MAP = [
    ("category.html",  "category",  "资源分类",  "按十一大领域、六十六个子分类逐层浏览优质网站资源。"),
    ("detail.html",    "detail",    "资源详情",  "站点信息、访问地址、相关推荐与同类资源。"),
    ("search.html",    "search",    "搜索资源",  "按名称、用途、标签、分类与域名检索全站资源。"),
    ("tags.html",      "tags",      "标签云",    "全站标签按收录数量分级展示，点任意标签直达对应资源。"),
    ("changelog.html", "changelog", "更新日志",  "记录资源方舟的每一次迭代与数据变更。"),
    ("about.html",     "about",     "关于本站",  "项目说明、目录规范与二次开发指引。"),
    ("history.html",   "history",   "浏览历史",  "最近浏览过的资源，保存在浏览器本地。"),
    ("favorites.html", "favorites", "我的收藏",  "收藏的资源，保存在浏览器本地。"),
    ("feedback.html",  "feedback",  "反馈建议",  "死链反馈、信息纠错与资源推荐。"),
]

TPL = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} · 资源方舟</title>
  <meta name="description" content="{desc}">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="../index.html">
  <link rel="icon" type="image/svg+xml" href="../assets/img/favicon.svg">
  <!--
    兼容壳：站点已改为 SPA（单页应用），本文件不再承载任何页面内容。
    它只负责把旧地址（例如 pages/category.html?cat=education）
    重定向到新的哈希路由（../index.html#/category?cat=education）。
  -->
  <script>
    (function () {{
      var q = location.search || '';
      location.replace('../index.html#/{route}' + q);
    }})();
  </script>
  <style>
    html, body {{ height: 100%; margin: 0; }}
    body {{
      display: grid; place-items: center;
      font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
      background: #f5f6fb; color: #0f172a; text-align: center; padding: 20px;
    }}
    .box {{ max-width: 420px; }}
    .box p {{ color: #4d5a70; font-size: 14px; line-height: 1.7; }}
    .box a {{ color: #6366f1; font-weight: 600; }}
  </style>
</head>
<body>
  <div class="box">
    <p>正在前往「{title}」…</p>
    <noscript>
      <p>本站已升级为单页应用，需要开启 JavaScript。也可以直接点击下面的链接：</p>
    </noscript>
    <p><a href="../index.html#/{route}">手动前往 {title}</a></p>
  </div>
</body>
</html>
'''

os.makedirs(PAGES, exist_ok=True)
for fname, route, title, desc in MAP:
    path = os.path.join(PAGES, fname)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(TPL.format(route=route, title=title, desc=desc))
    print("written", os.path.relpath(path, ROOT))
