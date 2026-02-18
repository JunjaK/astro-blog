// Single image plane in the unified 3D scene.
// Renders texture on a shared geometry; animation driven by parent SceneController.

import { invalidate } from '@react-three/fiber';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import type { UnifiedSlot } from './buildUnifiedLayout';
import { loadTexture, textureCache } from './texturePreload';

const sharedPlaneGeo = new THREE.PlaneGeometry(1, 1);

// --- Mesh registry type (shared with parent SceneController) ---
export type MeshRegistryEntry = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial };
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
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1.5);

  const resolvedSrc = getBasePathWithUrl(textureSrc);

  // Texture loading — reuses preloaded cache and deduplicates in-flight requests
  useEffect(() => {
    let cancelled = false;

    const cached = textureCache.get(resolvedSrc);
    if (cached) {
      setTexture(cached);
      if (cached.image) setAspect(cached.image.width / cached.image.height);
      onLoad();
      return;
    }

    loadTexture(resolvedSrc)
      .then((tex) => {
        if (cancelled) return;
        if (tex.image) setAspect(tex.image.width / tex.image.height);
        setTexture(tex);
        invalidate();
        onLoad();
      })
      .catch(() => {
        if (!cancelled) onLoad();
      });

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
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});
