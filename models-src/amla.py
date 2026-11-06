"""Amla (Indian gooseberry): a young potted tree with feathery sprays of tiny
leaflets along its branches and round fruits hanging close to the wood.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/amla.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

TRUNK_HEIGHT = 0.24  # above the soil
# (yaw in degrees, tilt in degrees, length): low, wide-spreading branches, unlike neem's upright ones.
BRANCHES = [(15, 22, 0.20), (85, 30, 0.18), (160, 20, 0.21), (235, 28, 0.19), (305, 24, 0.20)]


def build():
    lib.clear_scene()
    lib.make_pot()
    trunk_top = (0.0, 0.0, lib.POT_HEIGHT + TRUNK_HEIGHT)
    lib.make_stem((0, 0, lib.PLANT_BASE), trunk_top, radius=0.013)
    for yaw_deg, tilt_deg, length in BRANCHES:
        yaw, tilt = math.radians(yaw_deg), math.radians(tilt_deg)
        tip = lib.step(trunk_top, yaw, tilt, length)
        lib.make_stem(trunk_top, tip, radius=0.008)
        # Four level sprays per branch, alternating sides: amla's leaves are many tiny
        # leaflets in two neat rows, held flat, which gives the tree its feathery look.
        for t, spread in ((0.35, 60), (0.55, -60), (0.8, 55), (1.0, 0)):
            lib.make_compound_leaf(lib.lerp(trunk_top, tip, t), yaw + math.radians(spread),
                                   math.radians(8), 0.15, pairs=8, leaflet_len=0.03,
                                   leaflet_ratio=0.45, mat_key="leaf_dark")
        # Fruits hang just under the branch; light green against the darker leaflets.
        for t in (0.45, 0.75):
            under = lib.lerp(trunk_top, tip, t)
            lib.make_berry((under[0], under[1], under[2] - 0.03), 0.018, "leaf")


build()
lib.save_plant("amla")
