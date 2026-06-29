'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { type PolaroidImage, resolveThumb } from './shared';
import { TegakiCaption } from './TegakiCaption';
import { TiltCard } from './TiltCard';
import { V3LightboxShell } from './V3LightboxShell';
import './v3.css';

function SlideStage({ item, index }: { item: PolaroidImage; index: number }) {
  return (
    <motion.div
      key={item.src}
      className="dgv3-film-table"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      <TiltCard className="dgv3-film-mount" max={7}>
        <span className="dgv3-film-mount__window">
          <img src={item.src} alt={item.alt ?? item.title} />
          <span className="dgv3-film-mount__sheen" aria-hidden="true" />
        </span>
        <span className="dgv3-film-mount__label">
          <span className="dgv3-film-mount__no">{String(index + 1).padStart(2, '0')}</span>
          <TegakiCaption
            text={item.caption ?? item.title}
            delay={0.2}
            replayKey={item.src}
            className="dgv3-film-mount__hand"
          />
        </span>
      </TiltCard>
      {item.description && <p className="dgv3-film-desc">{item.description}</p>}
    </motion.div>
  );
}

export function FilmStripGallery({ items }: { items: PolaroidImage[] }) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <div className="dgv3-shell dgv3-shell--film" data-no-lightbox>
      <div className="dgv3-film-strip" role="list">
        <span className="dgv3-film-strip__sprockets dgv3-film-strip__sprockets--top" aria-hidden="true" />
        <div className="dgv3-film-strip__frames">
          {items.map((item, i) => (
            <button
              key={item.src}
              type="button"
              role="listitem"
              className="dgv3-film-frame"
              aria-label={item.title}
              onClick={() => setIndex(i)}
            >
              <img src={resolveThumb(item)} alt={item.alt ?? item.title} loading="lazy" decoding="async" />
              <span className="dgv3-film-frame__no">{String(i + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
        <span className="dgv3-film-strip__sprockets dgv3-film-strip__sprockets--bottom" aria-hidden="true" />
      </div>

      <V3LightboxShell count={items.length} index={index} onClose={() => setIndex(null)} onIndex={setIndex}>
        {(i) => <SlideStage item={items[i]} index={i} />}
      </V3LightboxShell>
    </div>
  );
}
