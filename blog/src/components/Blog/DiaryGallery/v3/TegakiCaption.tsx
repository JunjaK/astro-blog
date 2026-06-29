'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import caveatBundle from 'tegaki/fonts/caveat';
import { TegakiRenderer, type TegakiRendererHandle } from 'tegaki/react';

// ponytail: inject the bundle's @font-face once per document; the stroke
// animation comes from glyph data, this only sharpens the faint overlay text.
let fontInjected = false;
function ensureFontFace() {
  if (fontInjected || typeof document === 'undefined')
    return;
  fontInjected = true;
  const style = document.createElement('style');
  style.textContent = caveatBundle.fontFaceCSS;
  document.head.appendChild(style);
}

type TegakiCaptionProps = {
  text: string;
  /** Seconds before the handwriting starts. */
  delay?: number;
  /** Change this to replay the animation from the start. */
  replayKey?: number | string;
  /** Continuously re-write the handwriting (uncontrolled loops only when set). */
  loop?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function TegakiCaption({ text, delay = 0, replayKey, loop = false, className, style }: TegakiCaptionProps) {
  const handleRef = useRef<TegakiRendererHandle>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    ensureFontFace();
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return; // first mount already auto-plays (uncontrolled)
    }
    handleRef.current?.engine?.restart();
  }, [replayKey, text]);

  return (
    <TegakiRenderer
      ref={handleRef}
      font={caveatBundle}
      text={text}
      time={{ mode: 'uncontrolled', delay, ...(loop ? { loop: true, loopGap: 2.5 } : {}) }}
      quality={{ clipText: 1.35, pixelRatio: 1.05 }}
      showOverlay
      className={className}
      style={style}
    />
  );
}
