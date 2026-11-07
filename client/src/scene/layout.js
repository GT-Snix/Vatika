// The ONE place that decides where each plant stands in the garden, how big it is,
// and how much room it takes up. Units are metres. The player spawns at the centre
// of the ring (the origin) looking toward -Z, which is the middle of the arc.

export const EYE_HEIGHT = 1.6;
export const WALK_RADIUS = 11; // the player can't walk further than this from the centre
export const PLAYER_RADIUS = 0.35; // how "wide" the player is, for bumping into plinths
export const PATH_RADIUS = 3.7; // centre line of the stone ring, inside the plinths
export const PATH_HALF_WIDTH = 0.4;

// Targeting (scene/Targeting.jsx): a plant can be inspected when it is this close on the
// ground and this close to straight ahead.
export const TARGET_RANGE = 3.2;
export const TARGET_ANGLE_DEGREES = 18;
// The pot's bottom radius in model units (models-src/lib.py): a wilting plant tips
// over this front edge, so the pot never sinks into its plinth.
export const POT_BASE_RADIUS = 0.13;

const ARC_RADIUS = 4.8; // distance from spawn to each plinth centre
const ARC_DEGREES = 200; // spread of the arc: about 2.4 m between neighbours
const POT_RIM_RADIUS = 0.185; // every model shares the same pot (models-src/lib.py)
const MIN_CORRIDOR = 0.55; // room the player's centre needs to pass between two plants

// ONE scale for every plant, so every pot is the same size and plants keep their
// natural height differences. Plinths make up the difference instead (below).
const PLANT_SCALE = 1.6;
const MAX_PLINTH_HEIGHT = 0.9;
// Plant tops are spread over this range, in the same order as the plants' own heights:
// the shortest plant's top lands at 1.45 m, the tallest's at 1.65 m.
const TOP_LOW = 1.45;
const TOP_HIGH = 1.65;

// Measured once from each GLB's bounding box (unscaled, metres):
//   height = top of the plant above the pot base,
//   reach  = furthest any leaf sticks out sideways from the pot's centre.
// Order = left to right along the arc, arranged so neighbours contrast:
// tall next to wide, and no two neighbouring pots share a colour.
const PLANTS = [
  { name: 'Giloy',       pot: 'glazed',     height: 0.800, reach: 0.185 }, // tall vine
  { name: 'Brahmi',      pot: 'stone',      height: 0.417, reach: 0.317 }, // low, trailing
  { name: 'Tulsi',       pot: 'terracotta', height: 0.785, reach: 0.185 }, // upright
  { name: 'Neem',        pot: 'glazed',     height: 0.713, reach: 0.335 }, // wide crown
  { name: 'Ashwagandha', pot: 'terracotta', height: 0.705, reach: 0.210 }, // upright shrub
  { name: 'Aloe Vera',   pot: 'stone',      height: 0.460, reach: 0.239 }, // low rosette
  { name: 'Turmeric',    pot: 'glazed',     height: 0.736, reach: 0.349 }, // tall leaves
  { name: 'Amla',        pot: 'terracotta', height: 0.639, reach: 0.333 }, // spreading tree
];

// Tiny seeded random generator (mulberry32): the same seed gives the same "random"
// numbers every load, so the garden never reshuffles. (Alternative: Math.random(),
// which would turn the plants differently on every page load.)
export function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0 <= n < 1
  };
}
const random = seededRandom(20261107);

const shortest = Math.min(...PLANTS.map((p) => p.height));
const tallest = Math.max(...PLANTS.map((p) => p.height));

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

    // Where this plant's top should be (0 = shortest plant, 1 = tallest), then the plinth
    // is whatever height lifts the scaled plant to it: short plants get tall plinths.
    const rank = (p.height - shortest) / (tallest - shortest);
    const top = TOP_LOW + rank * (TOP_HIGH - TOP_LOW);
    const plinthHeight = Math.min(MAX_PLINTH_HEIGHT, top - p.height * PLANT_SCALE);

    const plinthRadius = POT_RIM_RADIUS * PLANT_SCALE + 0.06; // pot plus a small stone ledge
    // Collide with the plinth, or with most of the leaves if they spread wider than it,
    // so you can't walk into the middle of a bush. Plus the player's own radius.
    const blockRadius = Math.max(plinthRadius, p.reach * PLANT_SCALE * 0.85) + PLAYER_RADIUS;
    return [p.name, {
      position: [x, plinthHeight, z], // y = plinth top, where the pot's base sits
      facing, scale: PLANT_SCALE, plinthRadius, blockRadius,
      top: plinthHeight + p.height * PLANT_SCALE,
    }];
  }),
);

// Fail loudly if a layout edit leaves less than MIN_CORRIDOR between two collision circles:
// overlapping circles could push the player out of one and into the other (through a plinth),
// and a thinner gap is too tight to walk.
const spots = Object.entries(LAYOUT);
spots.forEach(([nameA, a], i) => spots.slice(i + 1).forEach(([nameB, b]) => {
  const d = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
  if (d - a.blockRadius - b.blockRadius < MIN_CORRIDOR) {
    console.error(`layout.js: ${nameA} and ${nameB} are too close to walk between`);
  }
}));
