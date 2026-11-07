import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Stats } from '@react-three/drei';
import { EYE_HEIGHT, LAYOUT, PATH_HALF_WIDTH, PATH_RADIUS } from './layout.js';
import { palette } from './palette.js';
import Plinth from './Plinth.jsx';
import Player from './Player.jsx';
import Targeting from './Targeting.jsx';

// Read once: ?debug in the URL turns on the FPS meter and the model-loading readout.
const DEBUG = new URLSearchParams(window.location.search).has('debug');

// The 3D world. App owns pointer-lock state (`locked`) and whether a panel/modal is open
// (`paused`), because the HUD and the panel need them too.
export default function Garden({ plants, locked, paused, targetId, onLock, onUnlock, onTarget }) {
  const [entered, setEntered] = useState(false); // after the first entry the button says "resume"
  // name -> 'loaded' | 'failed', reported by each PlantModel; only shown under ?debug.
  const [models, setModels] = useState({});
  const report = (status) => (name) => setModels((m) => ({ ...m, [name]: status }));
  const failed = Object.keys(models).filter((name) => models[name] === 'failed');
  const active = locked && !paused; // walking and targeting only while actually in the garden

  return (
    <div className="world">
      {/* "percentage" = PCF shadow maps, softened by the light's shadow-radius below (three r186
          removed the old PCFSoft type). dpr caps the pixel ratio so retina screens stay near 60 fps.
          rotation [0,0,0] matters: without it R3F aims the camera at the origin = at our feet. */}
      <Canvas
        shadows="percentage"
        dpr={[1, 1.5]}
        camera={{ fov: 70, near: 0.1, far: 120, position: [0, EYE_HEIGHT, 0], rotation: [0, 0, 0] }}
      >
        <color attach="background" args={[palette.sky]} />
        {/* Linear fog from 14 m to 40 m: the far ground melts into the sky. */}
        <fog attach="fog" args={[palette.fog, 14, 40]} />
        <hemisphereLight args={[palette.hemiSky, palette.hemiGround, 0.9]} />
        <directionalLight
          castShadow
          position={[8, 12, 5]}
          intensity={2.2}
          color={palette.sun}
          shadow-mapSize={[1024, 1024]} // modest: enough for 8 plants, cheap on laptops
          // The shadow camera only needs to cover the garden, so its texels stay sharp.
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-bias={-0.0005} // stops surfaces shadowing themselves in stripes ("acne")
          shadow-radius={4} // blur the shadow edge a little: soft, not razor-sharp
        />

        <Ground />
        {plants.map((plant) => LAYOUT[plant.name] && ( // a plant with no place in layout.js isn't drawn
          <Plinth key={plant.id} plant={plant} spot={LAYOUT[plant.name]} targeted={plant.id === targetId}
            debug={DEBUG} onLoaded={report('loaded')} onFailed={report('failed')} />
        ))}

        <PointerLockControls selector="#enter-garden"
          onLock={() => { setEntered(true); onLock(); }} onUnlock={onUnlock} />
        <Player locked={active} debug={DEBUG} />
        <Targeting plants={plants} enabled={active} onChange={onTarget} />
        {DEBUG && <Stats className="stats" />}
      </Canvas>

      {DEBUG && (
        <p className="debug">
          models: {Object.values(models).filter((s) => s === 'loaded').length}/{plants.length} loaded
          {failed.length > 0 && ` · failed: ${failed.join(', ')}`}
        </p>
      )}
      {!locked && !paused && (
        // Browsers only allow pointer lock in response to a click, hence this button.
        <button id="enter-garden" type="button" className="enter glass">
          {entered ? 'Click to resume' : 'Click to enter'}
          <small>WASD to walk · mouse to look · E to inspect · Esc to release</small>
        </button>
      )}
    </div>
  );
}

function Ground() {
  return (
    // Planes are built standing up; rotate -90 degrees about X to lay them flat.
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        {/* Far bigger than the walkable area, so its edge is always deep inside the fog. */}
        <circleGeometry args={[100, 48]} />
        <meshStandardMaterial color={palette.ground} />
      </mesh>
      {/* 1 cm above the grass, so the two never share a plane and flicker (z-fighting). */}
      <mesh position={[0, 0, 0.01]} receiveShadow>
        <ringGeometry args={[PATH_RADIUS - PATH_HALF_WIDTH, PATH_RADIUS + PATH_HALF_WIDTH, 64]} />
        <meshStandardMaterial color={palette.path} />
      </mesh>
    </group>
  );
}
