'use client';

import type { PolaroidImage } from './types';
import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  $polaroidLightbox,
  closePolaroidLightbox,
  setPolaroidLightboxIndex,
} from '@/store/polaroid';
import './polaroid-flip.css';

function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

function PolaroidCard({ item }: { item: PolaroidImage }) {
  const [flipped, setFlipped] = useState(false);

  // always land on the photo side when the polaroid changes
  useEffect(() => {
    setFlipped(false);
  }, [item.src]);

  const description = item.description || item.caption || '';

  return (
    <motion.div
      key={item.src}
      className="pf-stage"
      initial={{ opacity: 0, y: 26, rotate: -1.4 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
    >
      <button
        type="button"
        className={`pf-flip${flipped ? ' is-flipped' : ''}`}
        aria-label={flipped ? '사진 보기' : '뒷면 보기'}
        onClick={() => setFlipped((value) => !value)}
      >
        <div className="pf-flip__inner">
          {/* front — instant photo */}
          <div className="pf-face pf-face--front">
            <span className="pf-photo">
              <img src={item.src} alt={item.alt ?? item.title} />
              <span className="pf-photo__sheen" aria-hidden="true" />
            </span>
            <span className="pf-caption">{item.caption ?? item.title}</span>
          </div>
          {/* back — written on the polaroid back */}
          <div className="pf-face pf-face--back">
            <span className="pf-back__title">{item.title}</span>
            {description && <p className="pf-back__desc">{description}</p>}
          </div>
        </div>
      </button>
      <p className="pf-hint">{flipped ? '↺ 사진으로' : '눌러서 뒤집기'}</p>
    </motion.div>
  );
}

export function PolaroidFlipLightbox() {
  const { items, index, visible } = useStore($polaroidLightbox);
  const count = items.length;
  const [mounted, setMounted] = useState(false);

  // portal needs document; render an empty fragment (never null — Astro islands
  // must not return null on the server) until mounted on the client.
  useEffect(() => {
    setMounted(true);
  }, []);

  const go = useCallback(
    (delta: number) => {
      if (!visible || count === 0)
        return;
      setPolaroidLightboxIndex(wrap(index + delta, count));
    },
    [visible, index, count],
  );

  useEffect(() => {
    if (!visible)
      return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        closePolaroidLightbox();
      else if (event.key === 'ArrowLeft')
        go(-1);
      else if (event.key === 'ArrowRight')
        go(1);
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [visible, go]);

  if (!mounted)
    return <></>;

  const item = items[index];

  return createPortal(
    <AnimatePresence>
      {visible && item && (
        <motion.div
          className="pf-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onClick={closePolaroidLightbox}
        >
          <button type="button" className="pf-btn pf-btn--close" aria-label="닫기" onClick={closePolaroidLightbox}>
            <X size={20} />
          </button>

          <div className="pf-arena" onClick={(event) => event.stopPropagation()}>
            <PolaroidCard item={item} />
          </div>

          {count > 1 && (
            <div className="pf-controls" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="pf-btn pf-nav" aria-label="이전" onClick={() => go(-1)}>
                <ChevronLeft size={24} />
              </button>
              <span className="pf-counter">
                {index + 1}
                {' / '}
                {count}
              </span>
              <button type="button" className="pf-btn pf-nav" aria-label="다음" onClick={() => go(1)}>
                <ChevronRight size={24} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
