"""The gardener's visible body: two gloved hands with sleeves, a watering can and two
boots. Rigid parts with no skeleton: the client moves each one in code.

Blender axes while modelling: +Y = forward, +Z = up, +X = right (glTF turns these into
-Z forward, +Y up). Each part is built around ITS OWN pivot at the origin, because that
point becomes the node's origin, the point the client rotates and places it by.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/player.py
"""
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))  # so `import lib` finds lib.py next to us
import lib

BUDGET = 1500
GLB_PATH = lib.ROOT / "client" / "public" / "models" / "player.glb"
PREVIEW_PATH = lib.ROOT / "models-src" / "previews" / "player.png"


def box(center, size, color):
    """Axis-aligned box (12 triangles)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.scale = size
    return lib._finish(obj, color)


def cone_along(base, direction, length, radius_start, radius_end, color, sides=8):
    """Cone or funnel from `base` along `direction` (e.g. the watering can's rose)."""
    d = Vector(direction).normalized()
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=radius_start, radius2=radius_end,
                                    depth=length, location=Vector(base) + d * (length / 2))
    obj = bpy.context.object
    obj.rotation_euler = d.to_track_quat("Z", "Y").to_euler()  # cones are built along Z
    return lib._finish(obj, color)


def part(name, build):
    """Run build(), then join everything it made into ONE mesh called `name`."""
    before = set(bpy.data.objects)
    build()
    return lib._join([o for o in bpy.data.objects if o not in before], name)


def hand(side):
    """Gloved hand, palm down, fingers forward; pivot at the wrist. side: -1 left, +1 right."""
    lib.make_stem((0, -0.24, 0), (0, -0.03, 0), 0.042, "sleeve", sides=8)  # forearm in a sleeve
    lib.make_stem((0, -0.05, 0), (0, 0.01, 0), 0.040, "glove_cuff", sides=8)  # glove cuff
    box((0, 0.05, 0), (0.085, 0.09, 0.035), "glove")  # palm
    for x in (-0.03, -0.01, 0.01, 0.03):  # four fingers, curled slightly down
        lib.make_stem((x, 0.085, 0), (x, 0.15, -0.012), 0.009, "glove")
    # Palm down, a left hand's thumb points right (+x) and a right hand's left (-x).
    thumb_x = -side * 0.045
    lib.make_stem((thumb_x, 0.03, -0.005), (thumb_x * 1.3, 0.09, -0.015), 0.011, "glove")


def can():
    """Watering can; pivot at the top handle, where the glove holds it."""
    lib.make_stem((0, 0.02, -0.155), (0, 0.02, -0.045), 0.065, "can", sides=8)  # body
    # Lid starts INSIDE the body so its underside never shares the body's top face (z-fighting).
    lib.make_stem((0, 0.02, -0.047), (0, 0.02, -0.038), 0.058, "can_dark", sides=8)
    lib.make_path([(0, -0.04, -0.045), (0, -0.035, 0), (0, 0.035, 0), (0, 0.06, -0.045)], 0.009, "can_dark")
    spout_base, spout_tip = Vector((0, 0.07, -0.13)), Vector((0, 0.22, -0.04))
    lib.make_stem(spout_base, spout_tip, 0.012, "can", sides=6)
    cone_along(spout_tip, spout_tip - spout_base, 0.03, 0.012, 0.03, "can_dark")  # the rose


def boot():
    """Boot; pivot at the top of the shaft (the shin). Sole bottom is 0.21 m below the pivot."""
    lib.make_stem((0, 0, -0.17), (0, 0, 0), 0.05, "boot", sides=8)  # shaft
    box((0, 0.05, -0.15), (0.10, 0.24, 0.07), "boot")  # foot
    lib.make_berry((0, 0.15, -0.15), 0.05, "boot")  # rounded toe
    box((0, 0.05, -0.195), (0.11, 0.27, 0.03), "sole")


lib.begin("player")
parts = {
    "hand_L": part("hand_L", lambda: hand(-1)),
    "hand_R": part("hand_R", lambda: hand(+1)),
    "can": part("can", can),
    "boot_L": part("boot_L", boot),
    "boot_R": part("boot_R", boot),
}

# The rose's outlet, as an empty child of the can: the client asks for its world position
# to know where water comes out, instead of hardcoding the can's measurements.
spout = bpy.data.objects.new("spout", None)
bpy.context.collection.objects.link(spout)
spout.parent = parts["can"]
spout.location = Vector((0, 0.22, -0.04)) + Vector((0, 0.15, 0.09)).normalized() * 0.03

tris = lib.triangle_count()
print(f"TRIANGLES {tris}")
assert tris < BUDGET, f"player: {tris} triangles is over the {BUDGET} budget"
for name, obj in parts.items():
    print(f"PART {name} {sum(len(p.vertices) - 2 for p in obj.data.polygons)} triangles")

# Spread the parts out only so the preview shows each one; the client places them itself.
for name, x, z in (("boot_L", -0.33, 0.21), ("boot_R", -0.17, 0.21), ("can", 0.02, 0.2),
                   ("hand_L", 0.22, 0.25), ("hand_R", 0.36, 0.25)):
    parts[name].location = (x, 0, z)
root = bpy.data.objects.new("player", None)
bpy.context.collection.objects.link(root)
for obj in parts.values():
    obj.parent = root

bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format="GLB", export_yup=True,
                          export_apply=True, export_texcoords=False, export_vertex_color="MATERIAL")
# Preview only (the GLB is already written): turn everything to face the preview camera,
# which looks from behind-right, so the fingers and the can's spout are visible.
root.rotation_euler = (0, 0, 2.6)
lib.render_preview(PREVIEW_PATH, target_z=0.15)
print(f"WROTE {GLB_PATH}")
