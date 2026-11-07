import { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Color, Vector3 } from 'three';
import { POT_BASE_RADIUS } from './layout.js';
import { palette, statusTint } from './palette.js';

// How each status looks. tilt leans the plant toward the viewer; scaleY droops it a
// little, never below 0.94 so it never looks crushed. Applied to the model's "plant"
// node only, so the pot keeps its colour and stays upright on the plinth.
const LOOK = {
  healthy: { tilt: 0, scaleY: 1, color: new Color(statusTint.healthy) },
  thirsty: { tilt: (4 * Math.PI) / 180, scaleY: 0.97, color: new Color(statusTint.thirsty) },
  wilting: { tilt: (10 * Math.PI) / 180, scaleY: 0.94, color: new Color(statusTint.wilting) },
};

// "Aloe Vera" -> /models/aloe_vera.glb (files live in client/public/models).
export function modelUrl(name) {
  return `/models/${name.toLowerCase().replace(/ /g, '_')}.glb`;
}

// One plant's GLB. Swap the file and nothing else changes.
// onLoaded / onFailed let Garden count models for the ?debug readout.
export default function PlantModel({ name, status, perkAt, debug, onLoaded, onFailed }) {
  const url = modelUrl(name);
  return (
    <ModelErrorBoundary url={url} onFailed={() => onFailed(name)}>
      {/* While the file downloads, show the placeholder instead of nothing. */}
      <Suspense fallback={<Placeholder />}>
        <LoadedModel url={url} name={name} status={status} perkAt={perkAt} debug={debug} onLoaded={() => onLoaded(name)} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

function LoadedModel({ url, name, status, perkAt, debug, onLoaded }) {
  // useGLTF caches by URL: every PlantModel asking for the same file shares ONE loaded copy.
  const { scene } = useGLTF(url);

  // So each plant gets its own copy of the objects AND their materials. Without this,
  // tinting one plant's material would tint every plant sharing it.
  const { copy, plantNode, tinted } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.material = obj.material.clone();
      obj.castShadow = true;
      obj.receiveShadow = true; // leaves shade the pot and each other
    });
    // The models are root -> "pot" + "plant" (models-src/lib.py). The plant node's origin
    // is the soil centre, so rotating or scaling it pivots exactly where the stems start.
    const plant = clone.getObjectByName('plant') || null;
    const mats = [];
    (plant || clone).traverse((obj) => obj.isMesh && mats.push(obj.material));
    return { copy: clone, plantNode: plant, tinted: mats };
  }, [scene]);

  // Ease toward the look for the current status a little every frame, so a change of
  // status fades in instead of snapping. 1 - e^(-3 * delta) gives the same speed at any fps.
  // Without a "plant" node (an older single-mesh model) the whole model moves instead,
  // using the wrapper group below.
  const tiltRef = useRef();
  const droop = useRef(1); // eased height, kept apart from the perk pulse below
  useFrame((_, delta) => {
    const look = LOOK[status] || LOOK.healthy;
    const k = 1 - Math.exp(-3 * delta);
    const g = plantNode || tiltRef.current;
    g.rotation.x += (look.tilt - g.rotation.x) * k;
    droop.current += (look.scaleY - droop.current) * k;
    // Perk-up after watering: a quick 12% swell and back over 0.6 s (half a sine wave).
    const since = perkAt ? (performance.now() - perkAt) / 1000 : 1;
    const pulse = since < 0.6 ? 1 + 0.12 * Math.sin((Math.PI * since) / 0.6) : 1;
    g.scale.set(pulse, droop.current * pulse, pulse);
    for (const m of tinted) m.color.lerp(look.color, k); // material colour x vertex colours
  });

  useEffect(() => {
    onLoaded();
    if (!plantNode) console.warn(`${name}: model has no "plant" node; tinting and tilting the whole model, pot included.`);
    if (debug) {
      // `scene` (the cached original) isn't placed anywhere, so its box is the raw model size,
      // to check against layout.js. `copy` is in the garden, so its box includes our scaling.
      const raw = new Box3().setFromObject(scene).getSize(new Vector3());
      // Before the first frame renders, the parents' positions aren't applied yet; this
      // updates them, or "placed" would report the model's own (unplaced) coordinates.
      copy.updateWorldMatrix(true, true);
      const placed = new Box3().setFromObject(copy);
      console.log(`[model] ${name}: raw ${raw.x.toFixed(3)} x ${raw.y.toFixed(3)} x ${raw.z.toFixed(3)} m (w x h x d);`
        + ` placed: base y=${placed.min.y.toFixed(3)}, top y=${placed.max.y.toFixed(3)}`);
    }
    // Cloned materials are ours to free; the cached original stays for other plants.
    return () => copy.traverse((obj) => obj.isMesh && obj.material.dispose());
    // Only re-run when the model itself changes, not when the parent passes new callbacks.
  }, [copy]);

  // Fallback only: tilt the whole model around the pot's FRONT base edge (+Z faces the viewer),
  // so leaning forward lifts the back of the pot instead of pushing the front into the plinth.
  // With a "plant" node these groups never move and cancel out.
  return (
    <group position={[0, 0, POT_BASE_RADIUS]}>
      <group ref={tiltRef}>
        <primitive object={copy} position={[0, 0, -POT_BASE_RADIUS]} />
      </group>
    </group>
  );
}

// Stand-in pot + bush, shown while loading or if the model can't be loaded.
function Placeholder() {
  return (
    <group>
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.13, 0.22, 10]} />
        <meshStandardMaterial color={palette.placeholder} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <coneGeometry args={[0.16, 0.4, 6]} />
        <meshStandardMaterial color={palette.placeholder} flatShading />
      </mesh>
    </group>
  );
}

// A missing or broken file makes useGLTF throw; this catches it so one bad model shows the
// placeholder instead of blanking the whole scene. React only offers this as a class component.
// (Alternative: the react-error-boundary package, but that's a dependency for ten lines.)
// Also used for the player rig, with fallback={null}.
export class ModelErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Loud on purpose: the exact URL, so a typo'd or missing file is obvious in the console.
    console.error(`Model failed to load: ${this.props.url}`, error);
    this.props.onFailed?.();
  }

  render() {
    const fallback = this.props.fallback === undefined ? <Placeholder /> : this.props.fallback;
    return this.state.failed ? fallback : this.props.children;
  }
}
