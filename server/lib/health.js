const MS_PER_HOUR = 60 * 60 * 1000;

// Pure function: no database, no global state. Even "now" is a parameter
// (defaulting to the real clock), so tests can pass a fixed time.
// Health falls in a straight line from 100 (just watered) to 0 at two intervals.
export function health(lastWateredAt, waterIntervalHours, now = new Date(), timeScale = 1) {
  // Subtracting two Dates gives milliseconds. timeScale > 1 makes game time run faster.
  const hoursSince = ((now - lastWateredAt) / MS_PER_HOUR) * timeScale;
  const raw = 100 * (1 - hoursSince / (2 * waterIntervalHours));
  // Clamp to 0..100, then round so the client shows a whole number.
  const value = Math.round(Math.min(100, Math.max(0, raw)));

  let status = 'wilting';
  if (value > 66) status = 'healthy';
  else if (value > 33) status = 'thirsty';

  return { health: value, status };
}
