import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture, Color, Object3D, Vector3 } from 'three';
import { seededRandom } from './layout.js';
import { SKY_KEYS } from './palette.js';

const SHADOW_BOX = 12; // the shadow camera always covers +/-12 m: the whole garden
const LIGHT_DISTANCE = 30; // how far from the garden centre the light sits, along the sun direction
const STAR_COUNT = 100;
const COLOR_FIELDS = ['sun', 'hemiSky', 'hemiGround', 'fog'];
const NUMBER_FIELDS = ['sunIntensity', 'hemi', 'glow', 'stars'];

// Keyframe colours turned into three.js Colors once, not every frame.
const KEYS = SKY_KEYS.map((k) => ({ ...k, ...Object.fromEntries(COLOR_FIELDS.map((f) => [f, new Color(k[f])])) }));
const mix = { ...Object.fromEntries(COLOR_FIELDS.map((f) => [f, new Color()])) }; // reused every frame

// Blend the two keyframes either side of `hour`, by how far between them it is.
function sample(hour) {
  let i = 0;
  while (KEYS[i + 1].hour <= hour) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = (hour - a.hour) / (b.hour - a.hour);
  for (const f of COLOR_FIELDS) mix[f].lerpColors(a[f], b[f], t);
  for (const f of NUMBER_FIELDS) mix[f] = a[f] + (b[f] - a[f]) * t;
  return mix;
}

// Sun direction for an hour: rises in the east (+x) at 6, highest at 12, sets in the west
// (-x) at 18; its height follows a sine curve, below the horizon at night. The path leans
// toward +Z (behind the spawn) so the plants, which face the spawn, are lit from the front.
function sunDirection(hour, out) {
  const angle = ((hour - 6) / 12) * Math.PI;
  return out.set(Math.cos(angle), Math.sin(angle), 0.45).normalize();
}

// A soft round glow drawn once on a small canvas: bright centre fading to clear.
function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 220, 160, 0.9)');
  g.addColorStop(1, 'rgba(255, 180, 110, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

// Sky, sun, moon, fog and stars, all driven by the game hour from useSkyTime.
export default function SkyLighting({ getHour }) {
  const { scene, camera } = useThree();
  const sky = useRef();
  const light = useRef();
  const hemi = useRef();
  const glow = useRef();
  const stars = useRef();
  const sun = useMemo(() => new Vector3(), []);
  const moon = useMemo(() => new Vector3(), []);
  const glowTexture = useMemo(makeGlowTexture, []);

  // 100 stars on a dome inside the sky box, placed once from a fixed seed.
  const starMatrices = useMemo(() => {
    const random = seededRandom(7);
    const dummy = new Object3D();
    return Array.from({ length: STAR_COUNT }, () => {
      const yaw = random() * Math.PI * 2;
      const elevation = 0.25 + random() * 1.3; // radians above the horizon
      dummy.position.set(Math.cos(yaw) * Math.cos(elevation), Math.sin(elevation), Math.sin(yaw) * Math.cos(elevation)).multiplyScalar(45);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, []);

  // Copy the star positions into the instanced mesh once it exists.
  useLayoutEffect(() => {
    starMatrices.forEach((matrix, i) => stars.current.setMatrixAt(i, matrix));
    stars.current.instanceMatrix.needsUpdate = true; // tell three.js to upload the new positions
  }, [starMatrices]);

  useFrame(() => {
    const hour = getHour();
    const k = sample(hour);
    sunDirection(hour, sun);
    sky.current.material.uniforms.sunPosition.value.copy(sun); // the visible sun disc

    // Above the horizon the light IS the sun; below it, the moon opposite the sun takes over.
    const lightDir = sun.y >= 0 ? sun : moon.set(-sun.x, -sun.y, sun.z);
    light.current.position.copy(lightDir).multiplyScalar(LIGHT_DISTANCE);
    light.current.color.copy(k.sun);
    light.current.intensity = k.sunIntensity;

    hemi.current.color.copy(k.hemiSky);
    hemi.current.groundColor.copy(k.hemiGround);
    hemi.current.intensity = k.hemi;
    scene.fog.color.copy(k.fog);

    // The glow sits 35 m from the viewer toward the sun, so it stays on the sun as you walk.
    glow.current.position.copy(camera.position).addScaledVector(sun, 35);
    glow.current.material.opacity = sun.y > -0.05 ? k.glow : 0;
    stars.current.material.opacity = k.stars;
  });

  return (
    <>
      {/* Box of +/-50 m: inside the camera's 120 m far limit, so it is never clipped. */}
      <Sky ref={sky} distance={100} turbidity={6} rayleigh={1.5} mieCoefficient={0.005} mieDirectionalG={0.85} />
      {/* Linear fog from 14 m to 40 m; its colour follows the horizon through the day. */}
      <fog attach="fog" args={['#cfe3e8', 14, 40]} />
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={light}
        castShadow
        shadow-mapSize={[1024, 1024]} // modest: enough for 8 plants, cheap on laptops
        // A fixed box around the garden; it turns with the light, so shadows stay sharp all day.
        shadow-camera-left={-SHADOW_BOX}
        shadow-camera-right={SHADOW_BOX}
        shadow-camera-top={SHADOW_BOX}
        shadow-camera-bottom={-SHADOW_BOX}
        shadow-camera-near={1}
        shadow-camera-far={LIGHT_DISTANCE * 2}
        shadow-bias={-0.0005} // stops surfaces shadowing themselves in stripes ("acne")
        shadow-radius={4} // blur the shadow edge a little: soft, not razor-sharp
      />
      <sprite ref={glow} scale={[16, 16, 1]}>
        {/* Additive = adds light, like a real glow. fog off: it's in the sky, not the haze. */}
        <spriteMaterial map={glowTexture} blending={AdditiveBlending} transparent depthWrite={false} fog={false} />
      </sprite>
      {/* All 100 stars in ONE draw call: one mesh drawn 100 times at different positions. */}
      <instancedMesh ref={stars} args={[undefined, undefined, STAR_COUNT]}>
        <icosahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial color="#ffffff" transparent depthWrite={false} fog={false} />
      </instancedMesh>
    </>
  );
}
