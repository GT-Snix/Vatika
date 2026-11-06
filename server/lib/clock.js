// The ONE list of game-clock speeds a user may pick. timeScale = how many game
// hours pass per real hour: 600 means one real minute counts as ten game hours.
export const SPEEDS = [
  { timeScale: 1, label: 'Real time' },
  { timeScale: 4, label: 'Relaxed' },
  { timeScale: 60, label: 'Quick' },
  { timeScale: 600, label: 'Demo' },
];

// Strict ===, so the string "60" is rejected: the client must send a number.
export function isValidSpeed(value) {
  return SPEEDS.some((speed) => speed.timeScale === value);
}
