"""Shared helpers for Vatika's procedural low-poly plants.

Blender is Z-up; the glTF exporter converts to Y-up for three.js.
Units: 1 Blender unit = 1 metre. Every plant stands on a pot whose base
centre is the world origin, so that point becomes the model origin.

Colour lives in VERTEX COLOURS, not in separate materials: each plant is one
mesh with one material, so three.js draws it in a single draw call.
"""
import math
import random
import zlib
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent.parent  # the repo root
TRIANGLE_BUDGET = 5000

# One palette for every plant so the whole garden looks like one set.
PALETTE = {
    # Pots: three glazes, each with a slightly darker rim.
    "terracotta": (0.78, 0.36, 0.20), "terracotta_rim": (0.66, 0.29, 0.16),
    "glazed":     (0.36, 0.45, 0.52), "glazed_rim":     (0.28, 0.36, 0.43),
    "stone":      (0.80, 0.76, 0.66), "stone_rim":      (0.70, 0.66, 0.57),
    "soil":   (0.22, 0.13, 0.07),
    "pebble": (0.52, 0.50, 0.47),
    "moss":   (0.30, 0.45, 0.15),
    "stem":   (0.33, 0.42, 0.16),
    "wood":   (0.30, 0.19, 0.11),  # Giloy's stake
    # Four leaf greens, from old shaded leaves to fresh yellow-green new growth.
    "leaf_deep":  (0.13, 0.36, 0.12),
    "leaf_mid":   (0.24, 0.52, 0.18),
    "leaf_light": (0.38, 0.66, 0.24),
    "leaf_new":   (0.58, 0.74, 0.26),
    "flower":      (0.58, 0.30, 0.72),  # Tulsi / Brahmi blooms
    "berry":       (0.80, 0.18, 0.14),
    "husk":        (0.80, 0.70, 0.45),  # Ashwagandha's papery lantern
    "amla_fruit":  (0.72, 0.80, 0.42),
    "bract_green": (0.70, 0.82, 0.52),  # Turmeric flower spike, lower bracts
    "bract_pink":  (0.86, 0.45, 0.62),  # ... and its pink tip
    "aloe_tooth":  (0.82, 0.86, 0.68),
}
GREENS = ["leaf_deep", "leaf_mid", "leaf_light", "leaf_new"]
GREEN_WEIGHTS = [3, 4, 3, 1]  # new growth is the rarest
UNDERSIDE = 0.82  # leaf backs are this much darker than their fronts

POT_HEIGHT = 0.205  # soil surface: 1.5 cm below the rim top (0.22); plants grow from here
# Stems start 1 cm under the soil, so their bottom caps never lie in the soil's plane (z-fighting).
PLANT_BASE = POT_HEIGHT - 0.01

# Seeded random numbers: every "random" choice comes from here, and start()
# seeds it from the plant's name, so each export is identical every run.
rng = random.Random()

# Names of the objects that make up the pot (body, rim, soil, pebbles, moss), noted by
# start(). At export everything else counts as "plant", so the client can tint and tilt
# the plant without touching the pot.
pot_parts = set()


def rgb(color):
    """Accept a palette name or an (r, g, b) tuple."""
    return PALETTE[color] if isinstance(color, str) else color


def jitter(degrees):
    """Random angle in radians between -degrees and +degrees."""
    return math.radians(rng.uniform(-degrees, degrees))


def random_green():
    return rng.choices(GREENS, weights=GREEN_WEIGHTS)[0]


