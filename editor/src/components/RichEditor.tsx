import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import type { Editor, JSONContent } from '@tiptap/core';
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { GalleryNode, type GalleryItem } from '../tiptap/GalleryNode';
import { LyricsNode, type LyricStanza } from '../tiptap/LyricsNode';
import { MusicCardNode } from '../tiptap/MusicCardNode';
import { TastingNoteCardNode } from '../tiptap/TastingNoteCardNode';
import { MdxMedia } from '../tiptap/MdxMedia';
import { RawMdx } from '../tiptap/RawMdx';
import { SlashCommand } from '../tiptap/SlashCommand';
import { LyricsKindContext } from '../tiptap/LyricsKindContext';
import { attachMedia, mediaUpload, MediaNotUploadedError } from '../tiptap/mediaUploads';
import type { LyricsKind } from '../lib/api';

export interface Segment {
  kind: 'md' | 'raw';
  src: string;
  node?: { name: string; attrs?: Record<string, string>; items?: GalleryItem[]; stanzas?: LyricStanza[] };
}
export interface RichEditorHandle {
  getBody: () => string;
  flushUploads: () => Promise<void>; // wait out in-flight uploads; throws if any failed for good
}

// tiptap-markdown augments editor.storage at runtime but not in types.
interface MarkdownStorage {
  parser: { parse: (s: string) => string }; // returns rendered HTML, not a PM node
  getMarkdown: () => string;
}
const md = (e: Editor) => (e.storage as unknown as { markdown: MarkdownStorage }).markdown;

// Image files a drop/paste carries. HEIC has no browser preview but the server converts it on
// upload — same tolerance as MdxMedia's file picker (macOS drags often report an empty type).
const imageFiles = (dt: DataTransfer | null) =>
  Array.from(dt?.files ?? []).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));

// One ImageLoader block per file. attachMedia starts the upload right away; the node view shows
// the blob: preview and swaps to the /files/media src when it lands.
function insertImages(view: EditorView, files: File[], pos: number) {
  const nodes = files.map((f) =>
    view.state.schema.nodes.mdxMedia.create({ tag: 'ImageLoader', src: attachMedia(f), alt: '' }));
  view.dispatch(view.state.tr.replaceWith(pos, pos, nodes).scrollIntoView());
}

interface Props {
  // A NEW array identity means "load this document", and loading replaces whatever is in the
  // editor. Callers must pass a stable reference (query data, or a hoisted constant) — an inline
  // `[]` / `.map()` re-loads on every parent render and wipes what the user has typed.
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
    editorProps: {
      handlePaste: (view, event) => {
        const files = imageFiles(event.clipboardData);
        if (!files.length) return false; // text/html paste — let tiptap-markdown handle it
        insertImages(view, files, view.state.selection.from);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false; // internal node drag — PM moves it
        const files = imageFiles(event.dataTransfer);
        if (!files.length) return false;
        insertImages(view, files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from);
        return true;
      },
    },
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
    // Uploads already started at attach time; save only has to wait for whatever is still in
    // flight. The node views swap each src as its upload lands, so nothing is rewritten here.
    flushUploads: async () => {
      if (!editor) return;
      const waits: Promise<string>[] = [];
      const collect = (src: string) => { const u = mediaUpload(src); if (u) waits.push(u.promise); };
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'mdxMedia') collect(String(node.attrs.src));
        if (node.type.name === 'gallery') (node.attrs.items as GalleryItem[]).forEach((it) => collect(it.src));
      });
      await Promise.allSettled(waits);

      // Anything still on a blob: src failed to upload (or predates this session, via undo).
      // Serializing it would put a dead URL in the MDX — refuse the save instead.
      let orphan = false;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'mdxMedia' && String(node.attrs.src).startsWith('blob:')) orphan = true;
        if (node.type.name === 'gallery' && (node.attrs.items as GalleryItem[]).some((it) => it.src.startsWith('blob:'))) orphan = true;
      });
      if (orphan) throw new MediaNotUploadedError();
    },
  }), [editor]);

  if (!editor) return null;
  return (
    <LyricsKindContext.Provider value={lyricsType}>
      <EditorContent editor={editor} className="editor-canvas" />
    </LyricsKindContext.Provider>
  );
});
