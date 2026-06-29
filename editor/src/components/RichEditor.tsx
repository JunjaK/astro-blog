import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import type { Editor, JSONContent } from '@tiptap/core';
import { GalleryNode } from '../tiptap/GalleryNode';
import { RawMdx } from '../tiptap/RawMdx';
import { SlashCommand } from '../tiptap/SlashCommand';

export interface Segment { kind: 'md' | 'raw'; src: string }
export interface RichEditorHandle { getBody: () => string }

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
  }), [editor]);

  if (!editor) return null;
  return <EditorContent editor={editor} className="editor-canvas" />;
});