def start(name, pot_style):
    """Empty scene, seed the randomness from the name, and set up the pot."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # crc32, not hash(): Python's hash() of a string changes every run.
    rng.seed(zlib.crc32(name.encode()))
    make_pot(pot_style)
    soil_details()
    pot_parts.clear()
    pot_parts.update(o.name for o in bpy.data.objects)  # the scene holds only pot parts so far


# ---------- material and colour ----------

def plant_material():
    """The single shared material: matte, colour taken from the vertex colours."""
    mat = bpy.data.materials.get("plant")
    if mat:
        return mat
    mat = bpy.data.materials.new("plant")
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    colour = nodes.new("ShaderNodeVertexColor")
    colour.layer_name = "Col"
    links.new(colour.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0  # matte, cartoon look
    # Single-sided: leaves get explicit back faces instead (see _sheet).
    mat.use_backface_culling = True
    return mat


def _finish(obj, color, face_colors=None):
    """Give an object the shared material, paint its faces, and flat-shade it."""
    mesh = obj.data
    mesh.materials.append(plant_material())
    # CORNER domain = one colour per face corner, so neighbouring faces can differ.
    attr = mesh.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    for poly in mesh.polygons:
        c = rgb(face_colors[poly.index] if face_colors else color)
        for loop in poly.loop_indices:
            attr.data[loop].color = (*c, 1.0)
        poly.use_smooth = False  # faceted = low-poly look
    return obj


def _mesh(name, verts, faces, color, face_colors=None):
    """Object from raw vertices and faces (each face lists vertex numbers anticlockwise)."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return _finish(obj, color, face_colors)


def _sheet(name, verts, faces, color, position, yaw, tilt):
    """A thin sheet (leaf, tooth) with a front and a slightly darker back.

    The back is a second copy of the faces with reversed winding. With back-face
    culling, only one copy is ever drawn from any side, so they never z-fight.
    """
    n = len(verts)
    back = [tuple(n + i for i in reversed(f)) for f in faces]
    front_rgb = rgb(color)
    back_rgb = tuple(c * UNDERSIDE for c in front_rgb)
    obj = _mesh(name, verts + verts, faces + back, None,
                [front_rgb] * len(faces) + [back_rgb] * len(back))
    obj.location = position
    # Euler XYZ applies X (tilt) first, then Z (yaw): lift the tip, then spin around the stem.
    obj.rotation_euler = (tilt, 0, yaw)
    return obj


# ---------- pot and soil ----------

POT_SIDES = 10
RIM_BOTTOM, RIM_TOP = 0.18, 0.22
RIM_INNER, RIM_OUTER = 0.155, 0.185


def _circle(radius, z):
    """POT_SIDES points round a circle; every pot part uses the same angles so edges line up."""
    return [(radius * math.cos(2 * math.pi * i / POT_SIDES),
             radius * math.sin(2 * math.pi * i / POT_SIDES), z) for i in range(POT_SIDES)]


def make_pot(style="terracotta"):
    """Shared pot (style: terracotta, glazed or stone): tapered body, hollow rim, sunken soil.

    No two faces may lie in the same plane: GPUs can't tell which is in front,
    so they flicker ("z-fighting"). So the rim is a hollow ring, not a solid
    cylinder with a lid, and the soil sits below the rim top, inside the ring.
    """
    # Body stops where the rim starts, so its lid stays well below the soil.
    bpy.ops.mesh.primitive_cone_add(vertices=POT_SIDES, radius1=0.13, radius2=0.166,
                                    depth=RIM_BOTTOM, location=(0, 0, RIM_BOTTOM / 2))
    _finish(bpy.context.object, style)

    # Rim: four circles of points (outer bottom/top, inner top/bottom) joined by quads.
    n = POT_SIDES
    verts = (_circle(RIM_OUTER, RIM_BOTTOM) + _circle(RIM_OUTER, RIM_TOP)
             + _circle(RIM_INNER, RIM_TOP) + _circle(RIM_INNER, RIM_BOTTOM))
    faces = []
    for i in range(n):
        j = (i + 1) % n  # next point round, wrapping back to 0
        faces.append((i, j, n + j, n + i))                          # outer wall, faces out
        faces.append((n + i, n + j, 2 * n + j, 2 * n + i))          # flat top, faces up
        faces.append((2 * n + i, 2 * n + j, 3 * n + j, 3 * n + i))  # inner wall, faces in
    _mesh("rim", verts, faces, style + "_rim")

    # Soil: one flat face that exactly fills the inside of the ring, sunk below its top.
    _mesh("soil", _circle(RIM_INNER, POT_HEIGHT), [tuple(range(n))], "soil")


