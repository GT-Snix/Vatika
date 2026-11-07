import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Objects on this layer (the hands and the can) are drawn in a second pass.
export const RIG_LAYER = 1;

// Renders each frame in two passes so the hands never poke into plants:
//   1. the world (layer 0) as normal;
//   2. clear the depth buffer ("forget how far away everything was"), then draw the rig
//      (layer 1). With the depth forgotten, the hands always land on top of the world.
// (Alternative: shrink the rig and move it very close to the camera. It still clips into
// anything nearer than it, and the near plane then has to move closer, which costs depth
// precision everywhere.)
// A useFrame with priority 1 tells R3F we render ourselves, so it stops its automatic render.
export default function TwoPassRender({ debug }) {
  const { gl, scene, camera } = useThree();
  const sinceReadout = useRef(0);

  useEffect(() => {
    // Lights follow the same layer rules as meshes; without this the hands would be unlit.
    scene.traverse((o) => o.isLight && o.layers.enable(RIG_LAYER));
    gl.info.autoReset = false; // count draw calls for BOTH passes together (reset below)
  }, [gl, scene]);

  useFrame((_, delta) => {
    gl.info.reset();
    gl.autoClear = false;
    gl.clear();
    camera.layers.set(0);
    gl.render(scene, camera); // also renders the shadow map
    gl.clearDepth();
    camera.layers.set(RIG_LAYER);
    gl.shadowMap.autoUpdate = false; // shadows were made in pass 1; don't redo them
    gl.render(scene, camera);
    gl.shadowMap.autoUpdate = true;
    camera.layers.set(0); // other code (targeting, controls) sees the normal camera

    // ?debug: show the draw-call count twice a second. Written straight into the DOM
    // (not React state) so the readout itself doesn't cause re-renders.
    sinceReadout.current += delta;
    if (debug && sinceReadout.current > 0.5) {
      sinceReadout.current = 0;
      const el = document.getElementById('draw-calls');
      if (el) el.textContent = String(gl.info.render.calls);
    }
  }, 1);

  return null;
}
