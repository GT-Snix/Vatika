"""Neem: a young potted tree. One trunk splits into a few branches, each
ending in arching, feather-like compound leaves of narrow, pointed leaflets.

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
    lib.start("neem", "glazed")
    # Thicker than a herb stem: this is a woody trunk, leaning a touch.
    trunk_top = lib.lean((0.0, 0.0, lib.POT_HEIGHT + TRUNK_HEIGHT), 0.02)
    lib.make_stem((0, 0, lib.PLANT_BASE), trunk_top, radius=0.014)
    for yaw_deg, tilt_deg, length in BRANCHES:
        yaw = math.radians(yaw_deg) + lib.jitter(15)
        tilt = math.radians(tilt_deg) + lib.jitter(8)
        tip = lib.step(trunk_top, yaw, tilt, length)
        lib.make_stem(trunk_top, tip, radius=0.008)
        # A fan of four compound leaves at each branch tip; the side ones start lower,
        # and all of them arch over (droop), which rounds the crown like a real neem's.
        for spread in (-60, -20, 20, 60):
            leaf_tilt = math.radians(50 - abs(spread) * 0.5)
            lib.make_compound_leaf(tip, yaw + math.radians(spread), leaf_tilt, 0.19,
                                   pairs=5, leaflet_len=0.06, leaflet_ratio=0.35, droop=0.6)


build()
lib.save_plant("neem")
