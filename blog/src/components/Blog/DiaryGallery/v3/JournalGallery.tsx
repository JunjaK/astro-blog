'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { type PolaroidImage, resolveThumb, round4, seeded } from './shared';
import { V3LightboxShell } from './V3LightboxShell';
import './v3.css';

function PageStage({ item }: { item: PolaroidImage }) {
  return (
    <motion.div
      key={item.src}
      className="dgv3-journal-open"
      initial={{ opacity: 0, rotateX: 38, y: 30 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20 }}
    >
      <div className="dgv3-journal-open__photo">
        <span className="dgv3-tape dgv3-tape--tl" aria-hidden="true" />
        <span className="dgv3-tape dgv3-tape--br" aria-hidden="true" />
        <img src={item.src} alt={item.alt ?? item.title} />
      </div>
      <div className="dgv3-journal-open__memo">
        <span className="dgv3-journal-open__title">{item.title}</span>
        {item.description && (
          <span className="dgv3-journal-open__hand">{item.description}</span>
        )}
      </div>
    </motion.div>
  );
}

export function JournalGallery({ items }: { items: PolaroidImage[] }) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <div className="dgv3-shell dgv3-shell--journal" data-no-lightbox>
      <div className="dgv3-journal-book">
        <span className="dgv3-journal-book__spine" aria-hidden="true" />
        <div className="dgv3-journal-book__pages">
          {items.map((item, i) => {
            const rotate = round4(-4 + seeded(i + 31) * 8);
            const tapeRotate = round4(-8 + seeded(i + 91) * 16);
            return (
              <button
                key={item.src}
                type="button"
                className="dgv3-journal-photo"
                aria-label={item.title}
                style={{ '--card-rotate': `${rotate}deg`, '--tape-rotate': `${tapeRotate}deg` } as React.CSSProperties}
                onClick={() => setIndex(i)}
              >
                <span className="dgv3-tape dgv3-tape--top" aria-hidden="true" />
                <span className="dgv3-journal-photo__img">
                  <img src={resolveThumb(item)} alt={item.alt ?? item.title} loading="lazy" decoding="async" />
                </span>
                <span className="dgv3-journal-photo__cap">{item.caption ?? item.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <V3LightboxShell count={items.length} index={index} onClose={() => setIndex(null)} onIndex={setIndex}>
        {(i) => <PageStage item={items[i]} />}
      </V3LightboxShell>
    </div>
  );
}
