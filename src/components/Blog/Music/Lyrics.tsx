import type { KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import './lyrics.css';

type Stanza = {
  ja: string;
  ko: string;
};

type Props = {
  stanzas: Stanza[];
};

export default function Lyrics({ stanzas }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const allExpanded = stanzas.length > 0 && expanded.size === stanzas.length;

  const toggleStanza = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      }
      else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(stanzas.map((_, i) => i)));
  }, [stanzas]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleStanza(index);
    }
  };

  return (
    <div className="lyrics-block">
      <div className="lyrics-toolbar">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={allExpanded ? collapseAll : expandAll}
        >
          {allExpanded ? '전체 접기' : '전체 펼치기'}
        </Button>
      </div>

      {stanzas.map((stanza, index) => {
        const isOpen = expanded.has(index);
        return (
          <div
            key={index}
            className={`lyrics-stanza${isOpen ? ' is-expanded' : ''}`}
            role="button"
            aria-expanded={isOpen}
            tabIndex={0}
            onClick={() => toggleStanza(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <div className="lyrics-stanza-header">
              <div
                className="ja flex-1"
                dangerouslySetInnerHTML={{ __html: stanza.ja }}
              />
              <span className="chevron" aria-hidden="true">
                <Icon icon="mingcute:down-line" width={20} height={20} />
              </span>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="ko"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="ko"
                    dangerouslySetInnerHTML={{ __html: stanza.ko }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
