import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Vector3 } from 'three';
import { EYE_HEIGHT, LAYOUT } from './layout.js';
import { RIG_LAYER } from './TwoPassRender.jsx';
import Droplets from './Droplets.jsx';

// Where the rig sits in CAMERA space (x right, y up, -z forward), in metres:
// the hands in the lower corners of the view, the can hanging from the right glove.
const HAND_L = [-0.2, -0.25, -0.4];
const HAND_R = [0.2, -0.23, -0.38];
const CAN_IN_HAND = [0, -0.015, -0.11]; // the handle sits in the glove's fingers
// Forearms angle up from below the screen (elbow lower than wrist), like real arms held out,
// so the sleeves run down out of view instead of straight back at the lens.
const ARM_PITCH = 0.45;
const BOOT_X = 0.11; // half the distance between the feet
const BOOT_PIVOT = 0.21; // boot model: shin pivot above the sole (models-src/player.py)
const POUR_SECONDS = 1.6; // whole pour: lift, pour, lower
const WATER_AT = 1.2; // seconds into the pour when the plant counts as watered (once)

// Smooth 0 -> 1 -> 0 over the pour: up in the first 0.25 s, down in the last 0.25 s.
function pourAmount(t) {
  return Math.min(1, t / 0.25, (POUR_SECONDS - t) / 0.25);
}

