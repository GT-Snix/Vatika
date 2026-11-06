const MS_PER_HOUR = 60 * 60 * 1000;

// The status boundaries, shared by health() and minutesUntil() so the two can
// never drift apart: above 66 = healthy, above 33 = thirsty, otherwise wilting.
export const THRESHOLDS = { thirsty: 66, wilting: 33 };

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
  if (value > THRESHOLDS.thirsty) status = 'healthy';
  else if (value > THRESHOLDS.wilting) status = 'thirsty';

  return { health: value, status };
}

// Real minutes until health() first reports `status` ('thirsty' or 'wilting');
// null if the plant is already there. Also pure, same arguments as health().
export function minutesUntil(status, lastWateredAt, waterIntervalHours, now = new Date(), timeScale = 1) {
  // health() rounds before comparing, so e.g. 66.4 shows as 66 = thirsty.
  // The status therefore flips when the unrounded value drops below threshold + 0.5.
  const level = THRESHOLDS[status] + 0.5;
  // The health formula solved for hours: raw = 100 * (1 - h / 2i)  =>  h = 2i * (1 - raw / 100).
  const gameHoursToLevel = 2 * waterIntervalHours * (1 - level / 100);
  // Game hours -> real hours: divide by the speed. Then subtract the time already passed.
  const realHoursLeft = gameHoursToLevel / timeScale - (now - lastWateredAt) / MS_PER_HOUR;
  // Round up, so the last partial minute still shows as "1 minute" rather than 0.
  return realHoursLeft > 0 ? Math.ceil(realHoursLeft * 60) : null;
}