def soil_details():
    """3-5 pebbles and a few moss specks, half-sunk into the soil (so never flat on it)."""
    def spot():
        a, r = rng.uniform(0, 2 * math.pi), rng.uniform(0.05, 0.13)  # clear of the stems
        return (r * math.cos(a), r * math.sin(a), POT_HEIGHT)
    for _ in range(rng.randint(3, 5)):
        pebble = make_berry(spot(), rng.uniform(0.010, 0.016), "pebble")
        pebble.scale = (1, rng.uniform(0.7, 1.0), 0.55)  # flattened, like a river stone
    for _ in range(rng.randint(3, 4)):
        moss = make_berry(spot(), rng.uniform(0.010, 0.015), "moss")
        moss.scale = (1, 1, 0.3)


# ---------- stems ----------

def make_stem(start, end, radius=0.008, color="stem"):
    """Thin 5-sided cylinder from point start to point end."""
    start, end = Vector(start), Vector(end)
    direction = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=radius, depth=direction.length,
                                        location=(start + end) / 2)
    obj = bpy.context.object
    # Cylinders are built along Z; turn Z to point along the stem.
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return _finish(obj, color)


def make_path(points, radius=0.008, color="stem"):
    """A bendy stem: one straight make_stem per pair of neighbouring points."""
    for a, b in zip(points, points[1:]):
        make_stem(a, b, radius, color)


def direction(yaw, tilt):
    """Unit vector a leaf with this yaw and tilt points along, so stems can be laid
    out the same way as leaves (it is +Y turned by tilt about X, then yaw about Z)."""
    return (-math.sin(yaw) * math.cos(tilt), math.cos(yaw) * math.cos(tilt), math.sin(tilt))


def step(point, yaw, tilt, length):
    """The point `length` metres away from `point`, heading along direction(yaw, tilt)."""
    d = direction(yaw, tilt)
    return tuple(point[i] + d[i] * length for i in range(3))


def lerp(a, b, t):
    """Point a fraction t of the way from point a to point b."""
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def lean(point, amount=0.025):
    """Nudge a stem's top sideways at random, so no stem is perfectly straight or symmetric."""
    return (point[0] + rng.uniform(-amount, amount), point[1] + rng.uniform(-amount, amount), point[2])


# ---------- leaves ----------

def make_leaf(position, yaw, tilt, length, width, color=None):
    """Oval leaf: 6 triangles each side, folded along the midrib and curved downward.

    Modelled lying flat and pointing along +Y, then turned: tilt (radians) lifts
    the tip, yaw (radians) spins it round the stem. color=None picks a random green.
    """
    # Imperfection: every leaf is turned and sized a little differently.
    yaw, tilt = yaw + jitter(12), tilt + jitter(12)
    size = rng.uniform(0.85, 1.15)
    length, width = length * size, width * size
    fold = width * 0.15  # edges dip below the midrib so light catches two facets
    # Bigger leaves droop more: the tip sinks by this much, curving in along the length.
    droop = length * min(0.4, 0.12 + max(0.0, length - 0.06))
    outline = [
        (0, 0, 0),                              # 0 base (attaches to stem)
        (-width * 0.5, length * 0.40, -fold),   # 1 left, widest point
        (-width * 0.38, length * 0.78, -fold),  # 2 left, narrowing
        (0, length, 0),                         # 3 tip
        (width * 0.38, length * 0.78, -fold),   # 4 right, narrowing
        (width * 0.5, length * 0.40, -fold),    # 5 right, widest point
        (0, length * 0.5, 0),                   # 6 midrib centre: the bend happens here
    ]
    verts = [(x, y, z - droop * (y / length) ** 2) for x, y, z in outline]
    faces = [(0, 1, 6), (1, 2, 6), (2, 3, 6), (3, 4, 6), (4, 5, 6), (5, 0, 6)]
    return _sheet("leaf", verts, faces, color or random_green(), position, yaw, tilt)


