// The ONE place that decides where each plant stands in the garden.
// Units are metres. The player spawns at the origin looking toward -Z (three.js's default),
// and the 8 plinths sit on a gentle arc in front of them.

export const EYE_HEIGHT = 1.6;
export const WALK_RADIUS = 11; // the player can't walk further than this from the centre
export const PLINTH = { radius: 0.45, height: 0.35 };
export const PLAYER_RADIUS = 0.35; // how "wide" the player is, for bumping into plinths

const ARC_RADIUS = 6; // distance from spawn to each plinth
const ARC_DEGREES = 160; // total spread of the arc: about 2.4 m between neighbours
const DEFAULT_SCALE = 1.8; // models are life-size herbs (~0.8 m); a bit bigger reads better at eye height

// Arc order, left to right. Matches the server's plant ids so the garden reads in seed order.
const ORDER = ['Tulsi', 'Aloe Vera', 'Ashwagandha', 'Neem', 'Turmeric', 'Brahmi', 'Amla', 'Giloy'];
// Low, spreading plants get a little extra size so they don't look lost on their plinth.
const SCALE_OVERRIDES = { 'Aloe Vera': 2.1, Brahmi: 2.1 };

// name -> { position: [x, y, z], scale }. y is the plinth top, where the pot's base sits.
export const LAYOUT = Object.fromEntries(
  ORDER.map((name, i) => {
    // Angle measured from straight ahead (-Z): -80 degrees on the left to +80 on the right.
    const angle = ((-ARC_DEGREES / 2 + (i * ARC_DEGREES) / (ORDER.length - 1)) * Math.PI) / 180;
    const position = [ARC_RADIUS * Math.sin(angle), PLINTH.height, -ARC_RADIUS * Math.cos(angle)];
    return [name, { position, scale: SCALE_OVERRIDES[name] ?? DEFAULT_SCALE }];
  }),
);
