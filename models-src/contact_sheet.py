"""Render all 8 exported plants side by side, as the game would load them:
imports each GLB (so it also checks the exports), warm sun, soft shadows, ground plane.

Run headless from the repo root:
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --python models-src/contact_sheet.py -- [output.png]
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "client" / "public" / "models"
PLANTS = ["tulsi", "aloe_vera", "ashwagandha", "neem", "turmeric", "brahmi", "amla", "giloy"]
# Optional output path after "--"; default lives next to the per-plant previews.
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = Path(args[0]) if args else ROOT / "models-src" / "previews" / "contact_sheet.png"


def material(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = 1.0
    return mat


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# 4 x 2 grid, 1.1 m apart, back row first; rows far enough apart that labels show.
for i, name in enumerate(PLANTS):
    x, y = (i % 4 - 1.5) * 1.1, (0.85 if i < 4 else -0.85)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(MODELS / f"{name}.glb"))
    for obj in set(bpy.data.objects) - before:
        if obj.parent is None:
            obj.location = (x, y, 0)
    # Name label standing on the ground in front of each pot.
    bpy.ops.object.text_add(location=(x, y - 0.36, 0.0), rotation=(math.radians(90), 0, 0))
    label = bpy.context.object
    label.data.body = name.replace("_", " ").title()
    label.data.size = 0.075
    label.data.align_x = "CENTER"
    label.data.materials.append(material("label", (0.12, 0.08, 0.05)))

# Ground: a large warm-grey plane to catch the shadows.
bpy.ops.mesh.primitive_plane_add(size=30)
bpy.context.object.data.materials.append(material("ground", (0.55, 0.50, 0.42)))

# Warm low sun from the front-left; a small angle softens the shadow edges.
sun_data = bpy.data.lights.new("sun", "SUN")
sun_data.energy = 3.5
sun_data.color = (1.0, 0.88, 0.72)
sun_data.angle = math.radians(6)
sun = bpy.data.objects.new("sun", sun_data)
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
scene.collection.objects.link(sun)

# Cool, dim sky light so shadows are blue-ish rather than black.
world = bpy.data.worlds.new("sky")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.55, 0.62, 0.75, 1)
bg.inputs["Strength"].default_value = 0.5
scene.world = world

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 42
cam = bpy.data.objects.new("cam", cam_data)
cam.location = (0.0, -5.2, 3.3)
cam.rotation_euler = (Vector((0, 0, 0.3)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.collection.objects.link(cam)
scene.camera = cam

# EEVEE gives real sun shadows; the identifier changed across Blender versions.
for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue
scene.view_settings.view_transform = "Standard"  # match three.js, no filmic wash-out
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.filepath = str(OUT)
bpy.ops.render.render(write_still=True)
print(f"WROTE {OUT}")
