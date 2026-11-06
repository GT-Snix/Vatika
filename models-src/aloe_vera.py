"""Aloe Vera: a stemless rosette of thick, pointed leaves rising straight
from the soil, outer leaves spreading low and inner ones standing upright.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/aloe_vera.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

# Rings from outside to centre: (leaves in ring, blade length, tilt above horizontal in degrees,
# yaw offset in degrees). Offsetting each ring puts its leaves in the gaps of the ring below.
RINGS = [
    (7, 0.36, 25, 0),
    (6, 0.42, 45, 25),
    (5, 0.42, 63, 8),
    (3, 0.36, 78, 50),
]
BLADE_WIDTH = 0.08


def build():
    lib.clear_scene()
    lib.make_pot()
    for r, (count, length, tilt, offset) in enumerate(RINGS):
        mat = "leaf_dark" if r % 2 == 0 else "leaf"  # alternate shades so rings read separately
        for k in range(count):
            yaw = math.radians(offset + k * 360 / count)
            # All blades grow from the centre, starting just under the soil.
            lib.make_blade((0, 0, lib.PLANT_BASE), yaw, math.radians(tilt),
                           length, BLADE_WIDTH, mat)


build()
lib.save_plant("aloe_vera")
