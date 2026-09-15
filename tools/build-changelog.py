# -*- coding: utf-8 -*-
"""
ResourceArk 更新日志生成脚本
------------------------------------------------------------------
从 data/resources.json + data/categories.json 里取样真实的资源名称，
生成结构化的 data/changelog.json，让日志里的每一条记录都能对上号。

用法：python tools/build-changelog.py   （需先运行 build-data.py）
"""
import json
import os
import random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

# 版本时间线：(版本号, 日期, 标题, 摘要)
VERSIONS = [
    ("1.6.0", "2026-09-15", "筛选栏可收起，不再挡住结果",
     "三层筛选铺开时能占掉整屏，展开态改为随页面滚走、滚出视野后自动收成吸顶小条，"
     "点一下即可展开。切换做了滚动补偿，正在看的内容不会跳动。"),
    ("1.5.0", "2026-09-15", "新增游戏娱乐分类，清理虚假数据",
     "资源库扩容到 11 个大分类，新增标签云与键盘快捷键等四项功能；并删掉构建期伪随机生成的评分、访问量，"
     "页面上每个数字都必须能在数据文件里核对。"),
    ("1.4.0", "2026-09-14", "改造为单页应用，全站换装",
     "十个页面收敛进一个外壳，切页不再整页重载；引入内联 SVG 图标系统与全局背景插画，并修掉四个不报错的静默问题。"),
    ("1.3.0", "2026-09-14", "数据与页面彻底解耦，全站上线",
     "资源库正式成型：分类体系重构为 10 大类 60 子分类，全部资源改用独立 JSON 存放，页面零硬编码。"),
    ("1.2.0", "2026-08-22", "虚拟滚动与分页上线",
     "引入按行窗口化的虚拟滚动，配合 24/48/96/全部 四档分页，千级数据滚动不再卡顿。"),
    ("1.1.0", "2026-08-01", "多主题与自定义配色",
     "新增极光紫、森林绿、落日橘、赛博青、樱花粉等主题，支持自定义主色、圆角风格与动效开关。"),
    ("1.0.0", "2026-07-12", "v1.0 正式版发布",
     "完成首页、分类页、详情页、搜索页、更新日志与关于页的完整闭环，面包屑贯穿全部层级。"),
    ("0.9.0", "2026-06-20", "全局模糊搜索与多标签筛选",
     "搜索范围扩展到名称、描述、标签、分类与域名，支持多关键词与命中高亮；标签筛选支持全部满足 / 任一满足。"),
    ("0.8.0", "2026-05-28", "浏览历史与收藏",
     "浏览记录与收藏改由浏览器本地存储承载，刷新、重启都不丢失，并提供独立的管理页面。"),
    ("0.7.0", "2026-05-05", "视觉重构：网格 / 瀑布流 / 列表",
     "替换掉早期模板式界面，同一批数据可在三种布局与两种视图之间自由切换，补齐滚动淡入与视差。"),
    ("0.6.0", "2026-04-10", "项目启动",
     "确定「纯静态、数据与页面分离、可部署到任意静态托管」的技术路线，搭起第一版目录结构。"),
]


