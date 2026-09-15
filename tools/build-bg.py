# -*- coding: utf-8 -*-
"""把黑白动漫少女插画处理成「可叠加的透明线条图」，并压缩输出。

思路（比直接去白底更干净）：
  线稿的白底其实是一张纸的亮度信息。这里把「亮度」直接转成「透明度」——
  越白越透明、越黑越不透明，于是白纸彻底消失，线条的抗锯齿边缘也完整保留，
  不会再出现抠图常见的白边 / 灰边光晕。

关于体积：
  这张图是要整屏铺开再叠高斯模糊的，高频细节在视觉上完全不可见。
  所以这里先把「模糊」烘焙进图片（省掉大部分细节），再降采样 + 降码率，
  一张原本 1.4MB 的线稿可以压到几十 KB，加载几乎无感。

输出：assets/img/bg-girl.webp（透明底，深浅主题共用，深色主题靠 invert 反转）
源图：tools/_src/bg-girl-source.png（刻意放在 assets 之外，不参与部署）
"""
import os
import sys
import glob

from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SRC_DIR = os.path.join(ROOT, "tools", "_src")
OUT_DIR = os.path.join(ROOT, "assets", "img")

TARGET_W = 720          # 输出宽度：模糊后 720px 铺满 2K 屏也看不出差别
BAKE_BLUR = 2.8         # 预处理阶段就模糊一次，大幅降低体积（CSS 端还会再模糊 10px+）
GAIN = 1.55             # 线条加浓系数，让淡淡的铅笔纹理保留一点存在感
GAMMA = 0.92            # 略微提亮中间调，避免线条边缘过脏
MAX_ALPHA = 235         # 不做到全黑，整体更柔和（真正的浓淡交给 CSS opacity 控制）
WEBP_Q = 62


def pick_source():
    files = []
    for ext in ("png", "jpg", "jpeg", "webp"):
        files += glob.glob(os.path.join(SRC_DIR, "*." + ext))
    if not files:
        sys.exit("没有在 %s 找到源图，请先放入一张黑白线稿。" % SRC_DIR)
    return sorted(files)[-1]


def luminance_alpha(src):
    """亮度 → 透明度，生成「黑线 + 透明底」的 RGBA 图。"""
    img = src.convert("L")
    img = img.filter(ImageFilter.MedianFilter(size=3))      # 抹掉纸纹噪点，保留线条

    alpha = ImageOps.invert(img)                            # 白 -> 0，黑 -> 255
    lut = []
    for v in range(256):
        a = min(255, int(v * GAIN))
        a = int(255 * ((a / 255.0) ** GAMMA))
        lut.append(min(MAX_ALPHA, a))
    alpha = alpha.point(lut)

    rgba = Image.new("RGBA", src.size, (0, 0, 0, 0))
    rgba.putalpha(alpha)
    return rgba


def main():
    src_path = pick_source()
    print("源图:", os.path.relpath(src_path, ROOT))
    src = Image.open(src_path)

    rgba = luminance_alpha(src)

    # 等比缩放（LANCZOS 保线条锐度）
    w, h = rgba.size
    if w > TARGET_W:
        rgba = rgba.resize((TARGET_W, int(round(h * TARGET_W / w))), Image.LANCZOS)

    # 烘焙一点模糊，体积能砍掉一大半，而视觉上本就是模糊的
    rgb = rgba.convert("RGB").filter(ImageFilter.GaussianBlur(BAKE_BLUR))
    rgba = Image.merge("RGBA", (rgb.split()[0], rgb.split()[1], rgb.split()[2],
                                rgba.getchannel("A").filter(ImageFilter.GaussianBlur(BAKE_BLUR * 0.6))))

    print("输出尺寸: %dx%d" % rgba.size)

    webp = os.path.join(OUT_DIR, "bg-girl.webp")
    rgba.save(webp, "WEBP", quality=WEBP_Q, method=6)
    print("  %-26s %7.1f KB" % (os.path.relpath(webp, ROOT), os.path.getsize(webp) / 1024.0))


if __name__ == "__main__":
    main()
