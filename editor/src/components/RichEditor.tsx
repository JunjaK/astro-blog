import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import type { Editor, JSONContent } from '@tiptap/core';
import { GalleryNode } from '../tiptap/GalleryNode';
import { MdxMedia } from '../tiptap/MdxMedia';
import { RawMdx } from '../tiptap/RawMdx';
import { SlashCommand } from '../tiptap/SlashCommand';
import { pendingMedia } from '../tiptap/pendingMedia';
import { api } from '../lib/api';

export interface Segment {
  kind: 'md' | 'raw';
  src: string;
  node?: { name: string; attrs?: Record<string, string>; items?: { src: string; alt: string }[] };
}
export interface RichEditorHandle {
  getBody: () => string;
  flushUploads: () => Promise<void>; // upload attached-but-pending images, swap blob src → /files/media
}

// tiptap-markdown augments editor.storage at runtime but not in types.
interface MarkdownStorage {
  parser: { parse: (s: string) => { toJSON?: () => JSONContent } | JSONContent };
  getMarkdown: () => string;
}
const md = (e: Editor) => (e.storage as unknown as { markdown: MarkdownStorage }).markdown;

interface Props {
  segments: Segment[];
  type: string; // post category — drives the slash component palette
  onDirty?: () => void;
}

export const RichEditor = forwardRef<RichEditorHandle, Props>(({ segments, type, onDirty }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: true, transformPastedText: true }),
      GalleryNode,
      MdxMedia,
      RawMdx,
      SlashCommand.configure({ type }),
    ],
    onUpdate: () => onDirty?.(),
  });

  // Assemble: md segments → parsed prose nodes, raw segments → preserved RawMdx nodes.
  useEffect(() => {
    if (!editor) return;
    const content: JSONContent[] = [];
    for (const s of segments) {
      if (s.kind === 'raw') {
        if (s.node?.name === 'ImageLoader')
          content.push({ type: 'mdxMedia', attrs: { tag: 'ImageLoader', src: s.node.attrs?.src ?? '', alt: s.node.attrs?.alt ?? '' } });
        else if (s.node?.name === 'VideoLoader')
          content.push({ type: 'mdxMedia', attrs: { tag: 'VideoLoader', src: s.node.attrs?.src ?? '', alt: '' } });
        else if (s.node?.name === 'DiaryCarousel')
          content.push({ type: 'gallery', attrs: { variant: 'carousel', items: s.node.items ?? [] } });
        else
          content.push({ type: 'rawMdx', attrs: { src: s.src } });
      } else {
        const parsed = md(editor).parser.parse(s.src);
        const json = (parsed && typeof (parsed as { toJSON?: unknown }).toJSON === 'function'
          ? (parsed as { toJSON: () => JSONContent }).toJSON()
          : parsed) as JSONContent;
        if (json?.content) content.push(...json.content);
      }
    }
    editor.commands.setContent({ type: 'doc', content }, { emitUpdate: false });
  }, [editor, segments]);

  useImperativeHandle(ref, () => ({
    getBody: () => (editor ? md(editor).getMarkdown() : ''),
    flushUploads: async () => {
      if (!editor) return;
      const jobs: { pos: number; items: { src: string; alt: string }[] }[] = [];
      const imgJobs: { pos: number; src: string }[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'gallery') jobs.push({ pos, items: node.attrs.items });
        if (node.type.name === 'mdxMedia' && String(node.attrs.src).startsWith('blob:')) imgJobs.push({ pos, src: node.attrs.src });
      });
      for (const j of imgJobs) {
        const file = pendingMedia.get(j.src);
        if (!file) continue;
        const { src } = await api.uploadMedia(file);
        URL.revokeObjectURL(j.src);
        pendingMedia.delete(j.src);
        editor.chain().command(({ tr }) => { tr.setNodeAttribute(j.pos, 'src', src); return true; }).run();
      }
      for (const job of jobs) {
        let changed = false;
        const out: { src: string; alt: string }[] = [];
        for (const it of job.items) {
          const file = pendingMedia.get(it.src);
          if (it.src.startsWith('blob:') && file) {
            const { src } = await api.uploadMedia(file);
            URL.revokeObjectURL(it.src);
            pendingMedia.delete(it.src);
            out.push({ ...it, src });
            changed = true;
          } else { out.push(it); }
        }
        if (changed) editor.chain().command(({ tr }) => { tr.setNodeAttribute(job.pos, 'items', out); return true; }).run();
      }
    },
  }), [editor]);

  if (!editor) return null;
  return <EditorContent editor={editor} className="editor-canvas" />;
});
