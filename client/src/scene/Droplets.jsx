import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Matrix4 } from 'three';

const COUNT = 60; // the whole pool: never more droplets than this alive at once
const RATE = 55; // new droplets per second while pouring
const LIFE = 0.9; // seconds before a droplet is recycled
const GRAVITY = 9.8;

// Water from the can's spout. ONE instanced mesh = one draw call for all 60 droplets.
// Nothing is created per frame: the pool is plain number arrays made once, and a "dead"
// droplet is simply shrunk to zero size until its slot is reused.
// `stream` is written by PlayerBody: { emitting, origin: Vector3, direction: Vector3 }.
export default function Droplets({ stream }) {
  const mesh = useRef();
  const pool = useMemo(() => ({
    pos: new Float32Array(COUNT * 3),
    vel: new Float32Array(COUNT * 3),
    life: new Float32Array(COUNT), // seconds left; 0 = free slot
    next: 0, // the slot the next droplet takes (oldest first, round and round)
    owed: 0, // fraction of a droplet carried to the next frame, so the rate holds at any fps
  }), []);
  const matrix = useMemo(() => new Matrix4(), []);
  const hidden = useMemo(() => new Matrix4().makeScale(0, 0, 0), []);

  useLayoutEffect(() => {
    for (let i = 0; i < COUNT; i++) mesh.current.setMatrixAt(i, hidden); // start with none visible
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [hidden]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { pos, vel, life } = pool;

    if (stream.emitting) {
      pool.owed += RATE * dt;
      while (pool.owed >= 1) {
        pool.owed -= 1;
        const i = pool.next;
        pool.next = (pool.next + 1) % COUNT;
        const s = 1.1 + Math.random() * 0.4; // speed varies a little so it reads as a spray
        pos[i * 3] = stream.origin.x;
        pos[i * 3 + 1] = stream.origin.y;
        pos[i * 3 + 2] = stream.origin.z;
        vel[i * 3] = stream.direction.x * s + (Math.random() - 0.5) * 0.25;
        vel[i * 3 + 1] = stream.direction.y * s + (Math.random() - 0.5) * 0.25;
        vel[i * 3 + 2] = stream.direction.z * s + (Math.random() - 0.5) * 0.25;
        life[i] = LIFE;
      }
    }

    for (let i = 0; i < COUNT; i++) {
      if (life[i] <= 0) continue; // already hidden
      life[i] -= dt;
      vel[i * 3 + 1] -= GRAVITY * dt; // falls in an arc
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (life[i] <= 0 || pos[i * 3 + 1] < 0) {
        life[i] = 0;
        mesh.current.setMatrixAt(i, hidden); // free the slot
      } else {
        mesh.current.setMatrixAt(i, matrix.makeTranslation(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true; // upload the new positions to the GPU
  });

  // frustumCulled off: three.js would cull using the bounds of ONE droplet at the origin.
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <icosahedronGeometry args={[0.012, 0]} />
      <meshBasicMaterial color="#a8d8ff" transparent opacity={0.85} />
    </instancedMesh>
  );
}
