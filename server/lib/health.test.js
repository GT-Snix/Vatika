// Run with: npm test. No test framework, just Node's built-in assert:
// if a check fails it throws and the process exits with an error.
import assert from 'node:assert/strict';
import { health } from './health.js';

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

console.log('health: all 5 tests passed');
