// Text panel + section dots for the ring carousel.
// Not an overlay — it's a flex section at the bottom with overflow-y-auto.
// Dots are clickable to navigate sections.

import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';

type CarouselTextOverlayProps = {
  children: React.ReactNode;
  currentSection: number;
  totalSections: number;
  onSectionChange: (index: number) => void;
};

function parseByH2(container: HTMLElement): string[] {
  let root: HTMLElement = container;
  const firstChild = container.children[0];
  if (firstChild?.tagName === 'ASTRO-SLOT') {
    root = firstChild as HTMLElement;
  }

  const sections: string[] = [];
  let current: Element[] = [];

  for (const child of Array.from(root.children)) {
    if (child.tagName === 'H2' && current.length > 0) {
      sections.push(current.map((el) => el.outerHTML).join(''));
      current = [child];
    } else {
      current.push(child);
    }
  }
  if (current.length > 0) {
    sections.push(current.map((el) => el.outerHTML).join(''));
  }

  return sections;
}

export const CarouselTextOverlay = memo(function CarouselTextOverlay({
  children,
  currentSection,
  totalSections,
  onSectionChange,
}: CarouselTextOverlayProps) {
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [sectionHtmls, setSectionHtmls] = useState<string[]>([]);

  useEffect(() => {
    if (!hiddenRef.current) return;
    setSectionHtmls(parseByH2(hiddenRef.current));
  }, []);

  const safeIndex = Math.max(0, Math.min(currentSection, sectionHtmls.length - 1));

  return (
    <>
      {/* Hidden container for parsing children */}
      <div ref={hiddenRef} className="hidden">
        {children}
      </div>

      {/* Text content — scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-2 md:px-8">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {sectionHtmls.length > 0 && (
              <motion.div
                key={safeIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="prose prose-sm prose-invert max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_h2]:!mt-0 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5"
                dangerouslySetInnerHTML={{ __html: sectionHtmls[safeIndex] }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Section indicator dots — clickable, pinned to bottom */}
      <div className="flex shrink-0 justify-center gap-2 py-3">
        {Array.from({ length: totalSections }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSectionChange(i)}
            className={`rounded-full transition-all duration-300 ${
              i === currentSection
                ? 'h-2 w-8 bg-white'
                : 'h-2 w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </>
  );
});
