'use client';

import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useRef } from 'react';

type TiltCardProps = {
  /** Max tilt in degrees on each axis. */
  max?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  onActivate?: () => void;
  children: ReactNode;
};

/** Pointer-following 3D tilt. Writes --tilt-x / --tilt-y CSS vars; styling lives in v3.css. */
export function TiltCard({ max = 9, className, style, ariaLabel, onActivate, children }: TiltCardProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const onMove = (event: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--tilt-y', `${px * max * 2}deg`);
    el.style.setProperty('--tilt-x', `${-py * max * 2}deg`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      className={className}
      style={style}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onClick={onActivate}
    >
      {children}
    </button>
  );
}
