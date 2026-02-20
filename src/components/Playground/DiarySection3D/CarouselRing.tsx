// 3D ring carousel scene: SceneController (single useFrame) + ring group + image planes.
// Scroll-driven: currentRotationRef is set externally (by scroll handler).
// SceneController only reads it and updates group rotation + per-mesh opacity.

import { invalidate, useFrame, type ThreeEvent } from '@react-three/fiber';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import type { CarouselSlot } from './buildCarouselLayout';
import { isMobileDevice, loadTexture, textureCache } from './texturePreload';

/** On mobile, use pre-generated 384w thumbnail to avoid OOM from decoding full-res images. */
function resolveTextureSrc(src: string): string {
  const resolved = getBasePathWithUrl(src);
  if (isMobileDevice) {
    return resolved.replace(/\.webp$/, '-384w.webp');
  }
  return resolved;
}


// --- Shared resources ---
const sharedPlaneGeo = new THREE.PlaneGeometry(1, 1);

// Fixed 4:3 aspect ratio
const PLANE_WIDTH = 2.0;
const PLANE_HEIGHT = 1.5; // 2.0 / (4/3) = 1.5

// --- Mesh registry ---
export type CarouselMeshEntry = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial };
export type CarouselMeshRegistry = Map<number, CarouselMeshEntry>;

// --- Scene controller: reads currentRotationRef, sets group.rotation.y and per-mesh opacity ---
export function CarouselSceneController({
  currentRotationRef,
  meshRegistryRef,
  totalImages,
  children,
}: {
  currentRotationRef: React.RefObject<{ value: number }>;
  meshRegistryRef: React.RefObject<CarouselMeshRegistry>;
  totalImages: number;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!currentRotationRef.current || !groupRef.current || !meshRegistryRef.current) return;

    const rotation = currentRotationRef.current.value;
    groupRef.current.rotation.y = -rotation;

    // Update per-mesh opacity based on angular distance from front
    const TWO_PI = Math.PI * 2;
    const angleStep = totalImages > 0 ? TWO_PI / totalImages : 0;

    for (const [index, { mesh, mat }] of meshRegistryRef.current) {
      const meshAngle = index * angleStep;
      const effectiveAngle = ((meshAngle - rotation) % TWO_PI + TWO_PI) % TWO_PI;
      let angDist = effectiveAngle;
      if (angDist > Math.PI) angDist = TWO_PI - angDist;

      const t = angDist / Math.PI;
      const opacity = THREE.MathUtils.smoothstep(1 - t, 0.2, 0.8);

      mat.opacity = opacity;
      mesh.visible = opacity > 0.01;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// --- Single image plane on the ring ---
type CarouselImagePlaneProps = {
  textureSrc: string;
  slot: CarouselSlot;
  globalIndex: number;
  meshRegistry: React.RefObject<CarouselMeshRegistry>;
  onLoad: () => void;
  onImageClick: (globalIndex: number) => void;
  alphaMap: THREE.DataTexture;
};

export const CarouselImagePlane = memo(function CarouselImagePlane({
  textureSrc,
  slot,
  globalIndex,
  meshRegistry,
  onLoad,
  onImageClick,
  alphaMap,
}: CarouselImagePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  const resolvedSrc = resolveTextureSrc(textureSrc);

  useEffect(() => {
    let cancelled = false;

    const cached = textureCache.get(resolvedSrc);
    if (cached) {
      setTexture(cached);
      onLoad();
      return;
    }

    loadTexture(resolvedSrc)
      .then((tex) => {
        if (cancelled) return;
        setTexture(tex);
        invalidate();
        onLoad();
      })
      .catch(() => {
        if (!cancelled) onLoad();
      });

    return () => { cancelled = true; };
  }, [resolvedSrc, onLoad]);

  useEffect(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (mesh && mat) {
      meshRegistry.current.set(globalIndex, { mesh, mat });
    }
    return () => { meshRegistry.current.delete(globalIndex); };
  }, [texture, globalIndex, meshRegistry]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onImageClick(globalIndex);
  }, [globalIndex, onImageClick]);

  if (!texture) return null;

  return (
    <mesh
      ref={meshRef}
      position={[slot.x, slot.y, slot.z]}
      rotation={[0, slot.rotY, 0]}
      scale={[PLANE_WIDTH, PLANE_HEIGHT, 1]}
      geometry={sharedPlaneGeo}
      onClick={handleClick}
    >
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        alphaMap={alphaMap}
        transparent
        opacity={1}
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  );
});
