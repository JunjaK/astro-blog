// Single image plane in the unified 3D scene.
// Renders texture on a shared geometry; animation driven by parent SceneController.

import { invalidate } from '@react-three/fiber';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import type { UnifiedSlot } from './buildUnifiedLayout';

// --- Shared across all instances ---
const textureCache = new Map<string, THREE.Texture>();
const sharedLoader = new THREE.TextureLoader();
// Images are same-origin (/files/...) — override Three.js default 'anonymous'
// to avoid CORS check (nginx doesn't send CORS headers).
sharedLoader.crossOrigin = '';

const sharedPlaneGeo = new THREE.PlaneGeometry(1, 1);

function createEdgeFadeAlphaMap(size = 128, feather = 0.06): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const dEdge = Math.min(u, 1 - u, v, 1 - v);
      const alpha = Math.round(THREE.MathUtils.smoothstep(dEdge, 0, feather) * 255);
      const i = (y * size + x) * 4;
      data[i] = alpha;
      data[i + 1] = alpha;
      data[i + 2] = alpha;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
const edgeFadeMap = createEdgeFadeAlphaMap();

// --- Mesh registry type (shared with parent SceneController) ---
export type MeshRegistryEntry = { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial };
export type MeshRegistry = Map<number, MeshRegistryEntry>;

// --- Component ---
type UnifiedImagePlaneProps = {
  textureSrc: string;
  slot: UnifiedSlot;
  globalIndex: number;
  meshRegistry: React.RefObject<MeshRegistry>;
  onImageClick: (index: number) => void;
  onLoad: () => void;
};

export const UnifiedImagePlane = memo(function UnifiedImagePlane({
  textureSrc,
  slot,
  globalIndex,
  meshRegistry,
  onImageClick,
  onLoad,
}: UnifiedImagePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1.5);

  const resolvedSrc = getBasePathWithUrl(textureSrc);

  // Texture loading
  useEffect(() => {
    let cancelled = false;

    const cached = textureCache.get(resolvedSrc);
    if (cached) {
      setTexture(cached);
      if (cached.image) setAspect(cached.image.width / cached.image.height);
      onLoad();
      return;
    }

    sharedLoader.load(
      resolvedSrc,
      (tex) => {
        if (cancelled) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(resolvedSrc, tex);
        setTexture(tex);
        if (tex.image) setAspect(tex.image.width / tex.image.height);
        invalidate();
        onLoad();
      },
      undefined,
      () => {
        if (!cancelled) onLoad();
      },
    );

    return () => { cancelled = true; };
  }, [resolvedSrc, onLoad]);

  // Register mesh + material with parent's SceneController
  useEffect(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (mesh && mat) {
      meshRegistry.current.set(globalIndex, { mesh, mat });
    }
    return () => { meshRegistry.current.delete(globalIndex); };
  }, [texture, globalIndex, meshRegistry]);

  const planeWidth = 3.2 * slot.scale;
  const planeHeight = planeWidth / aspect;

  const handleClick = useCallback((e: THREE.Event) => {
    (e as unknown as Event & { stopPropagation: () => void }).stopPropagation();
    onImageClick(globalIndex);
  }, [onImageClick, globalIndex]);

  if (!texture) return null;

  return (
    <mesh
      ref={meshRef}
      position={[slot.x, slot.baseY, slot.z]}
      rotation={[0, slot.rotY, 0]}
      scale={[planeWidth, planeHeight, 1]}
      geometry={sharedPlaneGeo}
      onClick={handleClick}
    >
      <meshStandardMaterial
        ref={matRef}
        map={texture}
        alphaMap={edgeFadeMap}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
        roughness={0.3}
        metalness={0.05}
      />
    </mesh>
  );
});
