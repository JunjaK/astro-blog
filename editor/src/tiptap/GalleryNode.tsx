import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useRef } from 'react';
import { pendingMedia } from './pendingMedia';

// Gallery block: holds the images you add; editor shows them raw. The real
// DiaryCarousel / PolaroidGalleryScrapbook renders in the published blog (viewer).
// Polaroid carries per-image title / caption / description inline — no hoisted const.
export type GalleryVariant = 'carousel' | 'polaroid';
export interface GalleryItem {
  src: string;
  alt?: string;         // carousel img alt
  title?: string;       // polaroid card + lightbox title
  caption?: string;     // polaroid handwritten caption
  description?: string; // polaroid lightbox body
}

const LABEL: Record<GalleryVariant, string> = {
  carousel: 'DiaryCarousel',
  polaroid: 'PolaroidGalleryScrapbook',
};

function GalleryView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const variant = node.attrs.variant as GalleryVariant;
  const items = node.attrs.items as GalleryItem[];
  const fileRef = useRef<HTMLInputElement>(null);

  const setItems = (next: GalleryItem[]) => updateAttributes({ items: next });
  const patch = (i: number, p: Partial<GalleryItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));

  // Attach = local preview only (object URL). Upload happens on save (flushUploads).
  function onPick(files: FileList | null) {
    if (!files?.length) return;
    const blank: Partial<GalleryItem> = variant === 'polaroid' ? { title: '', caption: '', description: '' } : { alt: '' };
    const added = Array.from(files).map((f) => {
      const url = URL.createObjectURL(f);
      pendingMedia.set(url, f);
      return { src: url, ...blank };
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
            <img src={it.src} alt={it.alt ?? it.title ?? ''} loading="lazy" decoding="async" />
            {variant === 'polaroid' ? (
              <div className="gallery-fields">
                <input
                  className="gallery-cap"
                  value={it.title ?? ''}
                  placeholder="제목"
                  onChange={(e) => patch(i, { title: e.target.value })}
                />
                <input
                  className="gallery-cap"
                  value={it.caption ?? ''}
                  placeholder="캡션 (손글씨)"
                  onChange={(e) => patch(i, { caption: e.target.value })}
                />
                <textarea
                  className="gallery-desc"
                  value={it.description ?? ''}
                  placeholder="설명 (라이트박스)"
                  rows={2}
                  onChange={(e) => patch(i, { description: e.target.value })}
                />
              </div>
            ) : (
              <input
                className="gallery-cap"
                value={it.alt ?? ''}
                placeholder="설명(alt)"
                onChange={(e) => patch(i, { alt: e.target.value })}
              />
            )}
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
          const j = (s: string | undefined) => JSON.stringify(s ?? '');
          const rows = items
            .map((it) => {
              if (variant === 'polaroid') {
                // title + description always emitted (required by PolaroidImage); caption only if set.
                const parts = [`src: ${j(it.src)}`, `title: ${j(it.title)}`, `description: ${j(it.description)}`];
                if (it.caption) parts.push(`caption: ${j(it.caption)}`);
                return `  { ${parts.join(', ')} }`;
              }
              return `  { src: ${j(it.src)}, alt: ${j(it.alt)} }`;
            })
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
