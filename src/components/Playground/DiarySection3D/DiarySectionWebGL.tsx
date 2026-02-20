import type { DiaryImage, DiarySectionProps } from './types';
import { Icon } from '@iconify/react';
import { Canvas, invalidate, useFrame, useThree } from '@react-three/fiber';
import { useScroll } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { getBasePathWithUrl } from '@/utils/getBasePathWithUrl';
import { DiaryImageOverlay } from './DiaryImageOverlay';
import { DiaryThumbnailStrip } from './DiaryThumbnailStrip';

// --- Texture cache (persists across mounts, avoids re-download & GPU leak) ---
const textureCache = new Map<string, THREE.Texture>();
const sharedLoader = new THREE.TextureLoader();
// NOTE: Do NOT set crossOrigin='anonymous' — images are same-origin (/files/...)
// and nginx doesn't send CORS headers.

// --- Soft-edge alpha map (feathers plane borders so images blend into the scene) ---
function createEdgeFadeAlphaMap(size = 128, feather = 0.06): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const dEdge = Math.min(u, 1 - u, v, 1 - v);
      const alpha = Math.round(THREE.MathUtils.smoothstep(dEdge, 0, feather) * 255);
      const i = (y * size + x) * 4;
      data[i] = alpha;     // R
      data[i + 1] = alpha; // G — alphaMap samples this channel
      data[i + 2] = alpha; // B
      data[i + 3] = 255;   // A
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
const edgeFadeMap = createEdgeFadeAlphaMap();

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
  // 5-slot cycling pattern: center-crossing organic layout
  const patterns: { x: number; z: number; scale: number; rotY: number }[] = [
    { x: -0.8, z: -0.6, scale: 1.1, rotY: -0.3 }, // Center-left, near
    { x: 2.0, z: -1.4, scale: 1.0, rotY: 0.35 }, // Right, mid
    { x: 0.3, z: -0.8, scale: 1.1, rotY: -0.25 }, // Center, near
    { x: -2.2, z: -1.8, scale: 0.95, rotY: -0.4 }, // Left, mid
    { x: 1.2, z: -1.0, scale: 1.05, rotY: 0.28 }, // Center-right, mid-near
  ];

  const PHI = 1.618033988749895;
  const sizeBoost = count <= 4 ? 1.4 : 1;
  const slots: PlaneSlot[] = [];
  for (let i = 0; i < count; i++) {
    const pat = patterns[i % patterns.length];
    // Golden-ratio offset to break grid repetition across cycles
    const cycle = Math.floor(i / patterns.length);
    const drift = ((i * PHI) % 1 - 0.5) * 0.4;
    const depth = Math.abs(pat.z) / 4;
    slots.push({
      x: pat.x + drift,
      z: pat.z - cycle * 0.3,
      baseY: -0.5 - i * 2.0,
      speed: 0.6 + depth * 0.8,
      rotY: pat.rotY + drift * 0.1,
      scale: pat.scale * sizeBoost,
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
  index: number;
  onImageClick: (index: number) => void;
  onLoad: () => void;
};

function ImagePlane({ image, slot, scrollProgressRef, totalTravel, index, onImageClick, onLoad }: ImagePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1.5);

  const resolvedSrc = getBasePathWithUrl(image.src);

  useEffect(() => {
    let cancelled = false;

    const cached = textureCache.get(resolvedSrc);
    if (cached) {
      setTexture(cached);
      if (cached.image) {
        setAspect(cached.image.width / cached.image.height);
      }
      onLoad();
      return;
    }

    sharedLoader.load(
      resolvedSrc,
      (tex) => {
        if (cancelled)
          return;
        tex.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(resolvedSrc, tex);
        setTexture(tex);
        if (tex.image) {
          setAspect(tex.image.width / tex.image.height);
        }
        onLoad();
      },
      undefined,
      () => {
        if (!cancelled)
          onLoad();
      },
    );

    return () => {
      cancelled = true;
    };
  }, [resolvedSrc, onLoad]);

  const planeWidth = 3.2 * slot.scale;
  const planeHeight = planeWidth / aspect;

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat || !scrollProgressRef.current)
      return;

    const progress = scrollProgressRef.current.value;

    // Move upward based on scroll
    mesh.position.y = slot.baseY + progress * totalTravel * slot.speed;

    // Tilt changes with scroll
    mesh.rotation.x = Math.sin(progress * Math.PI) * 0.12;
    mesh.rotation.y = slot.rotY + Math.sin(progress * Math.PI * 2) * 0.08;

    // Fade via material opacity
    const yPos = mesh.position.y;
    const fadeIn = THREE.MathUtils.smoothstep(yPos, -6, -2);
    const fadeOut = THREE.MathUtils.smoothstep(yPos, 5, 8);
    mat.opacity = fadeIn * (1 - fadeOut);
  });

  const handleClick = useCallback((e: THREE.Event) => {
    (e as unknown as Event & { stopPropagation: () => void }).stopPropagation();
    onImageClick(index);
  }, [onImageClick, index]);

  if (!texture)
    return null;

  return (
    <mesh
      ref={meshRef}
      position={[slot.x, slot.baseY, slot.z]}
      rotation={[0, slot.rotY, 0]}
      onClick={handleClick}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
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

    // Camera dolly and vertical travel — cinematic depth
    camera.position.z = 5.5 - progress * 1.0;
    camera.position.y = progress * 3 - 2.5;
    camera.lookAt(0, camera.position.y * 0.5 - 0.5, 0);
  });

  return null;
}

