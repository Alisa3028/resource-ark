# -*- coding: utf-8 -*-
"""
ResourceArk 数据构建脚本
------------------------------------------------------------------
职责：
  1. 读取 data/shards/*.json（每个大分类一个文件，是数据的唯一手工编辑入口）
  2. 与 data/categories.json 做一致性校验（cat / sub 必须存在）
  3. 全局按根域名去重（保留先出现的、热度更高的那条）
  4. 补全缺失的默认值（hot / lang / free / added）——
     **不生成任何编造字段**：页面上的每个数字都必须能在 shards 里找到出处
  5. 产出：
       data/resources.json        —— 运行时资源全集（HTTP 环境下 fetch 使用）
       data/tags.json             —— 标签索引（含计数与所属分类），供标签云/筛选
       data/stats.json            —— 站点统计快照
       assets/js/data-fallback.js —— file:// 直开时的兜底数据（window.__ARK_DATA__）
  6. 打印校验报告

用法：python tools/build-data.py
"""
import json
import os
import re
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SHARDS = os.path.join(DATA, "shards")

TODAY = datetime.date.today().isoformat()


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path, obj, pretty=True):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        if pretty:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        else:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path)


def root_domain(url):
    """取根域名，用于全局去重判断（example.co.uk 这类不深究，够用）。"""
    m = re.match(r"^https?://([^/]+)", url.strip())
    if not m:
        return ""
    host = m.group(1).lower().split(":")[0]
    # 资源库站点以 github.io / github.com/xxx 形式区分，这里保留完整 host + 一级路径
    path = url.strip().split(host, 1)[-1].rstrip("/")
    if host in ("github.com", "gitee.com", "gitlab.com") and path:
        seg = [s for s in path.split("/") if s]
        if seg:
            return host + "/" + seg[0].lower()
    return host[4:] if host.startswith("www.") else host


def stable_num(seed, lo, hi):
    """已废弃：曾用伪随机数生成评分 / 访问量等展示字段，属于编造数据，2026-09-15 起不再使用。
    保留函数体作为说明，任何新字段都不允许再用它造假。"""
    raise RuntimeError("stable_num 已废弃，请勿用它生成任何展示字段")


