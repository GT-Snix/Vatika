"""Neem: a young potted tree. One trunk splits into a few branches, each
ending in feather-like compound leaves made of narrow, pointed leaflets.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/neem.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

TRUNK_HEIGHT = 0.24  # above the soil
# Branches leave the top of the trunk: (yaw in degrees, tilt in degrees, length).
BRANCHES = [(0, 58, 0.20), (72, 64, 0.18), (144, 55, 0.21), (216, 62, 0.19), (288, 56, 0.20)]


def build():
    lib.clear_scene()
    lib.make_pot()
    # Thicker than a herb stem: this is a woody trunk.
    trunk_top = (0.0, 0.0, lib.POT_HEIGHT + TRUNK_HEIGHT)
    lib.make_stem((0, 0, lib.PLANT_BASE), trunk_top, radius=0.014)
    for n, (yaw_deg, tilt_deg, length) in enumerate(BRANCHES):
        yaw, tilt = math.radians(yaw_deg), math.radians(tilt_deg)
        tip = lib.step(trunk_top, yaw, tilt, length)
        lib.make_stem(trunk_top, tip, radius=0.008)
        # A fan of five compound leaves at each branch tip; the side ones arch lower,
        # which rounds the crown off like a real neem's.
        for spread in (-70, -35, 0, 35, 70):
            leaf_tilt = math.radians(45 - abs(spread) * 0.6)
            lib.make_compound_leaf(tip, yaw + math.radians(spread), leaf_tilt, 0.19,
                                   pairs=5, leaflet_len=0.06, leaflet_ratio=0.35,
                                   mat_key="leaf_dark" if n % 2 else "leaf")


build()
lib.save_plant("neem")
