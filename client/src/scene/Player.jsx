import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { EYE_HEIGHT, LAYOUT, WALK_RADIUS } from './layout.js';

// 3 m/s with frame time capped at 0.1 s means at most 0.3 m per frame (0.48 sprinting): far
// less than the smallest collision circle (1.4 m across), so a step can never jump clean over one.
const SPEED = 3; // metres per second, a relaxed walk
const SPRINT = 1.6; // Shift multiplies the speed by this
const GRAVITY = 9.8;
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * 0.9); // launch speed that peaks 0.9 m up (v^2 = 2gh)
const STEP_LENGTH = 0.7; // metres per step: the walk cycle advances with DISTANCE, not time
const BOB = 0.025; // head bob height while walking, metres
// Each plinth's centre and how close the player's centre may get to it (set in layout.js).
const PLINTHS = Object.values(LAYOUT).map(({ position: [x, , z], blockRadius }) => ({ x, z, r: blockRadius }));
const corrected = [0, 0]; // collide() writes here instead of making a new array every frame

// Keep the player inside the garden and outside every plinth. Returns the corrected [x, z].
// Purely 2D (x and z): height is ignored, which is why a jump can't clear a plinth.
function collide(x, z) {
  // 1. Too far out? Pull back onto the edge circle, in the same direction.
  const fromCentre = Math.hypot(x, z);
  if (fromCentre > WALK_RADIUS) {
    x *= WALK_RADIUS / fromCentre;
    z *= WALK_RADIUS / fromCentre;
  }
  // 2. Inside a plinth's circle? Push out along the line from the plinth's centre to the player.
  for (const p of PLINTHS) {
    const dx = x - p.x;
    const dz = z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < p.r && d > 0) {
      x = p.x + (dx / d) * p.r;
      z = p.z + (dz / d) * p.r;
    }
  }
  corrected[0] = x;
  corrected[1] = z;
  return corrected;
}

// WASD walking, Shift sprint, Space jump, head bob. Looking around is PointerLockControls.
// Writes into `motion` (shared with PlayerBody) so hands and boots move in step:
// walk (0-1 how much we're walking), phase (step cycle), sprint (0-1).
export default function Player({ locked, motion, debug }) {
  const camera = useThree((state) => state.camera);
  if (debug) window.__camera = camera; // ?debug only: lets you inspect the position from the console
  const keys = useRef(new Set()); // keys held right now, e.g. 'KeyW'
  const jumpPressed = useRef(false);
  const air = useRef({ height: 0, speed: 0 }); // height above the ground and vertical speed
  // Reused every frame instead of allocating new vectors 60+ times a second.
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());

  useEffect(() => {
    const down = (e) => {
      keys.current.add(e.code); // e.code = physical key, so it works on any keyboard layout
      if (e.code === 'Space' && !e.repeat) jumpPressed.current = true; // one jump per press
    };
    const up = (e) => keys.current.delete(e.code);
    const clear = () => keys.current.clear(); // switching windows mid-press would leave a key "stuck"
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  useEffect(() => {
    if (!locked) keys.current.clear();
  }, [locked]);

  // useFrame runs once per rendered frame; delta = seconds since the previous frame.
  useFrame((_, delta) => {
    // Cap delta: after a pause (tab hidden) one huge delta would teleport the player.
    const dt = Math.min(delta, 0.1);
    const k = keys.current;
    const grounded = air.current.height === 0;

    // Jump: only from the ground (no double jump), only while walking around, not in a panel.
    if (jumpPressed.current && locked && grounded) air.current.speed = JUMP_SPEED;
    jumpPressed.current = false;
    // Gravity runs even when paused, so opening the panel mid-jump still lands you.
    air.current.speed -= GRAVITY * dt;
    air.current.height = Math.max(0, air.current.height + air.current.speed * dt);
    if (air.current.height === 0) air.current.speed = 0;

    const ahead = locked ? (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0) : 0;
    const side = locked ? (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) : 0;
    const sprinting = locked && (k.has('ShiftLeft') || k.has('ShiftRight')) && ahead > 0;
    let moved = 0;
    if (ahead || side) {
      // Where the camera looks, flattened onto the ground so looking down doesn't slow you.
      camera.getWorldDirection(forward.current);
      forward.current.y = 0;
      forward.current.normalize();
      right.current.crossVectors(forward.current, camera.up); // 90 degrees to the right of forward
      const move = forward.current.multiplyScalar(ahead).add(right.current.multiplyScalar(side));
      move.normalize(); // diagonal (W+D) is no faster than straight
      const step = SPEED * (sprinting ? SPRINT : 1) * dt;
      const [x, z] = collide(camera.position.x + move.x * step, camera.position.z + move.z * step);
      moved = Math.hypot(x - camera.position.x, z - camera.position.z); // less if a plinth stopped us
      camera.position.x = x;
      camera.position.z = z;
    }

    // Shared walk state. 1 - e^(-10 dt) eases at the same rate at any frame rate.
    const ease = 1 - Math.exp(-10 * dt);
    motion.walk += ((moved > 0 && grounded ? 1 : 0) - motion.walk) * ease;
    motion.sprint += ((sprinting ? 1 : 0) - motion.sprint) * ease;
    motion.phase += (moved / STEP_LENGTH) * Math.PI; // half a cycle per step
    // Head bob: two bumps per cycle (one per footstep), faded by how much we're walking.
    camera.position.y = EYE_HEIGHT + air.current.height + Math.abs(Math.sin(motion.phase)) * BOB * motion.walk;
  });

  return null;
}
