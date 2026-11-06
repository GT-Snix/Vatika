import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Stats } from '@react-three/drei';
import { EYE_HEIGHT, LAYOUT, PLINTH, WALK_RADIUS } from './layout.js';
import { palette } from './palette.js';
import PlantModel from './PlantModel.jsx';
import Player from './Player.jsx';

// Read once: ?debug in the URL turns on the FPS meter.
const DEBUG = new URLSearchParams(window.location.search).has('debug');
const PATH_RADIUS = 4.6; // the stone ring runs just inside the arc of plinths

export default function Garden({ plants }) {
  const [locked, setLocked] = useState(false); // is the mouse captured for looking around?

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
        {plants.map((plant) => {
          const spot = LAYOUT[plant.name];
          if (!spot) return null; // a plant with no place in layout.js simply isn't drawn
          return <Plinth key={plant.id} name={plant.name} {...spot} />;
        })}

        <PointerLockControls selector="#enter-garden" onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />
        <Player locked={locked} debug={DEBUG} />
        {DEBUG && <Stats className="stats" />}
      </Canvas>

      {!locked && (
        // Browsers only allow pointer lock in response to a click, hence this button.
        <button id="enter-garden" type="button" className="enter">
          Click to enter
          <small>WASD to walk · mouse to look · Esc to release</small>
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
        <ringGeometry args={[PATH_RADIUS - 0.5, PATH_RADIUS + 0.5, 64]} />
        <meshStandardMaterial color={palette.path} />
      </mesh>
    </group>
  );
}

function Plinth({ name, position, scale }) {
  const [x, y, z] = position;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, y / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[PLINTH.radius, PLINTH.radius * 1.08, y, 8]} />
        <meshStandardMaterial color={palette.plinth} flatShading />
      </mesh>
      <group position={[0, y, 0]} scale={scale}>
        <PlantModel name={name} />
      </group>
    </group>
  );
}
