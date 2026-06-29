import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useState } from 'react';

// A preserved MDX block (component / import / export / lyrics·mermaid fence).
// Collapsed to a one-line chip by default (mobile-friendly); expand to edit the
// verbatim source. Serialize stays byte-exact → component regions never mangle.
function label(src: string): string {
  const t = src.trim();
  const m = t.match(/^<([A-Za-z][\w.]*)/) || t.match(/^(import|export)\b/) || t.match(/^```(\w+)/);
  return m ? m[1] : 'mdx';
}

function RawMdxView({ node, updateAttributes }: ReactNodeViewProps) {
  const src = node.attrs.src as string;
  const [open, setOpen] = useState(false);
  return (
    <NodeViewWrapper className="rawmdx" data-open={open}>
      <button type="button" className="rawmdx-chip" onClick={() => setOpen((o) => !o)}>
        <span className="rawmdx-chiptag">⟨{label(src)}⟩</span>
        <span className="rawmdx-peek">{src.trim().replace(/\s+/g, ' ').slice(0, 80)}</span>
        <span className="rawmdx-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <textarea
          className="rawmdx-src"
          value={src}
          spellCheck={false}
          rows={Math.min(src.split('\n').length + 1, 14)}
          onChange={(e) => updateAttributes({ src: e.target.value })}
        />
      )}
    </NodeViewWrapper>
  );
}

export const RawMdx = Node.create({
  name: 'rawMdx',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { src: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'div[data-rawmdx]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-rawmdx': '' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(RawMdxView);
  },
  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void; closeBlock: (n: unknown) => void }, node: { attrs: { src: string } }) {
          state.write(node.attrs.src);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});
