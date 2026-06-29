import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useRef } from 'react';
import { pendingMedia } from './pendingMedia';

type Tag = 'ImageLoader' | 'VideoLoader';

// JSX string attr can't hold a raw " or newline → fall back to an expression attr.
const attr = (name: string, v: string) =>
  /["\n]/.test(v) ? `${name}={${JSON.stringify(v)}}` : `${name}="${v}"`;

function MdxMediaView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const tag = node.attrs.tag as Tag;
  const src = node.attrs.src as string;
  const alt = node.attrs.alt as string;
  const fileRef = useRef<HTMLInputElement>(null);
  const label = tag === 'VideoLoader' ? '동영상' : '이미지';
  const pending = src.startsWith('blob:'); // client-only, not yet uploaded to /files

  function onPick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    pendingMedia.set(url, f);
    updateAttributes({ src: url });
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <NodeViewWrapper className="mdx-media" data-tag={tag} data-pending={pending || undefined}>
      <div className="mdx-media-head">
        <span className="mdx-media-tag">
          {label} · {tag}
          {pending && <em className="mdx-media-pending">미저장 · 저장 시 업로드</em>}
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
