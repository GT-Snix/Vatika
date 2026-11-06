"""Brahmi: a low, creeping marsh herb. Soft stems arch out of the pot and
trail over the rim, lined with small, fleshy leaves in opposite pairs.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/brahmi.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

SOIL = lib.POT_HEIGHT
# A trailing stem's path as (distance from centre, height). It must clear the rim
# (radius 0.185, top 0.22) before dropping, or it would pass through the pot.
TRAIL = [(0.02, lib.PLANT_BASE), (0.08, SOIL + 0.08), (0.16, SOIL + 0.08),
         (0.22, SOIL + 0.04), (0.27, SOIL - 0.04), (0.29, SOIL - 0.11)]
UPRIGHT = [(0.01, lib.PLANT_BASE), (0.03, SOIL + 0.10), (0.04, SOIL + 0.20)]
LEAF_LEN = 0.055


def stem_with_leaves(profile, yaw, flower=False):
    """Lay a stem along `profile` at angle `yaw`, with two leaf pairs along each piece."""
    # Each trail sags by its own random amount, so they don't hang in perfect symmetry.
    sag = lib.rng.uniform(0.85, 1.1)
    points = [(r * math.cos(yaw), r * math.sin(yaw), SOIL + (z - SOIL) * (sag if z < SOIL else 1))
              for r, z in profile]
    lib.make_path(points, radius=0.004)
    # A leaf pointing along (cos yaw, sin yaw) has make_leaf yaw = yaw - 90 degrees.
    heading = yaw - math.pi / 2
    for a, b in zip(points, points[1:]):
        for t in (0.3, 0.8):
            for side in (1, -1):  # opposite pair, sticking out to either side of the stem
                lib.make_leaf(lib.lerp(a, b, t), heading + side * math.radians(70),
                              math.radians(15), LEAF_LEN, LEAF_LEN * 0.55)
    if flower:
        lib.make_berry(points[-1], 0.012, "flower")  # a small bloom at the stem tip


def build():
    lib.start("brahmi", "stone")
    for k in range(7):
        stem_with_leaves(TRAIL, math.radians(k * 360 / 7) + lib.jitter(12))
    # A small upright mound in the middle, where the flowers sit.
    for k in range(5):
        stem_with_leaves(UPRIGHT, math.radians(30 + k * 72) + lib.jitter(20), flower=True)


build()
lib.save_plant("brahmi")
