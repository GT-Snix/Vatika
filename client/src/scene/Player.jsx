import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { EYE_HEIGHT, LAYOUT, PLAYER_RADIUS, PLINTH, WALK_RADIUS } from './layout.js';

const SPEED = 3; // metres per second, a relaxed walk
const BLOCK_RADIUS = PLINTH.radius + PLAYER_RADIUS; // closest the player's centre may get to a plinth's
const PLINTHS = Object.values(LAYOUT).map(({ position: [x, , z] }) => ({ x, z }));

// Keep the player inside the garden and outside every plinth. Returns the corrected [x, z].
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
    if (d < BLOCK_RADIUS && d > 0) {
      x = p.x + (dx / d) * BLOCK_RADIUS;
      z = p.z + (dz / d) * BLOCK_RADIUS;
    }
  }
  return [x, z];
}

// WASD movement for the camera. Looking around is done by PointerLockControls in Garden.
export default function Player({ locked, debug }) {
  const camera = useThree((state) => state.camera);
  if (debug) window.__camera = camera; // ?debug only: lets you inspect the position from the console
  const keys = useRef(new Set()); // keys held right now, e.g. 'KeyW'
  // Reused every frame instead of allocating new vectors 60+ times a second.
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());

  useEffect(() => {
    const down = (e) => keys.current.add(e.code); // e.code = physical key, so it works on any keyboard layout
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
    if (!locked) return;
    const k = keys.current;
    const ahead = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    const side = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    if (!ahead && !side) return;

    // Where the camera looks, flattened onto the ground so looking down doesn't slow you.
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up); // 90 degrees to the right of forward

    const move = forward.current.multiplyScalar(ahead).add(right.current.multiplyScalar(side));
    move.normalize(); // diagonal (W+D) is no faster than straight
    // Cap delta: after a pause (tab hidden) one huge delta would teleport the player.
    const distance = SPEED * Math.min(delta, 0.1);
    const [x, z] = collide(camera.position.x + move.x * distance, camera.position.z + move.z * distance);
    camera.position.set(x, EYE_HEIGHT, z);
  });

  return null;
}
