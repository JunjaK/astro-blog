import type { DiaryImage, DiarySectionProps } from './types';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useScroll } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PhotoSlider } from 'react-photo-view';
import { DiaryImageOverlay } from './DiaryImageOverlay';
import * as THREE from 'three';

// --- Slot layout for 3D image planes ---
type PlaneSlot = {
  x: number;
  z: number;
  baseY: number;
  speed: number;
  rotY: number;
  scale: number;
};

function buildSlots(count: number): PlaneSlot[] {
  const slots: PlaneSlot[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const depth = 0.3 + (i % 3) * 0.35;
    slots.push({
      x: side * (1.8 + (i % 3) * 0.6),
      z: -depth * 4,
      baseY: 2 - i * 1.4,
      speed: 0.6 + depth * 0.8,
      rotY: side * (0.15 + depth * 0.1),
      scale: 1.1 - depth * 0.25,
    });
  }
  return slots;
}

// --- Single image plane in the 3D scene ---
type ImagePlaneProps = {
  image: DiaryImage;
  slot: PlaneSlot;
  scrollProgressRef: React.RefObject<{ value: number }>;
  totalTravel: number;
  onClick: () => void;
};

function ImagePlane({ image, slot, scrollProgressRef, totalTravel, onClick }: ImagePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1.5);

  const resolvedSrc = getBasePathWithUrl(image.src);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(resolvedSrc, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
      if (tex.image) {
        setAspect(tex.image.width / tex.image.height);
      }
    });
  }, [resolvedSrc]);

  const planeWidth = 2.2 * slot.scale;
  const planeHeight = planeWidth / aspect;

  useFrame(() => {
    if (!meshRef.current || !scrollProgressRef.current)
      return;
    const progress = scrollProgressRef.current.value;

    // Move upward based on scroll
    const yOffset = progress * totalTravel * slot.speed;
    meshRef.current.position.y = slot.baseY + yOffset;

    // Gentle tilt changes with scroll
    meshRef.current.rotation.x = Math.sin(progress * Math.PI) * 0.08;
    meshRef.current.rotation.y = slot.rotY + Math.sin(progress * Math.PI * 2) * 0.05;

    // Fade via material opacity
    const yPos = meshRef.current.position.y;
    const fadeIn = THREE.MathUtils.smoothstep(yPos, -6, -3);
    const fadeOut = THREE.MathUtils.smoothstep(yPos, 4, 7);
    const opacity = fadeIn * (1 - fadeOut);
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = opacity;
  });

  if (!texture)
    return null;

  return (
    <mesh
      ref={meshRef}
      position={[slot.x, slot.baseY, slot.z]}
      rotation={[0, slot.rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
        roughness={0.3}
        metalness={0.05}
      />
    </mesh>
  );
}

// --- Camera controller driven by scroll ---
type CameraControllerProps = {
  scrollProgressRef: React.RefObject<{ value: number }>;
};

function CameraController({ scrollProgressRef }: CameraControllerProps) {
  const { camera } = useThree();

  useFrame(() => {
    if (!scrollProgressRef.current)
      return;
    const progress = scrollProgressRef.current.value;

    // Subtle camera dolly and pan
    camera.position.z = 5 - progress * 0.8;
    camera.position.y = progress * 2 - 1;
    camera.lookAt(0, camera.position.y * 0.5, 0);
  });

  return null;
}

// --- Main WebGL Section ---
export function DiarySectionWebGL({ images, children }: DiarySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef({ value: 0 });

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const scrollHeight = Math.max(300, images.length * 90 + 120);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Sync framer-motion MotionValue → mutable ref for Three.js useFrame
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (v) => {
      scrollProgressRef.current.value = v;
    });
    return unsubscribe;
  }, [scrollYProgress]);

  const slots = useMemo(() => buildSlots(images.length), [images.length]);
  const totalTravel = 8 + images.length * 1.2;

  const toolbarRender = DiaryImageOverlay({ images });
  const lightboxImages = images.map((img) => ({
    src: getBasePathWithUrl(img.src),
    key: img.src,
  }));

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  };

  if (images.length === 0)
    return null;

  return (
    <>
      <section
        ref={containerRef}
        className="relative"
        style={{ height: `${scrollHeight}vh` }}
      >
        <div className="sticky top-0 h-screen">
          {/* Three.js Canvas */}
          <Canvas
            className="!absolute inset-0"
            camera={{ position: [0, 0, 5], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true }}
          >
            <color attach="background" args={['#0a0a0a']} />
            <fog attach="fog" args={['#0a0a0a', 6, 14]} />

            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 5, 4]} intensity={0.8} />
            <directionalLight position={[-2, 3, -3]} intensity={0.3} color="#8899ff" />

            <CameraController scrollProgressRef={scrollProgressRef} />

            {images.map((image, index) => (
              <ImagePlane
                key={`${image.src}-${index}`}
                image={image}
                slot={slots[index]}
                scrollProgressRef={scrollProgressRef}
                totalTravel={totalTravel}
                onClick={() => handleImageClick(index)}
              />
            ))}
          </Canvas>

          {/* Centered text card over the canvas */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="pointer-events-auto mx-4 max-w-2xl md:mx-8">
              <div className="rounded-2xl border border-white/15 bg-black/80 px-6 py-8 shadow-2xl backdrop-blur-xl md:px-10 md:py-10">
                <div className="prose prose-lg prose-invert prose-headings:mt-0 prose-headings:mb-3 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox (controlled) */}
      <PhotoSlider
        images={lightboxImages}
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        toolbarRender={toolbarRender}
      />
    </>
  );
}
