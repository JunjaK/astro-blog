import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { attachMedia, mediaUpload } from './mediaUploads';

type Tag = 'ImageLoader' | 'VideoLoader';

// JSX string attr can't hold a raw " or newline → fall back to an expression attr.
const attr = (name: string, v: string) =>
  /["\n]/.test(v) ? `${name}={${JSON.stringify(v)}}` : `${name}="${v}"`;

function MdxMediaView({ editor, node, getPos, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const tag = node.attrs.tag as Tag;
  const src = node.attrs.src as string;
  const alt = node.attrs.alt as string;
  const fileRef = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false);
  const label = tag === 'VideoLoader' ? '동영상' : '이미지';
  const upload = mediaUpload(src); // set only while a blob: preview is still uploading
  const uploading = !!upload && !failed;

  // blob: → /files/media, outside the undo stack: the swap is bookkeeping, not a user edit, and on
  // the history stack a single ⌘Z would revert src to a preview URL that no longer resolves.
  // Reads the live node rather than the closure's `node` — the position may have moved.
  const applySrc = (uploaded: string) => {
    const pos = getPos();
    if (pos == null) return;
    editor.chain().command(({ tr }) => {
      tr.setNodeAttribute(pos, 'src', uploaded);
      tr.setMeta('addToHistory', false);
      return true;
    }).run();
  };

  // Subscribing to an already-running upload — an event/handler can't express "this promise, which
  // may have been started before this view mounted, has settled".
  useEffect(() => {
    const pending = mediaUpload(src);
    if (!pending) return;
    let alive = true;
    pending.promise.then(
      (uploaded) => { if (alive) applySrc(uploaded); },
      () => { if (alive) setFailed(true); },
    );
    return () => { alive = false; };
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  function onPick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setFailed(false);
    updateAttributes({ src: attachMedia(f) });
    if (fileRef.current) fileRef.current.value = '';
  }

  function onRetry() {
    setFailed(false);
    upload?.retry().then(applySrc, () => setFailed(true));
  }

  return (
    <NodeViewWrapper className="mdx-media" data-tag={tag} data-pending={uploading || undefined} data-failed={failed || undefined}>
      <div className="mdx-media-head">
        <span className="mdx-media-tag">
          {label} · {tag}
          {uploading && <em className="mdx-media-pending">업로드 중…</em>}
          {failed && (
            <em className="mdx-media-failed">
              업로드 실패
              <button type="button" className="mdx-media-retry" onClick={onRetry}>재시도</button>
            </em>
          )}
        </span>
        <button type="button" className="mdx-media-x" onClick={() => deleteNode()} title="블록 삭제">✕</button>
      </div>
      {!src
        ? <button type="button" className="mdx-media-add" onClick={() => fileRef.current?.click()}>+ {label} 선택</button>
        : tag === 'VideoLoader'
          ? <video src={src} controls playsInline preload="metadata" className="mdx-media-el" />
          : <img src={src} alt={alt} loading="lazy" decoding="async" className="mdx-media-el" />}
      {src && tag === 'ImageLoader' && (
        <input className="mdx-media-cap" value={alt} placeholder="설명(alt)" onChange={(e) => updateAttributes({ alt: e.target.value })} />
      )}
      <input ref={fileRef} type="file" accept={tag === 'VideoLoader' ? 'video/*' : 'image/*'} hidden onChange={(e) => onPick(e.target.files)} />
    </NodeViewWrapper>
  );
}

export const MdxMedia = Node.create({
  name: 'mdxMedia',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { tag: { default: 'ImageLoader' as Tag }, src: { default: '' }, alt: { default: '' } };
  },
  parseHTML() { return [{ tag: 'div[data-mdx-media]' }]; },
  renderHTML() { return ['div', { 'data-mdx-media': '' }]; },
  addNodeView() { return ReactNodeViewRenderer(MdxMediaView); },
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { attrs: { tag: Tag; src: string; alt: string } },
        ) {
          const { tag, src, alt } = node.attrs;
          state.write(
            tag === 'VideoLoader'
              ? `<VideoLoader ${attr('src', src)} />`
              : `<ImageLoader ${attr('src', src)} ${attr('alt', alt || 'blog-image')} />`,
          );
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});
