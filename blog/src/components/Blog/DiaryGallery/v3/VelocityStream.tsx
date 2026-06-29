'use client';

import { useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import { motion, useScroll, useSpring, useTransform, useVelocity } from 'framer-motion';
import { TegakiCaption } from './TegakiCaption';
import { V3LightboxShell } from './V3LightboxShell';
import { resolveThumb, type PolaroidImage } from './shared';
import './v3.css';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

type StreamCardProps = {
  item: PolaroidImage;
  index: number;
  label: number;
  pos: MotionValue<number>;
  vel: MotionValue<number>;
  onOpen: () => void;
};

/** One photo in the diagonal 3D stream. `pos` = current scroll position (0..n-1). */
function StreamCard({ item, index, label, pos, vel, onOpen }: StreamCardProps) {
  // d < 0 → already passed (toward viewer); d > 0 → receding up-right
  // -50% bakes in self-centering (card sits at left:50%/top:50%); motion owns the transform
  const x = useTransform(() => `${-58 + (index - pos.get()) * 30 + vel.get() * 10}%`);
  const y = useTransform(() => `${-50 + (index - pos.get()) * -15}%`);
  // hump look: front card largest, both sides recede. A small monotonic skew (-d*8)
  // breaks the exact z-tie at symmetric |d| so real 3D depth sorts continuously —
  // no discrete z-index pop when two cards cross.
  const z = useTransform(() => -Math.abs(index - pos.get()) * 340 - (index - pos.get()) * 8);
  const rotateY = useTransform(() => clamp(-32 + vel.get() * 7, -46, 2));
  const scale = useTransform(() => Math.max(0.42, 1 - Math.abs(index - pos.get()) * 0.05));
  const opacity = useTransform(() => {
    const a = Math.abs(index - pos.get());
    return a > 5 ? 0 : clamp((5.4 - a) / 1.6, 0, 1);
  });
  const pointerEvents = useTransform(() => (Math.abs(index - pos.get()) < 1.25 ? 'auto' : 'none'));

  return (
    <motion.button
      type="button"
      className="dgv3-stream-card"
      aria-label={item.title}
      style={{ x, y, z, rotateY, scale, opacity, pointerEvents }}
      onClick={onOpen}
    >
      <span className="dgv3-stream-card__no" aria-hidden="true">{String(label).padStart(2, '0')}</span>
      <img src={resolveThumb(item)} alt={item.alt ?? item.title} loading="lazy" decoding="async" />
      <span className="dgv3-stream-card__cap">{item.caption ?? item.title}</span>
    </motion.button>
  );
}

function StreamStage({ item }: { item: PolaroidImage }) {
  return (
    <motion.div
      key={item.src}
      className="dgv3-reel-stage"
      initial={{ opacity: 0, scale: 0.92, rotateY: -12 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      <div className="dgv3-reel-stage__frame">
        <img src={item.src} alt={item.alt ?? item.title} />
      </div>
      <div className="dgv3-reel-stage__cap">
        <TegakiCaption text={item.caption ?? item.title} delay={0.2} replayKey={item.src} className="dgv3-reel-stage__hand" />
        {item.description && <p className="dgv3-reel-stage__desc">{item.description}</p>}
      </div>
    </motion.div>
  );
}

export function VelocityStream({ items }: { items: PolaroidImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // duplicate the set so the diagonal stack reads as a dense, flowing stream
  const stream = [...items, ...items, ...items];

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const pos = useSpring(useTransform(scrollYProgress, [0, 1], [0, stream.length - 1]), {
    damping: 40,
    stiffness: 220,
  });
  const vel = useSpring(useVelocity(scrollYProgress), { damping: 50, stiffness: 400 });
  const velFactor = useTransform(vel, [-2, 2], [-1.4, 1.4], { clamp: true });

  return (
    <div className="dgv3-shell dgv3-shell--stream" data-no-lightbox>
      <div className="dgv3-stream" ref={sectionRef} style={{ height: `${stream.length * 24 + 100}vh` }}>
        <div className="dgv3-stream__stage">
          <span className="dgv3-stream__year" aria-hidden="true">'25 / '26</span>
          <span className="dgv3-stream__brand" aria-hidden="true">TRAVELOGUE</span>
          <div className="dgv3-stream__deck">
            {stream.map((item, i) => (
              <StreamCard
                key={i}
                item={item}
                index={i}
                label={(i % items.length) + 1}
                pos={pos}
                vel={velFactor}
                onOpen={() => setIndex(i % items.length)}
              />
            ))}
          </div>
          <span className="dgv3-stream__hint" aria-hidden="true">스크롤하면 흐릅니다 ↓</span>
        </div>
      </div>

      <V3LightboxShell count={items.length} index={index} onClose={() => setIndex(null)} onIndex={setIndex}>
        {(i) => <StreamStage item={items[i]} />}
      </V3LightboxShell>
    </div>
  );
}