def make_compound_leaf(start, yaw, tilt, length, pairs, leaflet_len, leaflet_ratio,
                       droop=0.0, color=None):
    """Feather-like leaf (neem, amla): a stalk in two pieces, bending down by `droop`
    radians halfway, with `pairs` of leaflets down its sides and one at the tip."""
    yaw, tilt = yaw + jitter(8), tilt + jitter(8)
    color = color or random_green()  # one green per whole leaf, so it reads as one leaf
    mid = step(start, yaw, tilt, length / 2)
    end = step(mid, yaw, tilt - droop, length / 2)
    make_path([start, mid, end], radius=0.003)
    for i in range(pairs):
        t = (i + 1) / (pairs + 1)
        pos = lerp(start, mid, t * 2) if t < 0.5 else lerp(mid, end, t * 2 - 1)
        local_tilt = tilt if t < 0.5 else tilt - droop
        for side in (1, -1):  # one leaflet each side, angled forward toward the tip
            make_leaf(pos, yaw + side * math.radians(65), local_tilt * 0.5,
                      leaflet_len, leaflet_len * leaflet_ratio, color)
    make_leaf(end, yaw, tilt - droop, leaflet_len, leaflet_len * leaflet_ratio, color)
    return end


def make_aloe_leaf(position, yaw, tilt, length, width, thickness, color=None):
    """Thick succulent leaf: broad at the base, tapering to a point, with a
    V-shaped cross-section, an upward curve, and small pale teeth along both edges."""
    yaw, tilt = yaw + jitter(10), tilt + jitter(10)
    size = rng.uniform(0.88, 1.12)
    length, width, thickness = length * size, width * size, thickness * size
    color = rgb(color or random_green())
    under = tuple(c * UNDERSIDE for c in color)

    def lift(t):
        return 0.12 * length * t * t  # tips curve upward

    # Cross-sections at 3 stations along the leaf: left edge, top centre, right edge, keel.
    verts, ring = [], []
    for t in (0.0, 0.35, 0.7):
        w, th, y, z = width * (1 - t) ** 0.8, thickness * (1 - t), length * t, lift(t)
        ring.append(len(verts))
        verts += [(-w / 2, y, z), (0, y, z - th * 0.3), (w / 2, y, z), (0, y, z - th)]
    verts.append((0, length, lift(1.0)))  # tip
    tip = len(verts) - 1

    faces, colors = [], []
    for s in range(2):  # skin between neighbouring stations: 4 quads round the section
        a, b = ring[s], ring[s + 1]
        for k in range(4):
            k2 = (k + 1) % 4
            faces.append((a + k, a + k2, b + k2, b + k))
            colors.append(color if k < 2 else under)  # k 0-1 = top surface, 2-3 = underside
    last = ring[2]
    for k in range(4):
        faces.append((last + k, last + (k + 1) % 4, tip))
        colors.append(color if k < 2 else under)
    # Winding is easy to get backwards on a hand-built solid, and back-face culling
    # would then hide the face. So flip any face whose normal points into the leaf.
    for i, f in enumerate(faces):
        pts = [Vector(verts[v]) for v in f]
        normal = (pts[1] - pts[0]).cross(pts[2] - pts[0])
        centre = sum(pts, Vector()) / len(pts)
        tc = centre.y / length  # how far along the leaf; it thins toward the tip
        axis = Vector((0, centre.y, lift(tc) - 0.45 * thickness * (1 - tc)))
        if normal.dot(centre - axis) < 0:
            faces[i] = tuple(reversed(f))
    leaf = _mesh("aloe", verts, faces, None, colors)
    leaf.location, leaf.rotation_euler = position, (tilt, 0, yaw)

    # Teeth: tiny two-sided triangles sticking out of each edge.
    for t in (0.2, 0.42, 0.62):
        w, y, z = width * (1 - t) ** 0.8 / 2, length * t, lift(t)
        for side in (1, -1):
            tooth = [(side * w, y - 0.007, z), (side * (w + 0.012), y + 0.005, z), (side * w, y + 0.007, z)]
            _sheet("tooth", tooth, [(0, 1, 2)], "aloe_tooth", position, yaw, tilt)
    return leaf


# ---------- fruit, flowers, husks ----------

