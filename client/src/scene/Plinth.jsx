import { palette } from './palette.js';
import PlantModel from './PlantModel.jsx';

// One stone plinth with its plant on top. Every number comes from the plant's `spot` in layout.js.
export default function Plinth({ plant, spot, targeted, perkAt, debug, onLoaded, onFailed }) {
  const [x, y, z] = spot.position;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, y / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[spot.plinthRadius, spot.plinthRadius * 1.08, y, 8]} />
        {/* Emissive adds a little light of its own: the targeted plinth glows faintly. */}
        <meshStandardMaterial color={palette.plinth} emissive={targeted ? palette.plinthGlow : '#000000'} flatShading />
      </mesh>
      {/* Pot base at the plinth top (y), turned to face the spawn, at the shared plant scale. */}
      <group position={[0, y, 0]} rotation={[0, spot.facing, 0]} scale={spot.scale}>
        <PlantModel name={plant.name} status={plant.status} perkAt={perkAt} debug={debug} onLoaded={onLoaded} onFailed={onFailed} />
      </group>
    </group>
  );
}
