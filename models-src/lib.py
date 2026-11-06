"""Shared helpers for Vatika's procedural low-poly plants.

Blender is Z-up; the glTF exporter converts to Y-up for three.js.
Units: 1 Blender unit = 1 metre. Every plant stands on the same pot,
whose base centre is the world origin, so that point becomes the model origin.
"""
import math
from pathlib import Path

import bpy
from mathutils import Vector

# One palette for every plant so the whole garden looks like one set.
PALETTE = {
    "pot":       (0.78, 0.36, 0.20),  # terracotta
    "pot_rim":   (0.66, 0.29, 0.16),
    "soil":      (0.22, 0.13, 0.07),
    "stem":      (0.33, 0.42, 0.16),
    "leaf":      (0.30, 0.62, 0.20),
    "leaf_dark": (0.22, 0.52, 0.18),
    "flower":    (0.58, 0.30, 0.72),  # Tulsi's purple spikes
    "berry":     (0.80, 0.18, 0.14),
}

POT_HEIGHT = 0.205  # soil surface: 1.5 cm below the rim top (0.22); plants grow from here
# Stems start 1 cm under the soil, so their bottom caps never lie in the soil's plane (z-fighting).
PLANT_BASE = POT_HEIGHT - 0.01


def clear_scene():
    """Start from an empty scene so re-running a script never doubles the model."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def flat_material(key, double_sided=False):
    """Solid-colour material from the palette, reused if it already exists."""
    mat = bpy.data.materials.get(key)
    if mat:
        return mat
    mat = bpy.data.materials.new(key)
    rgb = PALETTE[key]
    mat.diffuse_color = (*rgb, 1.0)  # what the Workbench preview shows
    bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.node_tree else None
    if bsdf:  # what the glTF exporter reads
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = 1.0  # matte, cartoon look
    # Leaves are single sheets: without this, three.js hides their back face.
    mat.use_backface_culling = not double_sided
    return mat


def _finish(obj, mat_key, double_sided=False):
    """Give a new object its material and flat shading (faceted = low-poly look)."""
    obj.data.materials.append(flat_material(mat_key, double_sided))
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


POT_SIDES = 10
RIM_BOTTOM, RIM_TOP = 0.18, 0.22
RIM_INNER, RIM_OUTER = 0.155, 0.185


def _circle(radius, z):
    """POT_SIDES points round a circle; every pot part uses the same angles so edges line up."""
    return [(radius * math.cos(2 * math.pi * i / POT_SIDES),
             radius * math.sin(2 * math.pi * i / POT_SIDES), z) for i in range(POT_SIDES)]


def _mesh(name, verts, faces, mat_key):
    """Object from raw vertices and faces (each face lists vertex numbers anticlockwise)."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return _finish(obj, mat_key)


def make_pot():
    """Shared terracotta pot: tapered body, hollow rim, sunken soil. Base centred on the origin.

    No two faces may lie in the same plane: GPUs can't tell which is in front,
    so they flicker ("z-fighting"). So the rim is a hollow ring, not a solid
    cylinder with a lid, and the soil sits below the rim top, inside the ring.
    """
    # Body: cone with two radii = a tapered pot. It stops where the rim starts
    # (radius2 keeps the old taper) so its lid stays well below the soil.
    bpy.ops.mesh.primitive_cone_add(vertices=POT_SIDES, radius1=0.13, radius2=0.166,
                                    depth=RIM_BOTTOM, location=(0, 0, RIM_BOTTOM / 2))
    _finish(bpy.context.object, "pot")

    # Rim: four circles of points (outer bottom/top, inner top/bottom) joined by quads.
    n = POT_SIDES
    verts = (_circle(RIM_OUTER, RIM_BOTTOM) + _circle(RIM_OUTER, RIM_TOP)
             + _circle(RIM_INNER, RIM_TOP) + _circle(RIM_INNER, RIM_BOTTOM))
    faces = []
    for i in range(n):
        j = (i + 1) % n  # next point round, wrapping back to 0
        faces.append((i, j, n + j, n + i))                  # outer wall, faces out
        faces.append((n + i, n + j, 2 * n + j, 2 * n + i))  # flat top, faces up
        faces.append((2 * n + i, 2 * n + j, 3 * n + j, 3 * n + i))  # inner wall, faces in
    _mesh("rim", verts, faces, "pot_rim")

    # Soil: one flat face that exactly fills the inside of the ring, sunk below its top.
    _mesh("soil", _circle(RIM_INNER, POT_HEIGHT), [tuple(range(n))], "soil")


