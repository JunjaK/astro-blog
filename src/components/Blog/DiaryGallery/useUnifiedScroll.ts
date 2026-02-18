// Hook that maps global scroll progress (0–1) to current section index
// and per-section progress. Section scroll budget is proportional to image count.

import { useMemo } from 'react';

type SectionRange = { start: number; end: number };

export type UnifiedScrollState = {
  sectionIndex: number;
  sectionProgress: number;
};

const TRANSITION_WEIGHT = 1;

export function useUnifiedSectionRanges(sectionImageCounts: number[]): SectionRange[] {
  return useMemo(() => {
    const weights = sectionImageCounts.map((c) => c);
    const gapCount = Math.max(0, sectionImageCounts.length - 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0) + gapCount * TRANSITION_WEIGHT;

    const ranges: SectionRange[] = [];
    let cursor = 0;

    for (let i = 0; i < weights.length; i++) {
      const sectionSpan = weights[i] / totalWeight;
      const gapSpan = i < weights.length - 1 ? TRANSITION_WEIGHT / totalWeight : 0;

      ranges.push({ start: cursor, end: cursor + sectionSpan });
      cursor += sectionSpan + gapSpan;
    }

    return ranges;
  }, [sectionImageCounts]);
}

export function getScrollState(progress: number, ranges: SectionRange[]): UnifiedScrollState {
  // Find which section the current progress falls into
  for (let i = ranges.length - 1; i >= 0; i--) {
    if (progress >= ranges[i].start) {
      const sectionProgress = Math.min(
        1,
        (progress - ranges[i].start) / (ranges[i].end - ranges[i].start),
      );
      return { sectionIndex: i, sectionProgress };
    }
  }

  return { sectionIndex: 0, sectionProgress: 0 };
}
