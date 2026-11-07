// Every colour the 3D scene uses, in one place. (The plants carry their own vertex colours.)
export const palette = {
  sky: '#cfe3e8',        // soft morning sky; also the background colour
  fog: '#cfe3e8',        // same as the sky so the ground fades into it with no visible edge
  ground: '#8fae6b',     // grass
  path: '#c9bda8',       // pale stone
  plinth: '#b8ab95',
  plinthGlow: '#5a4a2a', // added as emissive light to the targeted plinth: a subtle warm lift
  sun: '#fff1d6',        // warm white
  hemiSky: '#dfeefa',    // light from above...
  hemiGround: '#7c6a4f', // ...and warm bounce from the earth below
  placeholder: '#a39a8a',
};

// Multiplied into each plant's vertex colours, so white = unchanged.
export const statusTint = {
  healthy: '#ffffff',
  thirsty: '#ffe39a', // warm yellow
  wilting: '#c79a5b', // brown-yellow
};
