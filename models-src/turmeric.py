"""Turmeric: a clump of large, long oval leaves, each held up on its own
long stalk rising from the soil. (The useful rhizome is underground, so unseen.)

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/turmeric.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

# One entry per leaf: (yaw in degrees, stalk length, leaf length, leaf tilt in degrees).
# Inner leaves are taller and more upright; outer ones arch out further.
LEAVES = [
    (0, 0.26, 0.34, 62),
    (50, 0.20, 0.30, 42),
    (100, 0.24, 0.32, 55),
    (150, 0.28, 0.34, 66),
    (200, 0.19, 0.29, 40),
    (245, 0.25, 0.33, 58),
    (295, 0.21, 0.31, 48),
    (335, 0.27, 0.33, 64),
]
STALK_TILT = math.radians(80)  # stalks rise almost straight up


def build():
    lib.clear_scene()
    lib.make_pot()
    for n, (yaw_deg, stalk_len, leaf_len, leaf_tilt) in enumerate(LEAVES):
        yaw = math.radians(yaw_deg)
        # Stalks start close together, as they grow from one rhizome.
        base = lib.step((0, 0, lib.PLANT_BASE), yaw, 0, 0.02)
        top = lib.step(base, yaw, STALK_TILT, stalk_len)
        lib.make_stem(base, top, radius=0.007)
        lib.make_leaf(top, yaw, math.radians(leaf_tilt), leaf_len, leaf_len * 0.45,
                      "leaf_dark" if n % 2 else "leaf")


build()
lib.save_plant("turmeric")
