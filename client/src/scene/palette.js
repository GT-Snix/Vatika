// Every colour the 3D scene uses, in one place. (The plants carry their own vertex colours.)
export const palette = {
  ground: '#8fae6b',     // grass
  path: '#c9bda8',       // pale stone
  plinth: '#b8ab95',
  plinthGlow: '#5a4a2a', // added as emissive light to the targeted plinth: a subtle warm lift
  placeholder: '#a39a8a',
};

// Multiplied into each plant's vertex colours, so white = unchanged.
export const statusTint = {
  healthy: '#ffffff',
  thirsty: '#ffe39a', // warm yellow
  wilting: '#c79a5b', // brown-yellow
};

// The sky through the day: keyframes by game hour, blended smoothly in between
// (scene/SkyLighting.jsx). sun = the directional light (the moon at night),
// hemiSky/hemiGround = soft light from above and bounce from below, fog = horizon haze,
// glow = halo around the sun (0-1), stars = star visibility (0-1).
// Night keeps hemi at 0.5 (over half of noon's 0.9) plus blue moonlight, so it stays readable.
const NIGHT = { sun: '#9fb4ff', sunIntensity: 0.45, hemiSky: '#5a6a9a', hemiGround: '#262a3a', hemi: 0.5, fog: '#1b2236', glow: 0, stars: 1 };
export const SKY_KEYS = [
  { hour: 0, ...NIGHT },
  { hour: 5, ...NIGHT },
  // Dawn and dusk sit where the sun crosses the horizon and the light swaps between sun
  // and moon, so the direct light is dim there and the swap is barely visible.
  { hour: 6, sun: '#ffb38a', sunIntensity: 0.2, hemiSky: '#c9a9c4', hemiGround: '#5a4a44', hemi: 0.75, fog: '#e2b9a6', glow: 0.8, stars: 0 },
  { hour: 12, sun: '#fff1d6', sunIntensity: 2.4, hemiSky: '#dfeefa', hemiGround: '#7c6a4f', hemi: 0.9, fog: '#cfe3e8', glow: 0.35, stars: 0 },
  { hour: 16.5, sun: '#ffc27a', sunIntensity: 1.6, hemiSky: '#f0dcc0', hemiGround: '#7a5a3c', hemi: 0.8, fog: '#efd2a6', glow: 0.9, stars: 0 },
  { hour: 18, sun: '#ff9a6a', sunIntensity: 0.2, hemiSky: '#b08aa0', hemiGround: '#4a3a3a', hemi: 0.75, fog: '#c98a7a', glow: 0.8, stars: 0.2 },
  { hour: 19.5, ...NIGHT },
  { hour: 24, ...NIGHT },
];