def make_stem(start, end, radius=0.008):
    """Thin 5-sided cylinder from point start to point end."""
    start, end = Vector(start), Vector(end)
    direction = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=radius, depth=direction.length,
                                        location=(start + end) / 2)
    obj = bpy.context.object
    # Cylinders are built along Z; turn Z to point along the stem.
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return _finish(obj, "stem")


def make_leaf(position, yaw, tilt, length, width, mat_key="leaf"):
    """Small oval leaf: 7 vertices, 6 triangles, slightly folded along the midrib.

    It is modelled lying flat and pointing along +Y, then turned:
    tilt (radians) lifts the tip upward, yaw (radians) spins it around the stem.
    """
    fold = width * 0.15  # edges dip below the midrib so light catches two facets
    verts = [
        (0, 0, 0),                              # 0 base (attaches to stem)
        (-width * 0.5, length * 0.40, -fold),   # 1 left, widest point
        (-width * 0.38, length * 0.78, -fold),  # 2 left, narrowing
        (0, length, 0),                         # 3 tip
        (width * 0.38, length * 0.78, -fold),   # 4 right, narrowing
        (width * 0.5, length * 0.40, -fold),    # 5 right, widest point
        (0, length * 0.5, 0),                   # 6 midrib centre
    ]
    faces = [(0, 1, 6), (1, 2, 6), (2, 3, 6), (3, 4, 6), (4, 5, 6), (5, 0, 6)]
    mesh = bpy.data.meshes.new("leaf")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new("leaf", mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    # Euler XYZ applies X (tilt) first, then Z (yaw): lift the tip, then spin around the stem.
    obj.rotation_euler = (tilt, 0, yaw)
    return _finish(obj, mat_key, double_sided=True)


def make_berry(position, radius, mat_key="berry"):
    """Tiny 20-triangle ball, for berries, buds and flower clusters."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=position)
    return _finish(bpy.context.object, mat_key)


def triangle_count():
    """Triangles in the scene (an n-sided face = n - 2 triangles), to check the budget."""
    return sum(len(p.vertices) - 2
               for o in bpy.data.objects if o.type == "MESH" for p in o.data.polygons)


def export_glb(path):
    """Join everything into one mesh, bake transforms, and write a GLB."""
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()  # one object = one node to load in three.js
    plant = bpy.context.object
    plant.name = plant.data.name = Path(path).stem  # "tulsi", not the first part's name ("Cone")
    # Apply = bake location/rotation into the vertices, so the origin is the world
    # origin (the pot base) and the GLB carries no leftover rotations.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # No textures, so UV coordinates would be dead weight in the file.
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB",
                              export_yup=True, export_apply=True, export_texcoords=False)
    return plant


def render_preview(path, target_z=0.38):
    """Workbench PNG from a 3/4 angle: fast, no lights to set up, shows flat colours."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new("bg")
    world.color = (0.93, 0.93, 0.90)  # plain light background
    scene.world = world
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    # Blender's default "AgX" view washes colours out; three.js shows them as-is,
    # so "Standard" makes the preview match what the game will draw.
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x = scene.render.resolution_y = 800
    scene.render.filepath = str(path)

    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (1.05, -1.05, 0.95)  # front-right and above = 3/4 view
    target = Vector((0, 0, target_z))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    bpy.ops.render.render(write_still=True)
