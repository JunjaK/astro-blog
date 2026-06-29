import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RichEditor, type RichEditorHandle } from '../components/RichEditor';
import { api } from '../lib/api';

export function EditorPage() {
  const id = useParams()['*'] ?? '';
  return !id || id === 'new' ? <NewPost /> : <EditExisting id={id} />;
}

const CATEGORIES = ['daily', 'diary', 'game', 'music', 'web'];

function NewPost() {
  // POST /posts (create) lands with the publish step. For now: pick type + write.
  const richRef = useRef<RichEditorHandle>(null);
  const [type, setType] = useState('web');
  return (
    <section className="editor-page">
      <div className="row">
        <div className="title-row">
          <h1>새 글</h1>
          <select className="type-select" value={type} onChange={(e) => setType(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button type="button" className="btn-primary" disabled>저장 (create 단계)</button>
      </div>
      {/* key=type remounts so the slash palette reflects the chosen type */}
      <RichEditor key={type} ref={richRef} segments={[]} type={type} />
    </section>
  );
}

// Uniform rich editing for any post: frontmatter (YAML) + content (prose rich,
// component blocks preserved). type drives the slash component palette.
function EditExisting({ id }: { id: string }) {
  const doc = useQuery({ queryKey: ['doc', id], queryFn: () => api.getDoc(id), retry: false });
  const richRef = useRef<RichEditorHandle>(null);
  const [fm, setFm] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // seed frontmatter once loaded
  if (doc.data && fm === null) setFm(doc.data.frontmatterYaml);

  const save = useMutation({
    mutationFn: () => api.savePost(id, `---\n${fm}\n---\n\n${richRef.current?.getBody() ?? ''}`),
    onSuccess: () => setDirty(false),
  });

  return (
    <section className="editor-page">
      <div className="row">
        <h1>{id}</h1>
        <div>
          <span className="muted">{save.isPending ? '저장 중…' : dirty ? '변경됨' : save.isSuccess ? '저장됨' : ''}</span>{' '}
          <button type="button" className="btn-primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>저장</button>
        </div>
      </div>
      {doc.isLoading && <p className="muted">불러오는 중…</p>}
      {doc.isError && <p className="muted">불러오기 실패</p>}
      {doc.data && fm !== null && (
        <>
          <label className="field-label">frontmatter · {doc.data.category}</label>
          <textarea className="raw-mdx fm" value={fm} spellCheck={false} onChange={(e) => { setFm(e.target.value); setDirty(true); }} />
          <label className="field-label">content</label>
          <RichEditor ref={richRef} segments={doc.data.segments} type={doc.data.category} onDirty={() => setDirty(true)} />
        </>
      )}
    </section>
  );
}
