// Run with: npm test. No test framework, just Node's built-in assert:
// if a check fails it throws and the process exits with an error.
import assert from 'node:assert/strict';
import { health, secondsUntil } from './health.js';

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

// --- secondsUntil: real seconds until a status change ---
// Interval 24h: health() turns thirsty once unrounded health drops below 66.5,
// i.e. after 2 * 24 * (1 - 0.665) = 16.08 game hours; wilting below 33.5 = 31.92 hours.
const MINUTE = 1 / 60; // in hours, for after()

// 6. Just watered, real time: 16.08 h = 57888 s, 31.92 h = 114912 s.
assert.equal(secondsUntil('thirsty', watered, INTERVAL, after(0)), 57888);
assert.equal(secondsUntil('wilting', watered, INTERVAL, after(0)), 114912);

// 7. Speed 60 divides real time by 60: 964.8 s and 1915.2 s, rounded up.
assert.equal(secondsUntil('thirsty', watered, INTERVAL, after(0), 60), 965);
assert.equal(secondsUntil('wilting', watered, INTERVAL, after(0), 60), 1916);

// 8. Speed 60, 20 real minutes later: already thirsty (null);
// wilting at 31.92 real minutes, so 11.92 min = 715.2 s left, rounded up.
assert.equal(secondsUntil('thirsty', watered, INTERVAL, after(20 * MINUTE), 60), null);
assert.equal(secondsUntil('wilting', watered, INTERVAL, after(20 * MINUTE), 60), 716);

// 9. Long neglected: both already past.
assert.equal(secondsUntil('thirsty', watered, INTERVAL, after(1000)), null);
assert.equal(secondsUntil('wilting', watered, INTERVAL, after(1000)), null);

// 10. Agreement with health(), at speed 600: one second before the predicted
// moment the status hasn't changed yet; at the predicted moment it has.
const SECOND = 1 / 3600; // in hours, for after()
for (const [status, before] of [['thirsty', 'healthy'], ['wilting', 'thirsty']]) {
  const s = secondsUntil(status, watered, INTERVAL, after(0), 600);
  assert.equal(health(watered, INTERVAL, after((s - 1) * SECOND), 600).status, before);
  assert.equal(health(watered, INTERVAL, after(s * SECOND), 600).status, status);
}

console.log('health: all 10 tests passed');
