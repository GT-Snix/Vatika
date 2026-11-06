"""Tulsi (holy basil): a few upright stems, small oval leaves in opposite
pairs, and a purple flower spike on top of each stem.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/tulsi.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

ROOT = Path(__file__).resolve().parent.parent
GLB_PATH = ROOT / "client" / "public" / "models" / "tulsi.glb"
PREVIEW_PATH = ROOT / "models-src" / "previews" / "tulsi.png"

# (base x, base y, top x, top y, top height above soil, starting yaw in degrees)
# One tall centre stem and four shorter ones leaning outward, like a bushy pot.
STEMS = [
    (0.00, 0.00, 0.00, 0.00, 0.42, 0),
    (0.03, 0.01, 0.13, 0.02, 0.34, 30),
    (-0.02, 0.03, -0.08, 0.11, 0.32, 75),
    (-0.01, -0.03, -0.05, -0.12, 0.30, 50),
    (0.02, -0.02, 0.09, -0.09, 0.27, 10),
]
LEAF_NODES = [0.12, 0.28, 0.44, 0.60, 0.75, 0.88]  # where leaf pairs sit, as a fraction of stem length


def lerp(a, b, t):
    """Point a fraction t of the way from a to b."""
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def leaf_pairs(start, end, first_yaw):
    """Opposite leaf pairs; each pair is turned 90 degrees from the one below,
    which is how basil grows (and stops the pairs hiding each other)."""
    for i, t in enumerate(LEAF_NODES):
        yaw = math.radians(first_yaw) + i * math.pi / 2
        length = 0.11 * (1 - 0.45 * t)  # leaves shrink toward the top
        tilt = math.radians(20 + 35 * t)  # and point more upward
        mat = "leaf_dark" if i % 2 else "leaf"  # alternate shades so pairs read separately
        for side in (0, math.pi):  # opposite: the second leaf is 180 degrees round
            lib.make_leaf(lerp(start, end, t), yaw + side, tilt, length, length * 0.8, mat)


def flower_spike(top, height):
    """Thin stalk with small whorls of purple buds, smaller toward the tip."""
    tip = (top[0], top[1], top[2] + height)
    lib.make_stem(top, tip, radius=0.004)
    whorls = 4
    for w in range(whorls):
        t = (w + 0.5) / whorls
        centre = lerp(top, tip, t)
        radius = 0.016 * (1 - 0.5 * t)
        for k in range(3):  # 3 buds around the stalk at each level
            a = k * 2 * math.pi / 3 + w * 0.6  # twist each level so buds don't line up
            pos = (centre[0] + radius * math.cos(a), centre[1] + radius * math.sin(a), centre[2])
            lib.make_berry(pos, 0.011 * (1 - 0.4 * t), "flower")


def build():
    lib.clear_scene()
    lib.make_pot()
    soil = lib.POT_HEIGHT
    for bx, by, tx, ty, h, yaw in STEMS:
        start, end = (bx, by, soil), (tx, ty, soil + h)
        lib.make_stem(start, end)
        leaf_pairs(start, end, yaw)
        # Centre spike is longest so the plant tops out at about 0.8 m.
        flower_spike(end, 0.16 if h == STEMS[0][4] else 0.09)


build()
print(f"TRIANGLES {lib.triangle_count()}")
GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
plant = lib.export_glb(GLB_PATH)
print(f"SIZE {tuple(round(d, 3) for d in plant.dimensions)} (x, y, z in metres; z = height)")
lib.render_preview(PREVIEW_PATH)
print(f"WROTE {GLB_PATH} and {PREVIEW_PATH}")
