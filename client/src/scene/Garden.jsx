import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Stats } from '@react-three/drei';
import { EYE_HEIGHT, LAYOUT, PATH_HALF_WIDTH, PATH_RADIUS } from './layout.js';
import { palette } from './palette.js';
import Plinth from './Plinth.jsx';
import Player from './Player.jsx';
import SkyLighting from './SkyLighting.jsx';
import Targeting from './Targeting.jsx';

// Read once: ?debug in the URL turns on the FPS meter and the model-loading readout.
const DEBUG = new URLSearchParams(window.location.search).has('debug');

// The 3D world. App owns pointer-lock state (`locked`) and whether a panel/modal is open
// (`paused`), because the HUD and the panel need them too.
export default function Garden({ plants, sky, locked, paused, targetId, onLock, onUnlock, onTarget }) {
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
        <SkyLighting getHour={sky.getHour} />

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
        <div className="debug">
          <p>
            models: {Object.values(models).filter((s) => s === 'loaded').length}/{plants.length} loaded
            {failed.length > 0 && ` · failed: ${failed.join(', ')}`}
          </p>
          <label>
            time {sky.hour.toFixed(2)}
            <input type="range" min={0} max={23.99} step={0.05} value={sky.hour}
              onChange={(e) => sky.setHour(Number(e.target.value))} />
          </label>
        </div>
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
