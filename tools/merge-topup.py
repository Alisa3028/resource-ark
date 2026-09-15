# -*- coding: utf-8 -*-
"""
ResourceArk 补充数据合并脚本
------------------------------------------------------------------
把 data/_topup/*.json 中新增的资源追加进 data/shards/<cat>.json，
追加完成后删除 _topup 目录，保持「一个大分类 = 一个分片文件」的干净结构。

用法：python tools/merge-topup.py
"""
import json
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SHARDS = os.path.join(DATA, "shards")
TOPUP = os.path.join(DATA, "_topup")


def main():
    if not os.path.isdir(TOPUP):
        print("没有 _topup 目录，无需合并。")
        return
    total = 0
    for fn in sorted(os.listdir(TOPUP)):
        if not fn.endswith(".json"):
            continue
        top = json.load(open(os.path.join(TOPUP, fn), encoding="utf-8"))
        cat = top["category"]
        target = os.path.join(SHARDS, cat + ".json")
        if not os.path.exists(target):
            print("跳过 %s：找不到分片 %s" % (fn, target))
            continue
        main_doc = json.load(open(target, encoding="utf-8"))
        exist_ids = {r["id"] for r in main_doc["resources"]}
        added = 0
        for r in top["resources"]:
            if r["id"] in exist_ids:
                print("  ! id 冲突已跳过：", r["id"])
                continue
            main_doc["resources"].append(r)
            exist_ids.add(r["id"])
            added += 1
        json.dump(main_doc, open(target, "w", encoding="utf-8", newline="\n"),
                  ensure_ascii=False, indent=2)
        total += added
        print("合并 %-16s -> %s  (+%d 条，现共 %d 条)"
              % (fn, cat + ".json", added, len(main_doc["resources"])))
    shutil.rmtree(TOPUP)
    print("-" * 50)
    print("合并完成，共新增 %d 条，_topup 目录已清理。" % total)


if __name__ == "__main__":
    main()