def make_berry(position, radius, color="berry"):
    """Tiny 20-triangle ball, for berries, buds, fruit, pebbles and moss."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=position)
    return _finish(bpy.context.object, color)


def make_cone(base, height, radius_bottom, radius_top, color, sides=6):
    """Upright cone or frustum standing on point `base`."""
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=radius_bottom, radius2=radius_top,
                                    depth=height, location=(base[0], base[1], base[2] + height / 2))
    return _finish(bpy.context.object, color)


def make_husk(position, radius):
    """Ashwagandha berry inside its papery, lantern-shaped husk; the berry peeks out below."""
    make_cone((position[0], position[1], position[2] - radius * 0.6), radius * 2.4,
              radius * 1.35, 0.0, "husk", sides=5)
    make_berry((position[0], position[1], position[2] - radius * 0.75), radius, "berry")


# ---------- export ----------

def triangle_count():
    """Triangles in the scene (an n-sided face = n - 2 triangles), to check the budget."""
    return sum(len(p.vertices) - 2
               for o in bpy.data.objects if o.type == "MESH" for p in o.data.polygons)


def _join(objects, name):
    """Merge objects into one mesh called `name`, with transforms baked into the vertices."""
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()  # one mesh + one material = one draw call in three.js
    joined = bpy.context.object
    joined.name = joined.data.name = name  # exact node names the client looks up
    # Bake location/rotation/scale into the vertices, so its origin is the world origin
    # (the pot base) and no leftover transforms are exported.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return joined


def export_glb(path):
    """Write a GLB shaped root -> "pot" + "plant", and return (pot, plant)."""
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    # Split into the two groups BEFORE joining: a join deletes the objects it merges,
    # so filtering `meshes` afterwards would touch deleted objects.
    pot_objects = [o for o in meshes if o.name in pot_parts]
    plant_objects = [o for o in meshes if o.name not in pot_parts]
    pot = _join(pot_objects, "pot")
    plant = _join(plant_objects, "plant")
    # Move the plant's origin up to the soil centre: shift its vertices down by the soil
    # height and the object up by the same amount, so nothing moves on screen, but a
    # rotation or squash of "plant" in the client pivots where the stems meet the soil.
    plant.data.transform(Matrix.Translation((0, 0, -POT_HEIGHT)))
    plant.location = (0, 0, POT_HEIGHT)
    # An empty object as the root, at the pot base (world origin), named after the file.
    root = bpy.data.objects.new(Path(path).stem, None)
    bpy.context.collection.objects.link(root)
    pot.parent = plant.parent = root
    # No textures, so UV coordinates would be dead weight; colours travel as COLOR_0.
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", export_yup=True,
                              export_apply=True, export_texcoords=False,
                              export_vertex_color="MATERIAL")
    return pot, plant


def render_preview(path, target_z=0.38):
    """Workbench PNG from a 3/4 angle: fast, no lights to set up, shows the vertex colours."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new("bg")
    world.color = (0.93, 0.93, 0.90)  # plain light background
    scene.world = world
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "VERTEX"
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


def save_plant(name):
    """Check the budget, export client/public/models/<name>.glb, render models-src/previews/<name>.png."""
    tris = triangle_count()
    print(f"TRIANGLES {tris}")
    # Fail loudly rather than quietly shipping a model that is too heavy.
    assert tris < TRIANGLE_BUDGET, f"{name}: {tris} triangles is over the {TRIANGLE_BUDGET} budget"
    glb = ROOT / "client" / "public" / "models" / f"{name}.glb"
    png = ROOT / "models-src" / "previews" / f"{name}.png"
    glb.parent.mkdir(parents=True, exist_ok=True)
    png.parent.mkdir(parents=True, exist_ok=True)
    pot, plant = export_glb(glb)
    # Height of the whole model = the highest corner of either part, in world space.
    top = max((o.matrix_world @ Vector(c)).z for o in (pot, plant) for c in o.bound_box)
    print(f"SIZE height {top:.3f} m; plant origin at z={plant.location.z:.3f}")
    render_preview(png)