// --- Detect mobile for adaptive quality ---
const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

// --- Main WebGL Section ---
export function DiarySectionWebGL({ images, children }: DiarySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef({ value: 0 });

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [focused, setFocused] = useState(false);
  const allLoaded = loadedCount >= images.length;
  const handleImageLoad = useCallback(() => {
    setLoadedCount((c) => c + 1);
  }, []);

  const scrollHeight = images.length <= 4
    ? Math.max(200, images.length * 50 + 80)
    : images.length * 60 + 100;

  // Lock page scroll while images are loading
  useEffect(() => {
    if (allLoaded)
      return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [allLoaded]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end start'],
  });

  // Sync framer-motion MotionValue → mutable ref for Three.js useFrame
  // invalidate() triggers a single frame render (Canvas is frameloop="demand")
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (v) => {
      scrollProgressRef.current.value = v;
      invalidate();
    });
    return unsubscribe;
  }, [scrollYProgress]);

  const slots = useMemo(() => buildSlots(images.length), [images.length]);
  const totalTravel = 10 + images.length * 1.5;

  const toolbarRender = useMemo(() => DiaryImageOverlay({ images }), [images]);
  const lightboxImages = useMemo(
    () => images.map((img) => ({
      src: getBasePathWithUrl(img.src),
      key: img.src,
    })),
    [images],
  );

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  }, []);

  const handleLightboxClose = useCallback(() => setLightboxVisible(false), []);

  const glConfig = useMemo(() => ({
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance' as const,
  }), []);

  if (images.length === 0)
    return null;

  return (
    <>
      <section
        ref={containerRef}
        className="relative"
        style={{
          height: `${scrollHeight}vh`,
          overflow: allLoaded ? undefined : 'hidden',
        }}
      >
        <div className="sticky top-0 h-screen">
          {/* Loading overlay */}
          <div
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 transition-opacity duration-300 ${allLoaded ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          >
            <Icon icon="svg-spinners:bars-rotate-fade" className="text-4xl text-white" />
            <p className="mt-2 text-sm text-white/70">
              {loadedCount}
              {' '}
              /
              {' '}
              {images.length}
            </p>
          </div>

          {/* Three.js Canvas */}
          <Canvas
            className="!absolute inset-0"
            camera={{ position: [0, 0, 5.5], fov: 55 }}
            frameloop="demand"
            dpr={[1, isMobile ? 1 : 1.5]}
            gl={glConfig}
          >
            <color attach="background" args={['#0a0a0a']} />
            <fog attach="fog" args={['#0a0a0a', 8, 16]} />

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
                index={index}
                onImageClick={handleImageClick}
                onLoad={handleImageLoad}
              />
            ))}
          </Canvas>

          {/* Floating text overlay — bordered, scrollable */}
          <div className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 pt-16 pb-20 transition-opacity duration-300 md:px-8 ${allLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <div
              className={`pointer-events-auto relative mx-auto max-w-2xl overflow-y-auto rounded-xl border border-white/20 px-5 pt-0 pb-3 transition-colors duration-300 md:px-8 md:pt-0 md:pb-4 ${focused ? 'bg-black/80' : ''}`}
              style={{
                maxHeight: 'calc(100vh - 10rem - 60px)',
                textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)',
              }}
            >
              {/* Focus toggle button */}
              <button
                type="button"
                onClick={() => setFocused((v) => !v)}
                className={`sticky top-1 z-20 float-right mt-8 rounded-md p-1 transition-colors ${focused ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}
                title={focused ? 'Exit focus mode' : 'Focus on text'}
              >
                <Icon icon={focused ? 'material-symbols:visibility-off' : 'material-symbols:center-focus-strong'} className="text-lg" />
              </button>
              <div className="prose prose-base prose-invert [&>:first-child]:mt-0 [&>:last-child]:mb-0 prose-headings:mt-0 prose-headings:mb-2 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                {children}
              </div>
            </div>
          </div>

          {/* Image thumbnail strip — fixed above footer */}
          <DiaryThumbnailStrip images={images} visible={allLoaded} onSelect={handleImageClick} />
        </div>
      </section>

      {/* Lightbox (controlled) */}
      <ImageLightbox
        images={lightboxImages}
        visible={lightboxVisible}
        onClose={handleLightboxClose}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        toolbarRender={toolbarRender}
      />
    </>
  );
}