// The gardener's visible body: hands and can (attached to the camera, drawn on top by
// TwoPassRender), boots (in the world, following yaw only) and an invisible shadow caster.
// F pours: the can tilts toward the targeted plant and, 1.2 s in, onWatered(plantId) fires once.
export default function PlayerBody({ motion, active, target, onWatered }) {
  const camera = useThree((state) => state.camera);
  const { scene } = useGLTF('/models/player.glb');
  const parts = useMemo(() => {
    const copy = scene.clone(true);
    const get = (name) => {
      const node = copy.getObjectByName(name);
      node.position.set(0, 0, 0); // drop the preview layout; we place every part ourselves
      return node;
    };
    const p = { handL: get('hand_L'), handR: get('hand_R'), can: get('can'), bootL: get('boot_L'), bootR: get('boot_R') };
    for (const part of [p.handL, p.handR, p.can]) part.traverse((o) => o.layers.set(RIG_LAYER));
    p.spout = p.can.getObjectByName('spout');
    return p;
  }, [scene]);

  const holder = useRef(); // follows the camera exactly
  const armL = useRef();
  const armR = useRef();
  const canTilt = useRef();
  const feet = useRef();
  const capsule = useRef();
  // Everything the frame loop needs, made ONCE (no allocations per frame).
  const tmp = useMemo(() => ({ look: new Vector3(), handle: new Vector3() }), []);
  const stream = useMemo(() => ({ emitting: false, origin: new Vector3(), direction: new Vector3() }), []);
  const pour = useRef({ t: -1, plantId: null, watered: false, aim: 0 }); // t < 0 = not pouring
  const latest = useRef({}); // newest props, for the key listener added once
  latest.current = { active, target, onWatered };

  useEffect(() => {
    const onKey = (e) => {
      const { active: on, target: t } = latest.current;
      if (e.code !== 'KeyF' || e.repeat || !on || pour.current.t >= 0) return;
      // Remember WHICH plant now: looking away mid-pour still waters the one you aimed at.
      // With nothing targeted we still pour (for fun) but water nothing.
      const spot = t && LAYOUT[t.name];
      pour.current = { t: 0, plantId: t ? t.id : null, watered: false, aim: 0, x: spot?.position[0], z: spot?.position[2] };
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    holder.current.position.copy(camera.position);
    holder.current.quaternion.copy(camera.quaternion);

    // Yaw of the view: flatten the look direction onto the ground.
    camera.getWorldDirection(tmp.look);
    const yaw = Math.atan2(-tmp.look.x, -tmp.look.z);

    // Pour timeline.
    const p = pour.current;
    let amount = 0;
    if (p.t >= 0) {
      p.t += dt;
      amount = Math.max(0, pourAmount(p.t));
      if (p.x !== undefined) {
        // Turn the can toward the plant: the plant's yaw minus ours, wrapped to -pi..pi.
        const toPlant = Math.atan2(-(p.x - camera.position.x), -(p.z - camera.position.z));
        const rel = Math.atan2(Math.sin(toPlant - yaw), Math.cos(toPlant - yaw));
        p.aim = Math.max(-0.5, Math.min(0.5, rel));
      }
      if (p.t >= WATER_AT && !p.watered) {
        p.watered = true; // exactly one API call per pour
        if (p.plantId !== null) latest.current.onWatered(p.plantId);
      }
      if (p.t >= POUR_SECONDS) p.t = -1;
    }

    // Hands: idle breathing when still, sway in step with the head bob when walking,
    // pumped low when sprinting, raised when pouring.
    const walk = motion.walk;
    const breathe = Math.sin(state.clock.elapsedTime * 1.6) * 0.004 * (1 - walk);
    const swayX = Math.sin(motion.phase) * 0.012 * walk;
    const swayY = -Math.abs(Math.sin(motion.phase)) * 0.012 * walk + breathe;
    const s = motion.sprint;
    armL.current.position.set(HAND_L[0] + swayX, HAND_L[1] + swayY - 0.05 * s, HAND_L[2] + 0.04 * s);
    armL.current.rotation.x = ARM_PITCH - 0.35 * s;
    // Pouring pushes the arm forward and only a little up, so the sleeve's far end never
    // swings toward the lens; the CAN turns toward the plant, around its handle.
    armR.current.position.set(HAND_R[0] + swayX, HAND_R[1] + swayY - 0.05 * s + 0.06 * amount, HAND_R[2] + 0.04 * s - 0.12 * amount);
    armR.current.rotation.x = ARM_PITCH - 0.35 * s;
    canTilt.current.rotation.set(-0.9 * amount, p.aim * amount, 0); // spout dips, aimed at the plant

    // Water leaves the rose while the can is well tilted, heading out along the spout.
    stream.emitting = amount > 0.7;
    if (stream.emitting) {
      parts.spout.getWorldPosition(stream.origin);
      parts.can.getWorldPosition(tmp.handle);
      stream.direction.subVectors(stream.origin, tmp.handle).normalize();
    }

    // Boots: under the player, turned with yaw only, so looking down shows your feet.
    const ground = camera.position.y - EYE_HEIGHT - Math.abs(Math.sin(motion.phase)) * 0.025 * walk;
    feet.current.position.set(camera.position.x, ground + BOOT_PIVOT, camera.position.z);
    feet.current.rotation.y = yaw;
    const swing = Math.sin(motion.phase) * 0.5 * walk;
    parts.bootL.rotation.x = swing;
    parts.bootR.rotation.x = -swing;
    parts.bootL.position.y = Math.max(0, Math.sin(motion.phase)) * 0.05 * walk; // lift the leg going forward
    parts.bootR.position.y = Math.max(0, -Math.sin(motion.phase)) * 0.05 * walk;
    capsule.current.position.set(camera.position.x, ground + 0.85, camera.position.z);
  });

  return (
    <>
      <group ref={holder}>
        <group ref={armL}><primitive object={parts.handL} /></group>
        <group ref={armR}>
          <primitive object={parts.handR} />
          {/* Undo the arm's pitch so the can hangs straight down from the glove. */}
          <group position={CAN_IN_HAND} rotation={[-ARM_PITCH, 0, 0]}>
            <group ref={canTilt}><primitive object={parts.can} /></group>
          </group>
        </group>
      </group>
      <group ref={feet}>
        <group position={[-BOOT_X, 0, -0.05]}><primitive object={parts.bootL} /></group>
        <group position={[BOOT_X, 0, -0.05]}><primitive object={parts.bootR} /></group>
      </group>
      {/* Invisible player body: draws nothing on screen (colorWrite off) but still casts a
          shadow, so the player's shadow walks along the ground. */}
      <mesh ref={capsule} castShadow>
        <capsuleGeometry args={[0.22, 1.2, 4, 8]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      <Droplets stream={stream} />
    </>
  );
}

useGLTF.preload('/models/player.glb'); // start downloading before the first frame needs it
