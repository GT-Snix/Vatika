"""Aloe Vera: a tight, stemless rosette of 10 thick, fleshy leaves, broad at
the base and tapering to a point, with small teeth along their edges.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/aloe_vera.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

# Two rings, outside first: (leaves, length, base width, thickness, tilt in degrees, yaw offset).
# The inner ring's offset puts its leaves in the gaps of the outer ring.
RINGS = [
    (6, 0.28, 0.13, 0.05, 30, 0),
    (4, 0.25, 0.11, 0.045, 58, 45),
]
ROSETTE_RADIUS = 0.015  # leaf bases sit on this tiny circle: a tight rosette


def build():
    lib.start("aloe_vera", "stone")
    for count, length, width, thickness, tilt, offset in RINGS:
        for k in range(count):
            yaw = math.radians(offset + k * 360 / count)
            # Base just under the soil, a little out from the centre, on the leaf's own side.
            base = lib.step((0, 0, lib.PLANT_BASE), yaw, 0, ROSETTE_RADIUS)
            # Aloe greens skew grey-blue in life; the palette's deeper greens suit it best.
            green = lib.rng.choice(["leaf_deep", "leaf_mid", "leaf_mid"])
            lib.make_aloe_leaf(base, yaw, math.radians(tilt), length, width, thickness, green)


build()
lib.save_plant("aloe_vera")
