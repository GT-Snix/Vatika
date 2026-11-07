// The ONE place that decides where each plant stands in the garden, how big it is,
// and how much room it takes up. Units are metres. The player spawns at the centre
// of the ring (the origin) looking toward -Z, which is the middle of the arc.

export const EYE_HEIGHT = 1.6;
export const WALK_RADIUS = 11; // the player can't walk further than this from the centre
export const PLAYER_RADIUS = 0.35; // how "wide" the player is, for bumping into plinths
export const PLINTH_HEIGHT = 0.35;
export const PATH_RADIUS = 3.7; // centre line of the stone ring, inside the plinths
export const PATH_HALF_WIDTH = 0.4;

const ARC_RADIUS = 4.8; // distance from spawn to each plinth centre
const ARC_DEGREES = 200; // spread of the arc: about 2.4 m between neighbours
const POT_RIM_RADIUS = 0.185; // every model shares the same pot (models-src/lib.py)

// Measured once from each GLB's bounding box (unscaled, metres):
//   height = top of the plant above the pot base,
//   reach  = furthest any leaf sticks out sideways from the pot's centre.
// scale is chosen so every plant stands 1.1-1.4 m tall (height x scale).
// Order = left to right along the arc, arranged so neighbours contrast:
// tall next to wide, and no two neighbouring pots share a colour.
const PLANTS = [
  { name: 'Giloy',       pot: 'glazed',     height: 0.800, reach: 0.185, scale: 1.75 }, // tall vine
  { name: 'Brahmi',      pot: 'stone',      height: 0.417, reach: 0.317, scale: 2.64 }, // low, trailing
  { name: 'Tulsi',       pot: 'terracotta', height: 0.785, reach: 0.185, scale: 1.59 }, // upright
  { name: 'Neem',        pot: 'glazed',     height: 0.713, reach: 0.335, scale: 1.96 }, // wide crown
  { name: 'Ashwagandha', pot: 'terracotta', height: 0.705, reach: 0.210, scale: 1.77 }, // upright shrub
  { name: 'Aloe Vera',   pot: 'stone',      height: 0.460, reach: 0.239, scale: 2.39 }, // low rosette
  { name: 'Turmeric',    pot: 'glazed',     height: 0.736, reach: 0.349, scale: 1.77 }, // tall leaves
  { name: 'Amla',        pot: 'terracotta', height: 0.639, reach: 0.333, scale: 2.11 }, // spreading tree
];

// Tiny seeded random generator (mulberry32): the same seed gives the same "random"
// numbers every load, so the garden never reshuffles. (Alternative: Math.random(),
// which would turn the plants differently on every page load.)
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0 <= n < 1
  };
}
const random = seededRandom(20261107);

// name -> everything the scene and the collision code need for that plant.
export const LAYOUT = Object.fromEntries(
  PLANTS.map((p, i) => {
    // Angle from straight ahead (-Z): -100 degrees on the left to +100 on the right.
    const angle = ((-ARC_DEGREES / 2 + (i * ARC_DEGREES) / (PLANTS.length - 1)) * Math.PI) / 180;
    const x = ARC_RADIUS * Math.sin(angle);
    const z = -ARC_RADIUS * Math.cos(angle);
    // The models' fronts face +Z. Turning by atan2(-x, -z) points +Z back at the spawn;
    // the jitter (up to +/-8 degrees) stops the row looking machine-placed.
    const facing = Math.atan2(-x, -z) + ((random() * 2 - 1) * 8 * Math.PI) / 180;
    const plinthRadius = POT_RIM_RADIUS * p.scale + 0.06; // pot plus a small stone ledge
    // Collide with the plinth, or with most of the leaves if they spread wider than it,
    // so you can't walk into the middle of a bush. Plus the player's own radius.
    const blockRadius = Math.max(plinthRadius, p.reach * p.scale * 0.85) + PLAYER_RADIUS;
    return [p.name, {
      position: [x, PLINTH_HEIGHT, z], // y = plinth top, where the pot's base sits
      facing, scale: p.scale, plinthRadius, blockRadius,
      scaledHeight: p.height * p.scale,
    }];
  }),
);

// Fail loudly if a layout edit makes two collision circles overlap: pushing the player
// out of one could then push them into the other, which is how you'd walk through a plinth.
const spots = Object.entries(LAYOUT);
spots.forEach(([nameA, a], i) => spots.slice(i + 1).forEach(([nameB, b]) => {
  const d = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
  if (d < a.blockRadius + b.blockRadius) console.error(`layout.js: ${nameA} and ${nameB} are too close to walk between`);
}));
