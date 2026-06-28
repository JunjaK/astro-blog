// Rounded-corner alpha map DataTexture for carousel image planes.
// Uses SDF rounded rectangle — shared singleton created once.
// Three.js alphaMap reads the GREEN channel: `diffuseColor.a *= texture2D(alphaMap, vUv).g`
// so we generate RGBA data with the SDF value written to all channels.

import * as THREE from 'three';

const TEXTURE_SIZE = 128;
const CORNER_RADIUS = 0.08; // relative to texture size (0–0.5)

function generateAlphaMapData(size: number, radius: number): Uint8Array {
  const data = new Uint8Array(size * size * 4); // RGBA
  const r = radius * size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const halfW = size / 2;
      const halfH = size / 2;

      const dx = Math.max(Math.abs(x - halfW) - (halfW - r), 0);
      const dy = Math.max(Math.abs(y - halfH) - (halfH - r), 0);
      const dist = Math.sqrt(dx * dx + dy * dy) - r;

      const alpha = 1 - THREE.MathUtils.smoothstep(dist, -1, 1);
      const v = Math.round(alpha * 255);

      const i = (y * size + x) * 4;
      data[i] = v;     // R
      data[i + 1] = v; // G — this is what Three.js alphaMap reads
      data[i + 2] = v; // B
      data[i + 3] = 255; // A
    }
  }

  return data;
}

let cachedTexture: THREE.DataTexture | null = null;

/** Get the shared rounded-corner alpha map DataTexture (singleton). */
export function getCarouselAlphaMap(): THREE.DataTexture {
  if (cachedTexture) return cachedTexture;

  const data = generateAlphaMapData(TEXTURE_SIZE, CORNER_RADIUS);
  const texture = new THREE.DataTexture(data, TEXTURE_SIZE, TEXTURE_SIZE, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  cachedTexture = texture;
  return texture;
}
