import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { LAYOUT, TARGET_ANGLE_DEGREES, TARGET_RANGE } from './layout.js';

const MAX_ANGLE = (TARGET_ANGLE_DEGREES * Math.PI) / 180;

// Works out which plant the player is facing, with plain geometry instead of raycasting:
// near enough on the ground AND close enough to straight ahead. (Alternative: a raycast
// against the meshes, but thin leaves are hard to hit and it costs more per frame.)
// Renders nothing; reports changes through onChange(plantId | null).
export default function Targeting({ plants, enabled, onChange }) {
  const camera = useThree((state) => state.camera);
  const current = useRef(null);
  const forward = useRef(new Vector3()); // reused every frame

  useFrame(() => {
    if (!enabled) return; // keep the last target while the panel is open
    camera.getWorldDirection(forward.current);
    // Flatten to the ground: looking a little up or down shouldn't change the target.
    const fx = forward.current.x;
    const fz = forward.current.z;
    const flat = Math.hypot(fx, fz); // ~0 only when looking straight down or up

    let best = null;
    let bestAngle = MAX_ANGLE;
    for (const plant of plants) {
      const spot = LAYOUT[plant.name];
      if (!spot || flat < 1e-6) continue;
      const dx = spot.position[0] - camera.position.x;
      const dz = spot.position[2] - camera.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > TARGET_RANGE || distance === 0) continue;
      // Angle between "where I look" and "where the plant is", from their dot product.
      const cos = (fx * dx + fz * dz) / (flat * distance);
      const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
      if (angle < bestAngle) {
        bestAngle = angle;
        best = plant.id;
      }
    }
    // Only tell React when the target actually changes, not 60 times a second.
    if (best !== current.current) {
      current.current = best;
      onChange(best);
    }
  });

  return null;
}
