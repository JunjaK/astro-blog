import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// Skeleton TipTap canvas. Milestone ① replaces StarterKit with the Novel-based
// Notion UI + custom nodes (image=/files/media, mermaid, math, rawMdx) and wires
// prosemirror-markdown serialization. For now it proves the editor renders.
export function EditorCanvas() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<h1>제목을 입력하세요</h1><p>여기에 작성을 시작하세요…</p>',
  });

  return <EditorContent editor={editor} className="editor-canvas" />;
}