def main():
    cats_doc = load_json(os.path.join(DATA, "categories.json"))
    cat_map = {}
    sub_map = {}
    for c in cats_doc["categories"]:
        cat_map[c["id"]] = c
        for s in c["subcategories"]:
            sub_map[(c["id"], s["id"])] = s

    resources = []
    errors = []
    warns = []
    seen_domain = {}
    per_sub_count = {}

    shard_files = sorted(
        f for f in os.listdir(SHARDS) if f.endswith(".json")
    )
    for fn in shard_files:
        doc = load_json(os.path.join(SHARDS, fn))
        cat_id = doc["category"]
        if cat_id not in cat_map:
            errors.append("%s: 未知分类 %s" % (fn, cat_id))
            continue
        for it in doc["resources"]:
            rid = it.get("id", "?")
            # -- 必填字段校验 --
            for field in ("id", "name", "url", "desc", "tags", "cat", "sub"):
                if not it.get(field):
                    errors.append("%s: 条目 %s 缺少字段 %s" % (fn, rid, field))
            if it.get("cat") != cat_id:
                errors.append("%s: 条目 %s 的 cat 与文件不一致" % (fn, rid))
            if (cat_id, it.get("sub")) not in sub_map:
                errors.append("%s: 条目 %s 的 sub=%s 不存在" % (fn, rid, it.get("sub")))
                continue
            if not it["url"].startswith("https://"):
                warns.append("%s: %s 链接非 https" % (fn, rid))
            # -- 全局域名去重 --
            rd = root_domain(it["url"])
            if rd in seen_domain:
                warns.append(
                    "域名重复已丢弃 -> %s (%s) 与 %s 冲突" % (it["name"], rd, seen_domain[rd])
                )
                continue
            seen_domain[rd] = it["name"]

            # -- 只补全「无则给默认值」的字段，绝不生成任何编造数据 --
            # 历史遗留的 views / rating / platform / featured 曾由 stable_num() 伪随机生成，
            # 与真实站点毫无关系，已整体移除；页面上的每个数字都必须能在 shards 里找到出处。
            it["added"] = it.get("added") or TODAY
            it["hot"] = int(it.get("hot") or 0)
            it.setdefault("lang", "zh")
            it.setdefault("free", "free")
            resources.append(it)
            key = (it["cat"], it["sub"])
            per_sub_count[key] = per_sub_count.get(key, 0) + 1

    # 排序：分类 -> 子分类 -> 热门/宝藏靠前 -> 名称
    order = {c["id"]: i for i, c in enumerate(cats_doc["categories"])}
    sub_order = {}
    for c in cats_doc["categories"]:
        for i, s in enumerate(c["subcategories"]):
            sub_order[(c["id"], s["id"])] = i
    resources.sort(
        key=lambda r: (
            order[r["cat"]],
            sub_order[(r["cat"], r["sub"])],
            -r["hot"],
        )
    )

    # ---------- 产出 resources.json ----------
    res_doc = {
        "version": cats_doc["version"],
        "updated": TODAY,
        "count": len(resources),
        "items": resources,
    }
    size = dump_json(os.path.join(DATA, "resources.json"), res_doc)

    # ---------- 产出 tags.json ----------
    tag_stat = {}
    for r in resources:
        for t in r["tags"]:
            e = tag_stat.setdefault(t, {"name": t, "count": 0, "cats": {}})
            e["count"] += 1
            e["cats"][r["cat"]] = e["cats"].get(r["cat"], 0) + 1
    tags = sorted(tag_stat.values(), key=lambda x: (-x["count"], x["name"]))
    for t in tags:
        t["cats"] = sorted(t["cats"].items(), key=lambda kv: -kv[1])
    dump_json(os.path.join(DATA, "tags.json"), {"total": len(tags), "tags": tags})

    # ---------- 产出 stats.json ----------
    stats = {
        "updated": TODAY,
        "total": len(resources),
        "categories": [],
        "tagTotal": len(tags),
        "hotCount": sum(1 for r in resources if r["hot"] == 1),
        "gemCount": sum(1 for r in resources if r["hot"] == 2),
        "freeCount": sum(1 for r in resources if r["free"] == "free"),
        "langCount": {},
    }
    for k, v in [("zh", 0), ("en", 0), ("multi", 0)]:
        stats["langCount"][k] = sum(1 for r in resources if r["lang"] == k)
    for c in cats_doc["categories"]:
        subs = []
        ctotal = 0
        for s in c["subcategories"]:
            n = per_sub_count.get((c["id"], s["id"]), 0)
            ctotal += n
            subs.append({"id": s["id"], "name": s["name"], "desc": s["desc"], "count": n})
        stats["categories"].append(
            {
                "id": c["id"],
                "name": c["name"],
                "icon": c["icon"],
                "accent": c["accent"],
                "desc": c["desc"],
                "count": ctotal,
                "subcategories": subs,
            }
        )
    dump_json(os.path.join(DATA, "stats.json"), stats)

    # ---------- 产出 file:// 兜底数据 ----------
    # file:// 环境下浏览器禁止 fetch 本地 JSON，因此把同一批数据整体打包成 JS。
    # 只要 JSON 变了，这里跟着重新构建即可，两份数据永远一致。
    def maybe(name, default):
        p = os.path.join(DATA, name)
        return load_json(p) if os.path.exists(p) else default

    bundle = {
        "categories": cats_doc,
        "resources": res_doc,
        "tags": {"total": len(tags), "tags": tags},
        "stats": stats,
        "site": maybe("site.json", {}),
        "quotes": maybe("quotes.json", {}),
        "changelog": maybe("changelog.json", {}),
    }
    js_path = os.path.join(ROOT, "assets", "js", "data-fallback.js")
    with open(js_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* 自动生成，请勿手改：由 tools/build-data.py 从 data/*.json 生成。\n")
        f.write("   用途：本地以 file:// 直接打开页面时，浏览器禁止 fetch 本地 JSON，\n")
        f.write("   此处提供同一份数据的 JS 兜底；部署到 HTTP 环境后会自动优先走 fetch。 */\n")
        f.write("window.__ARK_DATA__ = ")
        json.dump(bundle, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    js_size = os.path.getsize(js_path)

    # ---------- 报告 ----------
    print("=" * 62)
    print("ResourceArk 数据构建报告")
    print("=" * 62)
    print("分片文件          : %d 个" % len(shard_files))
    print("有效资源条目      : %d 条" % len(resources))
    print("resources.json    : %.1f KB" % (size / 1024))
    print("data-fallback.js  : %.1f KB" % (js_size / 1024))
    print("标签总数          : %d 个" % len(tags))
    print("热门 / 宝藏       : %d / %d" % (stats["hotCount"], stats["gemCount"]))
    print("-" * 62)
    for c in stats["categories"]:
        print("  %-10s %-6s 共 %3d 条  | %s" % (
            c["id"], c["name"], c["count"],
            " ".join("%s(%d)" % (s["name"], s["count"]) for s in c["subcategories"]),
        ))
    print("-" * 62)
    bad_sub = [(k, v) for k, v in per_sub_count.items() if v < 15]
    if bad_sub:
        print("!! 条目偏少的子分类：", bad_sub)
    if warns:
        print("警告 %d 条：" % len(warns))
        for w in warns[:20]:
            print("   -", w)
    if errors:
        print("错误 %d 条：" % len(errors))
        for e in errors[:20]:
            print("   -", e)
    else:
        print("字段校验：全部通过，无错误。")
    print("=" * 62)


if __name__ == "__main__":
    main()
