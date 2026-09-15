# -*- coding: utf-8 -*-
"""把整个静态站点一次性推到 GitHub —— 不依赖本机 git / gh，纯 HTTPS 调用。

为什么要这个脚本
----------------
网页端拖拽上传有三个坑，全部绕不过去：
  1. 点开头的文件 / 文件夹一律拒绝（`.github/`、`.nojekyll`、`.gitignore`）→ "the file is hidden"
  2. 空文件读不出内容 → "Something went really wrong, and we can't process that file."
  3. 一次拖太多、嵌套太深会整批失败
走 REST API 这些都不存在。另外这里是**先把所有文件打成一棵 tree 再产出单个 commit**，
不是 86 次 PUT 逐个写，速度快而且在 GitHub 上看着就是一次干净的提交。

准备令牌（经典 PAT）
--------------------
https://github.com/settings/tokens  →  Generate new token (classic)
勾选：repo（私有仓库才需要全勾，公开仓库 public_repo 即可）、workflow、pages
生成后复制 ghp_ 开头那一串。

用法
----
    python tools/publish_github.py --token ghp_xxx --repo resource-ark
    python tools/publish_github.py --token ghp_xxx --repo resource-ark --private
    python tools/publish_github.py --token ghp_xxx --repo resource-ark --branch main

仓库已存在也没关系：会以它当前的 main 为基底增量写入（新文件加进去、同名文件覆盖），
不会清掉已经传上去的东西。
"""
import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.github.com"

# 这些目录/文件是本地产物，不该进仓库
EXCLUDE_DIRS = {"_shots", ".git", "__pycache__", "node_modules", ".vscode"}
EXCLUDE_FILES = {"_verify_out.txt", "_attr.txt", "_probe_env.txt", ".DS_Store", "desktop.ini"}
EXCLUDE_EXT = (".pyc", ".tmp", ".bak")


def api(method, path, token, body=None, allow_fail=False):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("Authorization", "Bearer " + token)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "resource-ark-publisher")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        if allow_fail:
            return {"__error__": e.code, "__detail__": detail[:300]}
        sys.exit("  ✗ GitHub API %s %s 失败（HTTP %d）\n    %s" % (method, path, e.code, detail[:600]))


def collect(root):
    """列出要上传的文件，返回 [(仓库内相对路径, 本地绝对路径)]"""
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        if os.path.abspath(dirpath) == os.path.abspath(root):
            # 根目录：保留隐藏文件（.nojekyll 等）和 .github/，
            # 其余点开头的目录（.git/.vscode 之类）一律不进仓库
            keep = lambda d: d == ".github" or (d not in EXCLUDE_DIRS and not d.startswith("."))
        else:
            keep = lambda d: d not in EXCLUDE_DIRS
        dirnames[:] = [d for d in dirnames if keep(d)]
        for fn in filenames:
            if fn in EXCLUDE_FILES or fn.endswith(EXCLUDE_EXT):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root).replace("\\", "/")
            files.append((rel, full))
    return sorted(files)


