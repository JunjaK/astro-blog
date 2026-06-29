import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { GalleryNode } from '../tiptap/GalleryNode';
import { SlashCommand } from '../tiptap/SlashCommand';

// Notion-style: type "/" for the block menu (headings, lists, code, galleries, AI).
export function EditorCanvas() {
  const editor = useEditor({
    extensions: [StarterKit, GalleryNode, SlashCommand],
    content: '<h1>제목을 입력하세요</h1><p>"/" 를 입력해 블록을 추가하세요…</p>',
  });

  if (!editor) return null;
  return <EditorContent editor={editor} className="editor-canvas" />;
}
