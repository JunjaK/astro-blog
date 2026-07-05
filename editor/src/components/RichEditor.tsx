import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import type { Editor, JSONContent } from '@tiptap/core';
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';
import { GalleryNode, type GalleryItem } from '../tiptap/GalleryNode';
import { LyricsNode, type LyricStanza } from '../tiptap/LyricsNode';
import { MusicCardNode } from '../tiptap/MusicCardNode';
import { TastingNoteCardNode } from '../tiptap/TastingNoteCardNode';
import { MdxMedia } from '../tiptap/MdxMedia';
import { RawMdx } from '../tiptap/RawMdx';
import { SlashCommand } from '../tiptap/SlashCommand';
import { LyricsKindContext } from '../tiptap/LyricsKindContext';
import { pendingMedia } from '../tiptap/pendingMedia';
import { api, type LyricsKind } from '../lib/api';

export interface Segment {
  kind: 'md' | 'raw';
  src: string;
  node?: { name: string; attrs?: Record<string, string>; items?: GalleryItem[]; stanzas?: LyricStanza[] };
}
export interface RichEditorHandle {
  getBody: () => string;
  flushUploads: () => Promise<void>; // upload attached-but-pending images, swap blob src → /files/media
}

// tiptap-markdown augments editor.storage at runtime but not in types.
interface MarkdownStorage {
  parser: { parse: (s: string) => string }; // returns rendered HTML, not a PM node
  getMarkdown: () => string;
}
const md = (e: Editor) => (e.storage as unknown as { markdown: MarkdownStorage }).markdown;

interface Props {
  segments: Segment[];
  type: string; // post category — drives the slash component palette
  lyricsType?: LyricsKind; // frontmatter lyricsType — drives the Lyrics node fields
  onDirty?: () => void;
}

export const RichEditor = forwardRef<RichEditorHandle, Props>(({ segments, type, lyricsType = 'jpop', onDirty }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: true, transformPastedText: true }),
      GalleryNode,
      LyricsNode,
      MusicCardNode,
      TastingNoteCardNode,
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
        else if (s.node?.name === 'PolaroidGalleryScrapbook')
          content.push({ type: 'gallery', attrs: { variant: 'polaroid', items: s.node.items ?? [] } });
        else if (s.node?.name === 'MusicCard')
          content.push({ type: 'musicCard' });
        else if (s.node?.name === 'TastingNoteCard')
          content.push({ type: 'tastingNoteCard' });
        else if (s.node?.name === 'Lyrics')
          content.push({ type: 'lyrics', attrs: { stanzas: s.node.stanzas ?? [], kind: lyricsType } });
        else
          content.push({ type: 'rawMdx', attrs: { src: s.src } });
      } else {
        // tiptap-markdown's parser.parse() returns an HTML string — convert it to
        // ProseMirror JSON via the live schema, else all prose is silently dropped.
        const html = md(editor).parser.parse(s.src);
        const body = new window.DOMParser().parseFromString(html, 'text/html').body;
        const json = PMDOMParser.fromSchema(editor.schema).parse(body).toJSON() as JSONContent;
        if (json.content) content.push(...json.content);
      }
    }
    editor.commands.setContent({ type: 'doc', content }, { emitUpdate: false });
    // lyricsType is only the initial kind for lifted Lyrics nodes; later changes are synced
    // by the node view (LyricsView effect), NOT by re-lifting — that would reset the doc.
  }, [editor, segments]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    getBody: () => (editor ? md(editor).getMarkdown() : ''),
    flushUploads: async () => {
      if (!editor) return;
      const jobs: { pos: number; items: GalleryItem[] }[] = [];
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
        const out: GalleryItem[] = [];
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
  return (
    <LyricsKindContext.Provider value={lyricsType}>
      <EditorContent editor={editor} className="editor-canvas" />
    </LyricsKindContext.Provider>
  );
});