def main():
    ap = argparse.ArgumentParser(description="不用 git，把静态站点整个推到 GitHub")
    ap.add_argument("--token", required=True, help="GitHub Personal Access Token（ghp_ 开头）")
    ap.add_argument("--repo", required=True, help="仓库名，例如 resource-ark")
    ap.add_argument("--owner", default="", help="用户名，留空则用令牌反查")
    ap.add_argument("--dir", default=".", help="站点根目录，默认当前目录")
    ap.add_argument("--branch", default="main", help="目标分支，默认 main")
    ap.add_argument("--message", default="", help="提交说明")
    ap.add_argument("--private", action="store_true", help="建私有仓库（默认公开）")
    ap.add_argument("--no-pages", action="store_true", help="跳过开启 GitHub Pages")
    args = ap.parse_args()

    root = os.path.abspath(args.dir)
    token = args.token.strip()
    print("站点目录：%s" % root)

    # ---------- 1. 确认身份 ----------
    me = api("GET", "/user", token)
    owner = args.owner or me.get("login", "")
    print("GitHub 用户：%s" % owner)

    # ---------- 2. 仓库不存在就建 ----------
    exists = api("GET", "/repos/%s/%s" % (owner, args.repo), token, allow_fail=True)
    created = False
    if "__error__" in exists:
        payload = {"name": args.repo, "private": args.private,
                   "description": "资源方舟 ResourceArk —— 纯静态资源导航站",
                   "auto_init": False, "has_issues": True}
        api("POST", "/user/repos", token, payload)
        created = True
        print("已创建仓库：%s/%s（%s）" % (owner, args.repo, "私有" if args.private else "公开"))
    else:
        print("仓库已存在：%s —— 采用增量写入" % exists.get("full_name"))
        args.branch = exists.get("default_branch", args.branch)

    repo_path = "/repos/%s/%s" % (owner, args.repo)

    # ---------- 3. 拿基底 tree（已有内容时不覆盖） ----------
    files = collect(root)

    def head_commit():
        ref = api("GET", repo_path + "/git/ref/heads/%s" % args.branch, token, allow_fail=True)
        if "__error__" in ref:
            return None, None
        sha = ref["object"]["sha"]
        tree = api("GET", repo_path + "/git/commits/%s" % sha, token)["tree"]["sha"]
        return sha, tree

    parent, base_tree = head_commit()

    # 完全空的仓库连 blob 都建不了（HTTP 409 "Git Repository is empty"），
    # 先用一个真实文件通过 Contents API 落地第一个提交，之后才能走 git data API。
    if not parent:
        seed_rel, seed_full = next((r, f) for r, f in files if os.path.getsize(f) > 0)
        with open(seed_full, "rb") as f:
            seed_b64 = base64.b64encode(f.read()).decode("ascii")
        api("PUT", repo_path + "/contents/" + urllib.parse.quote(seed_rel), token,
            {"message": args.message or "初始化仓库", "content": seed_b64})
        parent, base_tree = head_commit()
        print("空仓库已用 %s 造出首个提交 %s" % (seed_rel, parent[:8]))
    else:
        print("基底提交：%s（%s）" % (parent[:8], args.branch))

    # ---------- 4. 逐个文件建 blob ----------
    print("待上传 %d 个文件：\n" % len(files))
    tree = []
    for rel, full in files:
        with open(full, "rb") as f:
            raw = f.read()
        b64 = base64.b64encode(raw).decode("ascii")
        blob = api("POST", repo_path + "/git/blobs", token,
                   {"content": b64, "encoding": "base64"})
        tree.append({"path": rel, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        size = len(raw)
        unit = "%d B" % size if size < 1024 else "%.1f KB" % (size / 1024.0)
        print("  ✓ %-46s %s" % (rel, unit))

    # ---------- 5. 建 tree → 建 commit → 移动分支指针 ----------
    payload = {"tree": tree}
    if base_tree:
        payload["base_tree"] = base_tree
    new_tree = api("POST", repo_path + "/git/trees", token, payload)

    msg = args.message or ("资源方舟：收录 %d 个站点 · 纯静态导航站" % 1446)
    payload = {"message": msg, "tree": new_tree["sha"]}
    if parent:
        payload["parents"] = [parent]
    new_commit = api("POST", repo_path + "/git/commits", token, payload)

    if parent:
        api("PATCH", repo_path + "/git/refs/heads/%s" % args.branch, token, {"sha": new_commit["sha"]})
    else:
        api("POST", repo_path + "/git/refs", token,
            {"ref": "refs/heads/%s" % args.branch, "sha": new_commit["sha"]})

    print("\n✓ 已推送 %d 个文件，单个提交 %s" % (len(files), new_commit["sha"][:8]))
    print("  仓库地址：https://github.com/%s/%s" % (owner, args.repo))

    # ---------- 6. 开启 Pages（GitHub Actions 模式） ----------
    if args.no_pages:
        return
    pages = api("POST", repo_path + "/pages", token,
                {"build_type": "workflow", "source": {"branch": args.branch, "path": "/"}},
                allow_fail=True)
    if "__error__" in pages:
        print("  ⚠ Pages 未能自动开启（HTTP %s），请到 "
              "Settings → Pages → Source 手动选 GitHub Actions" % pages["__error__"])
    else:
        url = pages.get("html_url") or "https://%s.github.io/%s/" % (owner, args.repo)
        print("  Pages 已开启：%s" % url)
        print("  首次部署约需 1–2 分钟，看进度：https://github.com/%s/%s/actions" % (owner, args.repo))


if __name__ == "__main__":
    main()
