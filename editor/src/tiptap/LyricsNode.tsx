import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useContext, useEffect } from 'react';
import type { LyricsKind } from '../lib/api';
import { LyricsKindContext } from './LyricsKindContext';

// A ```lyrics fence, edited per stanza. Type (frontmatter lyricsType) drives the fields:
//   jpop  원문(루비 {漢字|かな}) + 번역   pop  원문 + 번역   kpop  가사만
// Serialize is data-driven: a stanza emits `원문 || 번역` when it has a translation,
// else just 원문 (kpop forces 가사만). Ruby markup stays inline — the blog build tokenizes it.
export interface LyricStanza { ja: string; ko: string }

const FENCE = '```';

function LyricsView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const kind = useContext(LyricsKindContext);
  const stanzas = node.attrs.stanzas as LyricStanza[];
  const showKo = kind !== 'kpop';
  const jaLabel = kind === 'jpop' ? '가사 (루비: {漢字|かな})' : showKo ? '원문' : '가사';

  // Keep the node's own kind attr in sync with the frontmatter (serialize reads the attr,
  // which can't see React context). Guarded so a matching value never dirties the doc.
  useEffect(() => {
    if (node.attrs.kind !== kind) updateAttributes({ kind });
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStanzas = (next: LyricStanza[]) => updateAttributes({ stanzas: next });
  const patch = (i: number, p: Partial<LyricStanza>) => setStanzas(stanzas.map((s, j) => (j === i ? { ...s, ...p } : s)));

  return (
    <NodeViewWrapper className="lyrics-node" data-kind={kind}>
      <div className="lyrics-node__head">
        <span className="lyrics-node__tag">가사 · {kind.toUpperCase()} · {stanzas.length} 스탠자</span>
        <button type="button" className="lyrics-node__x" onClick={() => deleteNode()} title="블록 삭제">✕</button>
      </div>
      {stanzas.map((s, i) => (
        <div key={i} className="lyrics-stanza-edit" data-single={!showKo}>
          <div className="lyrics-stanza-edit__idx">
            <span>#{String(i + 1).padStart(2, '0')}</span>
            <button
              type="button"
              className="lyrics-stanza-edit__x"
              onClick={() => setStanzas(stanzas.filter((_, j) => j !== i))}
              title="스탠자 삭제"
            >✕</button>
          </div>
          <textarea
            className="lyrics-ta lyrics-ta--ja"
            value={s.ja}
            placeholder={jaLabel}
            rows={Math.max(2, s.ja.split('\n').length)}
            onChange={(e) => patch(i, { ja: e.target.value })}
          />
          {showKo && (
            <textarea
              className="lyrics-ta lyrics-ta--ko"
              value={s.ko}
              placeholder="번역"
              rows={Math.max(2, s.ko.split('\n').length)}
              onChange={(e) => patch(i, { ko: e.target.value })}
            />
          )}
        </div>
      ))}
      <button
        type="button"
        className="lyrics-node__add"
        onClick={() => setStanzas([...stanzas, { ja: '', ko: '' }])}
      >+ 스탠자</button>
    </NodeViewWrapper>
  );
}

export const LyricsNode = Node.create({
  name: 'lyrics',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      stanzas: { default: [] as LyricStanza[] },
      kind: { default: 'jpop' as LyricsKind },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-lyrics]' }];
  },
  renderHTML() {
    return ['div', { 'data-lyrics': '' }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(LyricsView);
  },
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { attrs: { stanzas: LyricStanza[]; kind: LyricsKind } },
        ) {
          const { stanzas, kind } = node.attrs;
          const body = stanzas
            .map((s) => (kind !== 'kpop' && s.ko.trim() ? `${s.ja}\n||\n${s.ko}` : s.ja))
            .join('\n\n');
          state.write(`${FENCE}lyrics\n${body}\n${FENCE}`);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});
