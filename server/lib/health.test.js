// Run with: npm test. No test framework, just Node's built-in assert:
// if a check fails it throws and the process exits with an error.
import assert from 'node:assert/strict';
import { health, minutesUntil } from './health.js';

const HOUR = 60 * 60 * 1000;
const watered = new Date('2026-01-01T00:00:00Z');
const after = (hours) => new Date(watered.getTime() + hours * HOUR);
const INTERVAL = 24; // a Tulsi-like plant

// 1. Just watered: full health.
assert.deepEqual(health(watered, INTERVAL, after(0)), { health: 100, status: 'healthy' });

// 2. One interval later: halfway down.
assert.deepEqual(health(watered, INTERVAL, after(24)), { health: 50, status: 'thirsty' });

// 3. Two intervals later: reaches zero.
assert.deepEqual(health(watered, INTERVAL, after(48)), { health: 0, status: 'wilting' });

// 4. Long neglected: clamped at 0, never negative.
assert.deepEqual(health(watered, INTERVAL, after(1000)), { health: 0, status: 'wilting' });

// 5. timeScale = 60: 24 real minutes count as 24 game hours, i.e. one interval.
assert.deepEqual(health(watered, INTERVAL, after(24 / 60), 60), { health: 50, status: 'thirsty' });

// --- minutesUntil: real minutes until a status change ---
// Interval 24h: health() turns thirsty once unrounded health drops below 66.5,
// i.e. after 2 * 24 * (1 - 0.665) = 16.08 game hours; wilting below 33.5 = 31.92 hours.

// 6. Just watered, real time: 16.08 h = 964.8 min, rounded up.
assert.equal(minutesUntil('thirsty', watered, INTERVAL, after(0)), 965);
assert.equal(minutesUntil('wilting', watered, INTERVAL, after(0)), 1916);

// 7. Speed 60 divides real time by 60: 16.08 and 31.92 real minutes.
assert.equal(minutesUntil('thirsty', watered, INTERVAL, after(0), 60), 17);
assert.equal(minutesUntil('wilting', watered, INTERVAL, after(0), 60), 32);

// 8. Already thirsty after 20 h: null for thirsty; 11.92 h = 715.2 min to wilting.
assert.equal(minutesUntil('thirsty', watered, INTERVAL, after(20)), null);
assert.equal(minutesUntil('wilting', watered, INTERVAL, after(20)), 716);

// 9. Long neglected: both already past.
assert.equal(minutesUntil('thirsty', watered, INTERVAL, after(1000)), null);
assert.equal(minutesUntil('wilting', watered, INTERVAL, after(1000)), null);

// 10. Agreement with health(), at speed 600: one minute before the predicted
// moment the status hasn't changed yet; at the predicted moment it has.
for (const [status, before] of [['thirsty', 'healthy'], ['wilting', 'thirsty']]) {
  const m = minutesUntil(status, watered, INTERVAL, after(0), 600);
  assert.equal(health(watered, INTERVAL, after((m - 1) / 60), 600).status, before);
  assert.equal(health(watered, INTERVAL, after(m / 60), 600).status, status);
}

console.log('health: all 10 tests passed');
