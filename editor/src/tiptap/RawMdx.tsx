import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';

// A preserved MDX block (component / import / export / lyrics·mermaid fence).
// Edited as raw text, emitted verbatim on serialize → component regions never mangle.
function label(src: string): string {
  const t = src.trim();
  const m = t.match(/^<([A-Za-z][\w.]*)/) || t.match(/^(import|export)\b/) || t.match(/^```(\w+)/);
  return m ? m[1] : 'mdx';
}

function RawMdxView({ node, updateAttributes }: ReactNodeViewProps) {
  const src = node.attrs.src as string;
  return (
    <NodeViewWrapper className="rawmdx">
      <div className="rawmdx-tag">⟨{label(src)}⟩ MDX</div>
      <textarea
        className="rawmdx-src"
        value={src}
        spellCheck={false}
        rows={Math.min(src.split('\n').length + 1, 14)}
        onChange={(e) => updateAttributes({ src: e.target.value })}
      />
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
