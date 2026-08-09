import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { attachMedia, mediaUpload } from './mediaUploads';

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

function GalleryView({ editor, node, getPos, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const variant = node.attrs.variant as GalleryVariant;
  const items = node.attrs.items as GalleryItem[];
  const fileRef = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState<string[]>([]);

  const setItems = (next: GalleryItem[]) => updateAttributes({ items: next });
  const patch = (i: number, p: Partial<GalleryItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));

  // blob: → /files/media, outside the undo stack (see MdxMedia). Re-reads the live items instead of
  // the closure's, so a swap that lands while other items are still uploading can't clobber them.
  const applySrc = (from: string, to: string) => {
    const pos = getPos();
    if (pos == null) return;
    const live = editor.state.doc.nodeAt(pos)?.attrs.items as GalleryItem[] | undefined;
    if (!live) return;
    editor.chain().command(({ tr }) => {
      tr.setNodeAttribute(pos, 'items', live.map((it) => (it.src === from ? { ...it, src: to } : it)));
      tr.setMeta('addToHistory', false);
      return true;
    }).run();
  };

  // Subscribe to whichever items are still uploading (see MdxMedia for why this is an effect).
  useEffect(() => {
    let alive = true;
    for (const it of items) {
      const pending = mediaUpload(it.src);
      if (!pending) continue;
      pending.promise.then(
        (uploaded) => { if (alive) applySrc(it.src, uploaded); },
        () => { if (alive) setFailed((f) => (f.includes(it.src) ? f : [...f, it.src])); },
      );
    }
    return () => { alive = false; };
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach starts the upload immediately; the object URL is just the preview until it resolves.
  function onPick(files: FileList | null) {
    if (!files?.length) return;
    const blank: Partial<GalleryItem> = variant === 'polaroid' ? { title: '', caption: '', description: '' } : { alt: '' };
    const added = Array.from(files).map((f) => ({ src: attachMedia(f), ...blank }));
    setItems([...items, ...added]);
    if (fileRef.current) fileRef.current.value = '';
  }

  function onRetry(src: string) {
    setFailed((f) => f.filter((s) => s !== src));
    mediaUpload(src)?.retry().then(
      (uploaded) => applySrc(src, uploaded),
      () => setFailed((f) => (f.includes(src) ? f : [...f, src])),
    );
  }

  return (
    <NodeViewWrapper className="gallery-node" data-variant={variant}>
      <div className="gallery-head">
        <span className="gallery-tag">갤러리 · {LABEL[variant]}</span>
        <button type="button" className="gallery-x" onClick={() => deleteNode()} title="블록 삭제">✕</button>
      </div>
      <div className="gallery-grid">
        {items.map((it, i) => (
          <figure key={it.src + i} className="gallery-item" data-pending={(it.src.startsWith('blob:') && !failed.includes(it.src)) || undefined}>
            <img src={it.src} alt={it.alt ?? it.title ?? ''} loading="lazy" decoding="async" />
            {failed.includes(it.src) && (
              <button type="button" className="gallery-retry" onClick={() => onRetry(it.src)}>업로드 실패 · 재시도</button>
            )}
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
