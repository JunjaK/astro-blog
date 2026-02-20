// Text overlay that parses children by <h2> headings and crossfades between sections.
// Children arrive as static <astro-slot> HTML from MDX.

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';

type UnifiedTextOverlayProps = {
  children: React.ReactNode;
  currentSection: number;
  visible: boolean;
};

function parseByH2(container: HTMLElement): string[] {
  // Unwrap <astro-slot> wrapper if present
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

export const UnifiedTextOverlay = memo(function UnifiedTextOverlay({ children, currentSection, visible }: UnifiedTextOverlayProps) {
  const hiddenRef = useRef<HTMLDivElement>(null);
  const [sectionHtmls, setSectionHtmls] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  // Parse children into section blocks on mount
  useEffect(() => {
    if (!hiddenRef.current) return;
    const parsed = parseByH2(hiddenRef.current);
    setSectionHtmls(parsed);
  }, []);

  const safeIndex = Math.max(0, Math.min(currentSection, sectionHtmls.length - 1));

  return (
    <>
      {/* Hidden container for parsing children */}
      <div ref={hiddenRef} className="hidden">
        {children}
      </div>

      {/* Visible text panel */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 pt-16 pb-20 transition-opacity duration-300 md:px-8 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div
          className={`pointer-events-auto relative mx-auto max-w-2xl overflow-y-auto rounded-xl border border-white/20 px-5 pt-0 pb-3 transition-colors duration-300 md:px-8 md:pt-0 md:pb-4 ${focused ? 'bg-black/80' : ''}`}
          style={{
            maxHeight: 'calc(100vh - 10rem - 60px)',
            textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Focus toggle */}
          <button
            type="button"
            onClick={() => setFocused((v) => !v)}
            className={`sticky top-1 z-20 float-right mt-8 rounded-md p-1 transition-colors ${focused ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}
            title={focused ? 'Exit focus mode' : 'Focus on text'}
          >
            <Icon
              icon={focused ? 'material-symbols:visibility-off' : 'material-symbols:center-focus-strong'}
              className="text-lg"
            />
          </button>

          <AnimatePresence mode="wait">
            {sectionHtmls.length > 0 && (
              <motion.div
                key={safeIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="prose prose-base prose-invert [&>:first-child]:mt-0 [&>:last-child]:mb-0 prose-headings:mt-0 prose-headings:mb-2 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5"
                dangerouslySetInnerHTML={{ __html: sectionHtmls[safeIndex] }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
});
