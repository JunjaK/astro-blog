// Ring carousel layout: places all images on a circle and maps sections to angle ranges.

export type CarouselSlot = {
  /** Position on the ring */
  x: number;
  y: number;
  z: number;
  /** Rotation so the mesh faces the center */
  rotY: number;
  /** Which section this image belongs to */
  sectionIndex: number;
  /** Index within the section */
  localIndex: number;
};

export type SectionAngleRange = {
  /** Center angle of the first image in this section */
  startAngle: number;
  /** Center angle of the last image in this section */
  endAngle: number;
  /** Midpoint angle — used for "snap" detection */
  midAngle: number;
};

const RING_RADIUS = 8;

/**
 * Place all images evenly around a horizontal ring of radius R.
 * Each mesh faces the center (rotY = atan2(x, z) + PI).
 */
export function buildCarouselSlots(sectionImageCounts: number[]): CarouselSlot[] {
  const totalImages = sectionImageCounts.reduce((a, b) => a + b, 0);
  if (totalImages === 0) return [];

  const angleStep = (Math.PI * 2) / totalImages;
  const slots: CarouselSlot[] = [];

  let globalIndex = 0;
  for (let si = 0; si < sectionImageCounts.length; si++) {
    for (let li = 0; li < sectionImageCounts[si]; li++) {
      const angle = globalIndex * angleStep;
      const x = Math.sin(angle) * RING_RADIUS;
      const z = Math.cos(angle) * RING_RADIUS;

      slots.push({
        x,
        y: 0,
        z,
        rotY: Math.atan2(x, z),
        sectionIndex: si,
        localIndex: li,
      });

      globalIndex++;
    }
  }

  return slots;
}

/**
 * For each section, compute the angle range covered by its images.
 * Used to detect which section is "in front" during scroll.
 */
export function buildSectionAngleRanges(
  sectionImageCounts: number[],
  totalImages: number,
): SectionAngleRange[] {
  if (totalImages === 0) return [];

  const angleStep = (Math.PI * 2) / totalImages;
  const ranges: SectionAngleRange[] = [];

  let globalIndex = 0;
  for (const count of sectionImageCounts) {
    if (count === 0) {
      // Zero-image section: point at current cursor position
      const angle = globalIndex * angleStep;
      ranges.push({ startAngle: angle, endAngle: angle, midAngle: angle });
      continue;
    }
    const startAngle = globalIndex * angleStep;
    const endAngle = (globalIndex + count - 1) * angleStep;
    const midAngle = (startAngle + endAngle) / 2;

    ranges.push({ startAngle, endAngle, midAngle });
    globalIndex += count;
  }

  return ranges;
}

/**
 * Total scroll rotation: rotate enough to bring the last image to the front.
 * We go from angle=0 (first image front) to angle of last image.
 */
export function getTotalRotation(totalImages: number): number {
  if (totalImages <= 1) return 0;
  return ((totalImages - 1) / totalImages) * Math.PI * 2;
}

/**
 * Given the current front-facing angle, determine which section is active.
 * Front-facing angle = the ring angle currently closest to camera (angle 0 of ring).
 */
export function getActiveSectionIndex(
  currentAngle: number,
  ranges: SectionAngleRange[],
): number {
  // Normalize to [0, 2PI)
  const TWO_PI = Math.PI * 2;
  const norm = ((currentAngle % TWO_PI) + TWO_PI) % TWO_PI;

  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < ranges.length; i++) {
    const { midAngle } = ranges[i];
    // Angular distance (shortest arc)
    let dist = Math.abs(norm - midAngle);
    if (dist > Math.PI) dist = TWO_PI - dist;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  return bestIndex;
}