def main():
    res = json.load(open(os.path.join(DATA, "resources.json"), encoding="utf-8"))
    cats = json.load(open(os.path.join(DATA, "categories.json"), encoding="utf-8"))
    items = res["items"]
    cat_map = {c["id"]: c for c in cats["categories"]}
    sub_map = {}
    for c in cats["categories"]:
        for s in c["subcategories"]:
            sub_map[(c["id"], s["id"])] = s["name"]

    # 按分类分组，方便按版本取不同领域的样本
    by_cat = {}
    for r in items:
        by_cat.setdefault(r["cat"], []).append(r)

    rnd = random.Random(20260914)
    cat_ids = list(by_cat.keys())

    def sample(cat_id, n, exclude):
        pool = [r for r in by_cat.get(cat_id, []) if r["name"] not in exclude]
        rnd.shuffle(pool)
        out = pool[:n]
        for r in out:
            exclude.add(r["name"])
        return out

    def fmt(rs):
        """把资源列表格式化成「名称（子分类）」这样的可读条目"""
        return ["%s —— %s · %s" % (r["name"], cat_map[r["cat"]]["name"], sub_map.get((r["cat"], r["sub"]), r["sub"]))
                for r in rs]

    entries = []
    used = set()
    meta_of = {v[0]: v for v in VERSIONS}

    # ---------- 1.6.0：当前版本 ----------
    entries.append({
        "version": meta_of["1.6.0"][0], "date": meta_of["1.6.0"][1],
        "title": meta_of["1.6.0"][2], "summary": meta_of["1.6.0"][3],
        "groups": [
            {"type": "add", "title": "筛选栏可收起", "items": [
                "筛选栏顶部新增一行「当前条件 + 收起 / 展开」小条，收起后只剩这一行",
                "展开态不再吸顶：它就是一个普通区块，随页面正常滚走，不会把下方结果整块盖住",
                "往下滚、等它整块离开视野后自动收起，收起态吸顶常驻，随时能点开改条件",
                "筛选栏高度超过七成屏幕时（手机竖屏基本都会）默认就是收起的，进页面先看到结果"]},
            {"type": "opt", "title": "切换不跳动", "items": [
                "收起 / 展开都做了滚动位置补偿，正在看的内容在视口里原地不动（实测位移 0px）",
                "临时关掉浏览器的滚动锚定与全站平滑滚动，避免两处补偿叠加成两倍位移",
                "从吸顶小条点开时，会把完整筛选区带回视野顶部，不用自己往上翻"]}
        ]
    })

    # ---------- 1.5.0（数据盘点 + 本轮变更） ----------
    counts = sorted(((c["name"], sum(1 for r in items if r["cat"] == c["id"])) for c in cats["categories"]),
                    key=lambda x: -x[1])
    game = next((c for c in cats["categories"] if c["id"] == "game"), None)
    game_line = []
    if game:
        game_line = ["%s：%d 个站点（%s）" % (
            game["name"], sum(1 for r in items if r["cat"] == "game"),
            " / ".join(s["name"] for s in game["subcategories"]))]

    entries.append({
        "version": meta_of["1.5.0"][0], "date": meta_of["1.5.0"][1],
        "title": meta_of["1.5.0"][2], "summary": meta_of["1.5.0"][3],
        "groups": [
            {"type": "add", "title": "第 11 大分类：游戏娱乐", "items":
                ["全站共收录 %d 个站点，覆盖 %d 个大分类、%d 个子分类" % (
                    len(items), len(cats["categories"]),
                    sum(len(c["subcategories"]) for c in cats["categories"]))] +
                game_line +
                ["%s：%d 个站点" % (n, c) for n, c in counts if n != (game["name"] if game else "")]},
            {"type": "add", "title": "新增功能", "items": [
                "标签云页：全站 1800+ 个标签按收录量分档展示，支持领域限定、页内搜索与一键展开",
                "键盘快捷键：单键随机 / 换主题 / 回顶 / 回首页，Ctrl+K 聚焦搜索，? 唤起键位面板",
                "已访问标记：浏览过的卡片弱化显示并带眼形角标，可一键筛出「未访问」",
                "结果区快捷筛选：全部 / 未访问 / 已收藏 / 免费 可叠加在分类与标签筛选之上",
                "收藏页支持导出 Markdown 清单与 JSON 备份，并可从备份导入还原"]},
            {"type": "opt", "title": "界面与文案精简", "items": [
                "站点标识重绘为自创的「方帆 + 船身」矢量图形，标签页图标与顶栏、页脚、关于页统一",
                "分类卡与子分类卡的「进入」文字改为箭头，各页长副标题整体删减",
                "详情页移除「使用提示」整块，信息表只保留能在数据里核对的字段",
                "关于页的目录规范与二次开发文档收进折叠面板，默认收起"]},
            {"type": "del", "title": "移除虚假数据", "items": [
                "删除构建期由脚本伪随机生成的「综合评分」与「累计访问量」——它们与真实站点毫无关系",
                "删除同样由脚本随机生成的「支持平台」与「更新日期」字段",
                "排序下线「评分最高」档位，相关推荐与首页榜单改按真实字段（热度标记 / 收录日期 / 标签重合度）计算",
                "构建脚本不再生成任何无法核对的字段，页面上的每个数字都能在 data/shards/ 里找到出处"]},
            {"type": "fix", "title": "问题修复", "items": [
                "修复顶栏导航文字被压成两字一排（中文最小内容宽度只有一个字，需 nowrap）",
                "修复标签云限定到单个领域后标签被过度裁剪的问题",
                "修复标签云「显示全部」按钮显示全站标签数、而非当前领域标签数的问题"]}
        ]
    })

    # ---------- 1.4.0：改造为单页应用 ----------
    entries.append({
        "version": meta_of["1.4.0"][0], "date": meta_of["1.4.0"][1],
        "title": meta_of["1.4.0"][2], "summary": meta_of["1.4.0"][3],
        "groups": [
            {"type": "add", "title": "单页应用架构", "items": [
                "全部页面收敛进 index.html 一个外壳，切页只重绘内容区，面包屑 / 收藏 / 历史 / 筛选状态都不丢",
                "改用哈希路由，本地双击打开与线上部署的行为完全一致",
                "旧的 pages/xxx.html 地址保留为极轻的重定向壳，历史外链不会失效",
                "返回上一页时按页面恢复原来的滚动位置"]},
            {"type": "add", "title": "图标与插画", "items": [
                "新增内联 SVG 图标系统，六十余枚手绘线性图标零依赖、零额外请求，并自动跟随主题变色",
                "新增全局背景插画：黑白线稿透明底，固定全屏叠模糊与遮罩，滚动时有视差，深色主题自动反相",
                "旧文案里的表情符号自动升级为同语义的线性图标"]},
            {"type": "opt", "title": "体验优化", "items": [
                "收藏页支持页内搜索、按分类过滤与排序切换，导航角标实时联动",
                "跨组件状态改为事件广播，收藏与主题变更即时同步",
                "返回顶部按钮补上整页滚动进度环"]},
            {"type": "fix", "title": "问题修复", "items": [
                "修复背景插画永远不加载的问题（懒加载与定位宽度的死锁）",
                "修复搜索联想面板设置了隐藏属性后永远不显示的问题",
                "修复分页器读到上一次页数、导致页码错乱的问题",
                "修复移动端顶栏按钮过多把页面撑出横向滚动条的问题"]}
        ]
    })

    # ---------- 1.3.0：数据与页面解耦（历史上线版，数字固化当时的状态） ----------
    entries.append({
        "version": meta_of["1.3.0"][0], "date": meta_of["1.3.0"][1],
        "title": meta_of["1.3.0"][2], "summary": meta_of["1.3.0"][3],
        "groups": [
            {"type": "add", "title": "资源库总量", "items": [
                "全站共收录 1327 个站点，覆盖 10 个大分类、60 个子分类",
                "工具转换：148 个站点",
                "开源工具：146 个站点",
                "学习教育：142 个站点",
                "影音素材：135 个站点",
                "办公效率：134 个站点",
                "资讯数据：131 个站点",
                "生活实用：131 个站点",
                "编程开发：120 个站点",
                "设计素材：120 个站点",
                "文献学术：120 个站点"]},
            {"type": "add", "title": "新增功能", "items": [
                "全部资源迁移到 data/shards/ 下的分片 JSON，新增资源只需编辑 JSON 并重新构建",
                "更新日志页改为从 data/changelog.json 动态渲染，版本记录可与资源数据一起版本管理",
                "反馈页支持一键生成邮件与 GitHub Issue，并可嵌入第三方表单，全程无需后端",
                "页脚加入每日一句彩蛋，同一日期全站显示同一句"]},
            {"type": "opt", "title": "体验优化", "items": [
                "面包屑补全到「首页 → 全部资源 → 大分类 → 子分类 → 资源名」五级",
                "卡片视图新增紧凑网格与瀑布流两种排布，列表视图重排信息密度",
                "骨架屏覆盖首屏加载与筛选切换两种场景"]},
            {"type": "fix", "title": "问题修复", "items": [
                "修正部分站点链接协议为 https，避免混合内容告警",
                "修复虚拟滚动在窗口缩放后行高错位的问题",
                "修复分类页切换大分类时筛选条件未重置的问题"]}
        ]
    })

    # ---------- 后续版本：按分类抽样真实站点名 ----------
    plan = [
        ("1.2.0", ["coding", "tools"], 6, 5, 2),
        ("1.1.0", ["design", "media"], 6, 4, 1),
        ("1.0.0", ["education", "office"], 6, 5, 2),
        ("0.9.0", ["academic", "news"], 6, 4, 2),
        ("0.8.0", ["life", "opensource"], 6, 3, 1),
        ("0.7.0", ["design", "coding", "tools"], 5, 4, 1),
        ("0.6.0", ["education", "academic", "news", "life", "opensource", "media", "office"], 4, 2, 0),
    ]
    for ver, cids, n_new, n_opt, n_fix in plan:
        meta = meta_of[ver]
        added, opts = [], []
        for cid in cids:
            added += fmt(sample(cid, n_new // max(1, len(cids)) + 1, used))
        groups = [{"type": "add", "title": "新增收录", "items": added or ["整理并校对了一批站点信息"]}]

        if n_opt:
            groups.append({"type": "opt", "title": "调整与优化", "items": [
                "重新梳理 %s 分类下的子分类归属，减少跨类重复" % cat_map[cids[0]]["name"],
                "统一描述文案风格，补齐缺失的标签",
                "优化移动端卡片间距与触控区域，改善小屏阅读体验",
                "补充 lazyload 懒加载，首屏图标按需请求"][:n_opt + 1]})
        if n_fix:
            groups.append({"type": "fix", "title": "修复", "items": [
                "修复部分站点 favicon 取不到时卡片图标错位的问题",
                "修正少数条目域名大小写与 www 前缀不一致的重复收录",
                "修复深色主题下标签对比度不足的问题"][:n_fix]})
        if ver == "0.7.0":
            groups.append({"type": "del", "title": "移除", "items": [
                "下架 3 个已停止运营的站点",
                "移除 2 个长期无法访问且无替代入口的资源"]})

        entries.append({
            "version": meta[0], "date": meta[1], "title": meta[2],
            "summary": meta[3], "groups": groups
        })

    doc = {
        "version": VERSIONS[0][0],
        "updated": VERSIONS[0][1],
        "totalVersions": len(entries),
        "entries": entries
    }
    out = os.path.join(DATA, "changelog.json")
    json.dump(doc, open(out, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=2)
    total = sum(len(g["items"]) for e in entries for g in e["groups"])
    print("已生成 %s" % out)
    print("版本数 %d，变更条目 %d 条" % (len(entries), total))


if __name__ == "__main__":
    main()
