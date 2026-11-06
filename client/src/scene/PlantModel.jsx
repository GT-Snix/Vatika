import { Component, Suspense, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { palette } from './palette.js';

// "Aloe Vera" -> /models/aloe_vera.glb (files live in client/public/models).
export function modelUrl(name) {
  return `/models/${name.toLowerCase().replace(/ /g, '_')}.glb`;
}

// One plant's GLB. Swap the file and nothing else changes.
export default function PlantModel({ name }) {
  return (
    <ModelErrorBoundary name={name}>
      {/* While the file downloads, show the placeholder instead of nothing. */}
      <Suspense fallback={<Placeholder />}>
        <LoadedModel url={modelUrl(name)} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

function LoadedModel({ url }) {
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

  // Cloned materials are ours to free; the cached original stays for other plants.
  useEffect(() => () => copy.traverse((obj) => obj.isMesh && obj.material.dispose()), [copy]);

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
// placeholder instead of crashing the whole scene. React only offers this as a class component.
// (Alternative: the react-error-boundary package, but that's a dependency for ten lines.)
class ModelErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn(`Could not load the model for ${this.props.name}; showing a placeholder.`, error);
  }

  render() {
    return this.state.failed ? <Placeholder /> : this.props.children;
  }
}
