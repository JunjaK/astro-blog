import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';

// MusicCard is frontmatter-wired (artist / album / urls live in the frontmatter form),
// so the body node carries no fields — it's a positional marker. Serialize re-emits the
// canonical `<MusicCard … />` wiring, which also repairs a bare/hand-edited insert.
const CANONICAL =
  `<MusicCard\n` +
  `  appleMusicUrl={frontmatter.appleMusicUrl}\n` +
  `  youtubeMusicUrl={frontmatter.youtubeMusicUrl}\n` +
  `  artist={frontmatter.artist}\n` +
  `  album={frontmatter.album}\n` +
  `  releaseYear={frontmatter.releaseYear}\n` +
  `/>`;

function MusicCardView({ deleteNode }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="music-card-node">
      <span className="music-card-node__icon" aria-hidden="true">♪</span>
      <span className="music-card-node__label">뮤직 카드</span>
      <span className="music-card-node__hint">프론트매터 「음악 정보」에서 편집</span>
      <button type="button" className="music-card-node__x" onClick={() => deleteNode()} title="블록 삭제">✕</button>
    </NodeViewWrapper>
  );
}

export const MusicCardNode = Node.create({
  name: 'musicCard',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-music-card]' }];
  },
  renderHTML() {
    return ['div', { 'data-music-card': '' }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MusicCardView);
  },
  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void; closeBlock: (n: unknown) => void }, node: unknown) {
          state.write(CANONICAL);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});
