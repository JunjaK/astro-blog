import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useRef } from 'react';
import { pendingMedia } from './pendingMedia';

// Gallery block: holds the images you add; editor shows them raw. The real
// DiaryCarousel / PolaroidGalleryScrapbook renders in the published blog (viewer).
// Serialization (node → MDX) lands with the publish step (milestone ①).
export type GalleryVariant = 'carousel' | 'polaroid';
export interface GalleryItem { src: string; alt: string }

const LABEL: Record<GalleryVariant, string> = {
  carousel: 'DiaryCarousel',
  polaroid: 'PolaroidGalleryScrapbook',
};

function GalleryView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const variant = node.attrs.variant as GalleryVariant;
  const items = node.attrs.items as GalleryItem[];
  const fileRef = useRef<HTMLInputElement>(null);

  const setItems = (next: GalleryItem[]) => updateAttributes({ items: next });

  // Attach = local preview only (object URL). Upload happens on save (flushUploads).
  function onPick(files: FileList | null) {
    if (!files?.length) return;
    const added = Array.from(files).map((f) => {
      const url = URL.createObjectURL(f);
      pendingMedia.set(url, f);
      return { src: url, alt: '' };
    });
    setItems([...items, ...added]);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <NodeViewWrapper className="gallery-node" data-variant={variant}>
      <div className="gallery-head">
        <span className="gallery-tag">갤러리 · {LABEL[variant]}</span>
        <button type="button" className="gallery-x" onClick={() => deleteNode()} title="블록 삭제">✕</button>
      </div>
      <div className="gallery-grid">
        {items.map((it, i) => (
          <figure key={it.src + i} className="gallery-item">
            <img src={it.src} alt={it.alt} />
            <input
              className="gallery-cap"
              value={it.alt}
              placeholder={variant === 'polaroid' ? '제목' : '설명(alt)'}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
            />
            <button
              type="button"
              className="gallery-remove"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              title="이미지 제거"
            >✕</button>
          </figure>
        ))}
        <button type="button" className="gallery-add" onClick={() => fileRef.current?.click()}>+ 이미지</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPick(e.target.files)} />
    </NodeViewWrapper>
  );
}

export const GalleryNode = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      variant: { default: 'carousel' as GalleryVariant },
      items: { default: [] as GalleryItem[] },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-gallery]' }];
  },
  renderHTML() {
    return ['div', { 'data-gallery': '' }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(GalleryView);
  },
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { attrs: { variant: GalleryVariant; items: GalleryItem[] } },
        ) {
          const { variant, items } = node.attrs;
          const rows = items
            .map((it) =>
              variant === 'polaroid'
                ? `  { src: ${JSON.stringify(it.src)}, title: ${JSON.stringify(it.alt)} }`
                : `  { src: ${JSON.stringify(it.src)}, alt: ${JSON.stringify(it.alt)} }`,
            )
            .join(',\n');
          state.write(
            variant === 'polaroid'
              ? `<PolaroidGalleryScrapbook items={[\n${rows}\n]} />`
              : `<DiaryCarousel client:visible content={[\n${rows}\n]} />`,
          );
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});
