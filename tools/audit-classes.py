# -*- coding: utf-8 -*-
"""类名覆盖率审计：找出「JS / HTML 用到、但 CSS 里没定义」的类名
------------------------------------------------------------------------------
为什么需要它：
  纯前端项目改成 SPA 后，大量类名是拼在 JS 字符串里生成的（U.el('div.foo')、
  cls: 'bar'、classList.add('baz')）。写错一个字母不会报任何错，只会静默失效。
  这个脚本把 JS / HTML 里出现的类名抓出来，与 CSS 中实际定义过的选择器做差集，
  差集里的每一条都是「样式没生效」的嫌疑点。

识别四类写法：
  class="a b"、cls: 'a b'、classList.add('a')、U.el('div.a.b')

说明：'.js-xxx' 这类纯行为钩子不需要样式，出现时属正常，人工忽略即可。

用法：
  python tools/audit-classes.py
"""
import os
import re
import collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS_DIR = os.path.join(ROOT, 'assets', 'js')
CSS_DIR = os.path.join(ROOT, 'assets', 'css')
HTML_FILES = [os.path.join(ROOT, 'index.html'), os.path.join(ROOT, '404.html')]

# 收集 CSS 中定义过的类选择器
css_classes = set()
for fn in os.listdir(CSS_DIR):
    if not fn.endswith('.css'):
        continue
    with open(os.path.join(CSS_DIR, fn), encoding='utf-8') as f:
        txt = f.read()
    # 去注释
    txt = re.sub(r'/\*.*?\*/', ' ', txt, flags=re.S)
    for m in re.finditer(r'\.(-?[_a-zA-Z][\w-]*)', txt):
        css_classes.add(m.group(1))

# 从 JS/HTML 文本里抓取候选 class 名
used = collections.Counter()


def feed(name, txt):
    # class="a b c"
    for m in re.finditer(r'class\s*[:=]\s*[\'"`]([^\'"`]+)[\'"`]', txt):
        for tok in m.group(1).split():
            tok = tok.strip()
            if re.fullmatch(r'-?[_a-zA-Z][\w-]*', tok):
                used[tok] += 1
    # cls: 'a b'  /  add('a')
    for m in re.finditer(r'\bcls\s*:\s*[\'"`]([^\'"`]*)[\'"`]', txt):
        for tok in m.group(1).split():
            if re.fullmatch(r'-?[_a-zA-Z][\w-]*', tok):
                used[tok] += 1
    for m in re.finditer(r"classList\.(?:add|remove|toggle)\(([^)]*)\)", txt):
        for lit in re.findall(r"""['"`]([^'"`]+)['"`]""", m.group(1)):
            for tok in lit.split():
                if re.fullmatch(r'-?[_a-zA-Z][\w-]*', tok):
                    used[tok] += 1
    # U.el('div.foo.bar', ...) 选择器写法（首段是标签名，跳过）
    for m in re.finditer(r"""\.el\(\s*['"`]([^'"`]+)['"`]""", txt):
        sel = m.group(1)
        for part in sel.split('.')[1:]:
            part = part.split('#')[0].strip()
            if re.fullmatch(r'-?[_a-zA-Z][\w-]*', part):
                used[part] += 1
    # 拼接写法：'a.card' + (cond ? '.on' : '')  -> 抓以点开头的字符串字面量
    for m in re.finditer(r"""['"`]\.([a-z][\w-]*)['"`]""", txt):
        used[m.group(1)] += 1


for dirpath, _, files in os.walk(JS_DIR):
    for fn in files:
        if fn.endswith('.js'):
            p = os.path.join(dirpath, fn)
            with open(p, encoding='utf-8') as f:
                feed(os.path.relpath(p, ROOT), f.read())

for p in HTML_FILES:
    if os.path.exists(p):
        with open(p, encoding='utf-8') as f:
            feed(os.path.basename(p), f.read())

# 纯行为钩子（只用于 querySelector / closest，不承载任何样式）不需要 CSS 定义
IGNORE = {'js-copy', 'js-fav', 'js-fav-ico', 'js-fav-txt', 'cls',
          # 与通用类叠加使用的语义标记：样式完全由 .modal / .fold 等承担
          'kbd-modal',
          # 拼接出来的类名前缀（'.tier-' + n，真实类名 tier-0..tier-5 都在 CSS 里）
          'tier-'}

# MIME 类型 / 文件扩展名会被字符串字面量正则误当成类名，这里按「明显不是 class」剔除
NOT_A_CLASS = {'json', 'md', 'csv', 'xml', 'html', 'txt', 'png', 'jpg', 'svg',
               'webp', 'js', 'css', 'zip', 'pdf'}

missing = sorted(c for c in used
                 if c not in css_classes and c not in IGNORE and c not in NOT_A_CLASS)

# 排除明显的非 class（工具类、第三方）
print('CSS 中已定义类数量: %d' % len(css_classes))
print('JS/HTML 中使用类数量: %d' % len(used))
print('未在 CSS 中定义的类: %d' % len(missing))
print('-' * 60)
for c in missing:
    print('%-28s x%d' % (c, used[c]))
