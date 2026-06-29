import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { GalleryNode, type GalleryVariant } from '../tiptap/GalleryNode';

// Skeleton TipTap canvas. Milestone ① swaps StarterKit for the Novel-based Notion
// UI + custom nodes and wires prosemirror-markdown serialization.
export function EditorCanvas() {
  const editor = useEditor({
    extensions: [StarterKit, GalleryNode],
    content: '<h1>제목을 입력하세요</h1><p>여기에 작성을 시작하세요…</p>',
  });

  const insertGallery = (variant: GalleryVariant) =>
    editor?.chain().focus().insertContent({ type: 'gallery', attrs: { variant, items: [] } }).run();

  if (!editor) return null;

  return (
    <div>
      <div className="editor-toolbar">
        <button type="button" onClick={() => insertGallery('carousel')}>+ 갤러리(캐러셀)</button>
        <button type="button" onClick={() => insertGallery('polaroid')}>+ 갤러리(폴라로이드)</button>
      </div>
      <EditorContent editor={editor} className="editor-canvas" />
    </div>
  );
}
