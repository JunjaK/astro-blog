'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { type PolaroidImage, resolveThumb, round4, seeded } from './shared';
import { TiltCard } from './TiltCard';
import { V3LightboxShell } from './V3LightboxShell';
import './v3.css';

function PostcardStage({ item }: { item: PolaroidImage }) {
  const [flipped, setFlipped] = useState(false);

  // reset to the photo side whenever the postcard changes
  useEffect(() => {
    setFlipped(false);
  }, [item.src]);

  return (
    <motion.div
      key={item.src}
      className="dgv3-pc-stage"
      initial={{ opacity: 0, y: 24, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
    >
      <button
        type="button"
        className={`dgv3-pc-flip${flipped ? ' is-flipped' : ''}`}
        aria-label={flipped ? '사진 보기' : '뒷면 보기'}
        onClick={() => setFlipped((v) => !v)}
      >
        <div className="dgv3-pc-flip__inner">
          <div className="dgv3-pc-face dgv3-pc-face--front">
            <img src={item.src} alt={item.alt ?? item.title} />
            <span className="dgv3-pc-stamp" aria-hidden="true">
              <span className="dgv3-pc-stamp__inner" style={{ backgroundImage: `url(${resolveThumb(item)})` }} />
            </span>
            <span className="dgv3-pc-postmark" aria-hidden="true">PAR AVION</span>
          </div>
          <div className="dgv3-pc-face dgv3-pc-face--back">
            <div className="dgv3-pc-back__note">
              <span className="dgv3-pc-back__title">{item.title}</span>
              {item.description && (
                <span className="dgv3-pc-back__hand">{item.description}</span>
              )}
            </div>
            <div className="dgv3-pc-back__address" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="dgv3-pc-back__divider" aria-hidden="true" />
            <span className="dgv3-pc-postmark dgv3-pc-postmark--back" aria-hidden="true">✈ TOKYO</span>
          </div>
        </div>
      </button>
      <p className="dgv3-pc-hint">{flipped ? '↺ 사진' : '엽서를 눌러 뒤집기 ✎'}</p>
    </motion.div>
  );
}

export function PostcardGallery({ items }: { items: PolaroidImage[] }) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <div className="dgv3-shell dgv3-shell--postcard" data-no-lightbox>
      <div className="dgv3-pc-board">
        {items.map((item, i) => {
          const rotate = round4(-5 + seeded(i + 11) * 10);
          return (
            <TiltCard
              key={item.src}
              className="dgv3-pc-card"
              ariaLabel={item.title}
              style={{ '--card-rotate': `${rotate}deg`, 'zIndex': items.length - i } as React.CSSProperties}
              onActivate={() => setIndex(i)}
            >
              <span className="dgv3-pc-card__airmail" aria-hidden="true" />
              <span className="dgv3-pc-card__photo">
                <img src={resolveThumb(item)} alt={item.alt ?? item.title} loading="lazy" decoding="async" />
              </span>
              <span className="dgv3-pc-card__stamp" aria-hidden="true" />
              <span className="dgv3-pc-card__postmark" aria-hidden="true" />
              <span className="dgv3-pc-card__caption">{item.caption ?? item.title}</span>
            </TiltCard>
          );
        })}
      </div>

      <V3LightboxShell count={items.length} index={index} onClose={() => setIndex(null)} onIndex={setIndex}>
        {(i) => <PostcardStage item={items[i]} />}
      </V3LightboxShell>
    </div>
  );
}
