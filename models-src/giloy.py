"""Giloy: a climbing vine. Two strands spiral up a support stake, with broad
heart-like leaves and clusters of small red berries.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/giloy.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

STAKE_TOP = 0.80  # the stake sets the plant's height
SPIRAL_RADIUS = 0.03  # how far the vine sits from the stake's centre
POINTS_PER_TURN = 8


def spiral(turns, top, phase):
    """Points winding round the stake from the soil up to height `top`."""
    count = int(turns * POINTS_PER_TURN)
    points = []
    for i in range(count + 1):
        a = phase + 2 * math.pi * i / POINTS_PER_TURN
        z = lib.PLANT_BASE + (top - lib.PLANT_BASE) * i / count
        points.append((SPIRAL_RADIUS * math.cos(a), SPIRAL_RADIUS * math.sin(a), z))
    return points


def vine(turns, top, phase):
    points = spiral(turns, top, phase)
    lib.make_path(points, radius=0.005)
    for i, (x, y, z) in enumerate(points[2:], start=2):
        if i % 2:
            continue  # a leaf at every other point, so they don't crowd
        # Point the leaf away from the stake: outward angle minus 90 degrees (make_leaf's +Y).
        outward = math.atan2(y, x)
        size = 0.10 * (1 - 0.4 * z / top)
        # Slight downward tilt: giloy's heart-shaped leaves hang from their stalks.
        lib.make_leaf((x, y, z), outward - math.pi / 2, math.radians(-15), size, size * 0.95,
                      "leaf_dark" if i % 4 else "leaf")
    return points


def berry_cluster(point):
    """Five berries hanging in a short bunch below a point on the vine."""
    x, y, z = point
    for k in range(5):
        a = k * 2 * math.pi / 5
        lib.make_berry((x * 1.6 + 0.014 * math.cos(a), y * 1.6 + 0.014 * math.sin(a),
                        z - 0.03 - 0.012 * (k % 2)), 0.011)


def build():
    lib.clear_scene()
    lib.make_pot()
    # The stake is dark brown like wood (the soil colour), slightly thicker than the vine.
    lib.make_stem((0, 0, lib.PLANT_BASE), (0, 0, STAKE_TOP), radius=0.009, mat_key="soil")
    first = vine(2.5, STAKE_TOP - 0.02, 0)
    second = vine(2.0, STAKE_TOP - 0.15, math.pi)  # shorter strand on the other side, for fullness
    berry_cluster(first[9])
    berry_cluster(second[11])


build()
lib.save_plant("giloy")
