import { useParams } from 'react-router-dom';
import { EditorCanvas } from '../components/EditorCanvas';

export function EditorPage() {
  const { id } = useParams();
  return (
    <section className="editor-page">
      <div className="row">
        <h1>{id === 'new' ? '새 글' : `편집: ${id}`}</h1>
        <button type="button" className="btn-primary" disabled>
          발행 (마일스톤①)
        </button>
      </div>
      <EditorCanvas />
    </section>
  );
}
