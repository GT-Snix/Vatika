import { Component, Suspense, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { palette } from './palette.js';

// "Aloe Vera" -> /models/aloe_vera.glb (files live in client/public/models).
export function modelUrl(name) {
  return `/models/${name.toLowerCase().replace(/ /g, '_')}.glb`;
}

// One plant's GLB. Swap the file and nothing else changes.
// onLoaded / onFailed let Garden count models for the ?debug readout.
export default function PlantModel({ name, debug, onLoaded, onFailed }) {
  const url = modelUrl(name);
  return (
    <ModelErrorBoundary url={url} onFailed={() => onFailed(name)}>
      {/* While the file downloads, show the placeholder instead of nothing. */}
      <Suspense fallback={<Placeholder />}>
        <LoadedModel url={url} name={name} debug={debug} onLoaded={() => onLoaded(name)} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

function LoadedModel({ url, name, debug, onLoaded }) {
  // useGLTF caches by URL: every PlantModel asking for the same file shares ONE loaded copy.
  const { scene } = useGLTF(url);

  // So each plant gets its own copy of the objects AND their materials. Without this,
  // tinting one plant's material (Stage C) would tint every plant sharing it.
  const copy = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.material = obj.material.clone();
      obj.castShadow = true;
      obj.receiveShadow = true; // leaves shade the pot and each other
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    onLoaded();
    if (debug) {
      // `scene` (the cached original) isn't placed anywhere, so its box is the raw model size,
      // to check against layout.js. `copy` is in the garden, so its box includes our scaling.
      const raw = new Box3().setFromObject(scene).getSize(new Vector3());
      const placed = new Box3().setFromObject(copy);
      console.log(`[model] ${name}: raw ${raw.x.toFixed(3)} x ${raw.y.toFixed(3)} x ${raw.z.toFixed(3)} m (w x h x d);`
        + ` placed: base y=${placed.min.y.toFixed(3)}, top y=${placed.max.y.toFixed(3)}`);
    }
    // Cloned materials are ours to free; the cached original stays for other plants.
    return () => copy.traverse((obj) => obj.isMesh && obj.material.dispose());
    // Only re-run when the model itself changes, not when the parent passes new callbacks.
  }, [copy]);

  return <primitive object={copy} />;
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
class ModelErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Loud on purpose: the exact URL, so a typo'd or missing file is obvious in the console.
    console.error(`Model failed to load: ${this.props.url}`, error);
    this.props.onFailed();
  }

  render() {
    return this.state.failed ? <Placeholder /> : this.props.children;
  }
}
