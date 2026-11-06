"""Ashwagandha: a small, branching shrub with dull-green oval leaves set
one per node (alternate), and small red berries tucked along the stems.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/ashwagandha.py
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

GOLDEN_ANGLE = math.radians(137.5)  # alternate leaves spiral by this angle, so none sit on top of another

# (base x, base y, top x, top y, top height above soil)
STEMS = [
    (0.00, 0.00, 0.02, 0.00, 0.50),
    (0.02, 0.02, 0.15, 0.09, 0.40),
    (-0.02, 0.01, -0.14, 0.09, 0.38),
    (0.00, -0.02, -0.03, -0.15, 0.36),
]
# Each stem also throws one side branch: (fraction up the stem, yaw in degrees, length).
BRANCH = (0.45, 60, 0.14)


def leafy(start, end, nodes, first_yaw, leaf_len, berries=True):
    """Stem with one leaf per node; every third node also carries a berry under the leaf."""
    lib.make_stem(start, end)
    for i in range(nodes):
        t = 0.2 + 0.75 * i / max(nodes - 1, 1)
        pos = lib.lerp(start, end, t)
        yaw = first_yaw + i * GOLDEN_ANGLE
        length = leaf_len * (1 - 0.35 * t)
        # Low tilt: ashwagandha leaves spread out rather than up.
        lib.make_leaf(pos, yaw, math.radians(15 + 15 * t), length, length * 0.75,
                      "leaf_dark" if i % 2 else "leaf")
        if berries and i % 3 == 2:
            # Berry hangs a little below the node, on the opposite side to the leaf.
            lib.make_berry(lib.step(pos, yaw + math.pi, math.radians(-40), 0.025), 0.013)


def build():
    lib.clear_scene()
    lib.make_pot()
    for n, (bx, by, tx, ty, h) in enumerate(STEMS):
        start, end = (bx, by, lib.PLANT_BASE), (tx, ty, lib.POT_HEIGHT + h)
        leafy(start, end, 9, n * 1.3, 0.13)
        t, yaw, length = BRANCH
        fork = lib.lerp(start, end, t)
        tip = lib.step(fork, math.radians(yaw + n * 90), math.radians(35), length)
        leafy(fork, tip, 4, n * 2.1, 0.11, berries=False)


build()
lib.save_plant("ashwagandha")
