import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';

// TastingNoteCard is frontmatter-wired (nihonshu specs live in the frontmatter form),
// so the body node carries no fields — it's a positional marker. Serialize re-emits the
// canonical `<TastingNoteCard … />` wiring, which also repairs a bare/hand-edited insert.
const CANONICAL =
  `<TastingNoteCard\n` +
  `  drinkKind={frontmatter.drinkKind}\n` +
  `  brand={frontmatter.brand}\n` +
  `  brandYomigana={frontmatter.brandYomigana}\n` +
  `  yomigana={frontmatter.yomigana}\n` +
  `  brewery={frontmatter.brewery}\n` +
  `  breweryYomigana={frontmatter.breweryYomigana}\n` +
  `  prefecture={frontmatter.prefecture}\n` +
  `  tokuteiMeisho={frontmatter.tokuteiMeisho}\n` +
  `  riceType={frontmatter.riceType}\n` +
  `  seimaiBuai={frontmatter.seimaiBuai}\n` +
  `  alcohol={frontmatter.alcohol}\n` +
  `  nihonshuDo={frontmatter.nihonshuDo}\n` +
  `  sando={frontmatter.sando}\n` +
  `  amakara={frontmatter.amakara}\n` +
  `  noutan={frontmatter.noutan}\n` +
  `  flavorTags={frontmatter.flavorTags}\n` +
  `/>`;

function TastingNoteCardView({ deleteNode }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="tasting-note-node">
      <span className="tasting-note-node__icon" aria-hidden="true">🍶</span>
      <span className="tasting-note-node__label">시음 노트</span>
      <span className="tasting-note-node__hint">프론트매터 「시음 정보」에서 편집</span>
      <button type="button" className="tasting-note-node__x" onClick={() => deleteNode()} title="블록 삭제">✕</button>
    </NodeViewWrapper>
  );
}

export const TastingNoteCardNode = Node.create({
  name: 'tastingNoteCard',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-tasting-note-card]' }];
  },
  renderHTML() {
    return ['div', { 'data-tasting-note-card': '' }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TastingNoteCardView);
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
