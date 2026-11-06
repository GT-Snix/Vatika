"""Amla (Indian gooseberry): a young potted tree whose branches leave the
trunk at different heights and arch outward, hung with drooping, curved
branchlets of tiny leaflets and clusters of round pale-green fruit.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/amla.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

TRUNK_HEIGHT = 0.36  # above the soil
GOLDEN_ANGLE = math.radians(137.5)  # each branch turns this far from the last: no neat spokes
# Branches leave the trunk at these fractions of its height (low ones first),
# so the crown is a layered dome rather than one palm-like burst at the top.
BRANCH_STARTS = [0.42, 0.56, 0.70, 0.84, 1.0]


def branch(start, yaw):
    """An arching branch (two pieces, bending downward) with branchlets and fruit."""
    tilt = math.radians(rng_between(22, 38))
    length = rng_between(0.17, 0.21)
    mid = lib.step(start, yaw, tilt, length / 2)
    tip = lib.step(mid, yaw, tilt - math.radians(30), length / 2)
    lib.make_path([start, mid, tip], radius=0.007)
    # Branchlets droop hard (droop ~ 50 degrees), which is what makes amla look soft
    # and weeping instead of stiff and palm-like.
    for t, side in ((0.45, 1), (0.75, -1), (1.0, 0)):
        at = lib.lerp(start, mid, t * 2) if t < 0.5 else lib.lerp(mid, tip, t * 2 - 1)
        lib.make_compound_leaf(at, yaw + side * math.radians(55), math.radians(15), 0.15,
                               pairs=6, leaflet_len=0.028, leaflet_ratio=0.45, droop=0.9)
    # Fruit clusters hang right under the wood, as amla fruit does.
    for t in (0.35, 0.8):
        x, y, z = lib.lerp(start, mid, t * 2) if t < 0.5 else lib.lerp(mid, tip, t * 2 - 1)
        for k in range(3):
            a = k * 2 * math.pi / 3
            lib.make_berry((x + 0.016 * math.cos(a), y + 0.016 * math.sin(a), z - 0.02 - 0.008 * k),
                           0.015, "amla_fruit")


def rng_between(low, high):
    return lib.rng.uniform(low, high)


def build():
    lib.start("amla", "terracotta")
    trunk_top = lib.lean((0.0, 0.0, lib.POT_HEIGHT + TRUNK_HEIGHT), 0.02)
    trunk_base = (0, 0, lib.PLANT_BASE)
    lib.make_stem(trunk_base, trunk_top, radius=0.013)
    for i, t in enumerate(BRANCH_STARTS):
        branch(lib.lerp(trunk_base, trunk_top, t), i * GOLDEN_ANGLE + lib.jitter(15))


build()
lib.save_plant("amla")
