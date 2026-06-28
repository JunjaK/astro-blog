// Slot layout algorithm for unified multi-section 3D gallery.
// Places all images from all sections in a single 3D scene,
// with vertical gaps between sections.

export type UnifiedSlot = {
  x: number;
  z: number;
  baseY: number;
  speed: number;
  rotY: number;
  scale: number;
  sectionIndex: number;
  localIndex: number;
};

// 5-slot cycling pattern (same as DiarySectionWebGL)
const PATTERNS = [
  { x: -0.8, z: -0.6, scale: 1.1, rotY: -0.3 },
  { x: 2.0, z: -1.4, scale: 1.0, rotY: 0.35 },
  { x: 0.3, z: -0.8, scale: 1.1, rotY: -0.25 },
  { x: -2.2, z: -1.8, scale: 0.95, rotY: -0.4 },
  { x: 1.2, z: -1.0, scale: 1.05, rotY: 0.28 },
];

const PHI = 1.618033988749895;
const IMAGE_SPACING = 2.0;
const SECTION_GAP = 4.0;

export function buildUnifiedSlots(sectionImageCounts: number[]): UnifiedSlot[] {
  const slots: UnifiedSlot[] = [];
  let yOffset = 0;

  for (let si = 0; si < sectionImageCounts.length; si++) {
    const count = sectionImageCounts[si];
    const sizeBoost = count <= 4 ? 1.4 : 1;

    for (let i = 0; i < count; i++) {
      const pat = PATTERNS[i % PATTERNS.length];
      const cycle = Math.floor(i / PATTERNS.length);
      const drift = ((i * PHI) % 1 - 0.5) * 0.4;
      const depth = Math.abs(pat.z) / 4;

      slots.push({
        x: pat.x + drift,
        z: pat.z - cycle * 0.3,
        baseY: -(yOffset + i * IMAGE_SPACING),
        speed: 0.6 + depth * 0.8,
        rotY: pat.rotY + drift * 0.1,
        scale: pat.scale * sizeBoost,
        sectionIndex: si,
        localIndex: i,
      });
    }

    yOffset += count * IMAGE_SPACING + SECTION_GAP;
  }

  return slots;
}

// Total vertical travel distance in Three.js units
export function getTotalTravel(sectionImageCounts: number[]): number {
  const totalImages = sectionImageCounts.reduce((a, b) => a + b, 0);
  const gaps = (sectionImageCounts.length - 1) * SECTION_GAP;
  return totalImages * IMAGE_SPACING + gaps;
}
