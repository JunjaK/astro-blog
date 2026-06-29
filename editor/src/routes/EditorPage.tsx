import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EditorCanvas } from '../components/EditorCanvas';
import { api } from '../lib/api';

export function EditorPage() {
  const id = useParams()['*'] ?? '';
  return !id || id === 'new' ? <NewPost /> : <EditExisting id={id} />;
}

function NewPost() {
  return (
    <section className="editor-page">
      <div className="row">
        <h1>새 글</h1>
        <button type="button" className="btn-primary" disabled>발행 (publish 단계)</button>
      </div>
      <EditorCanvas />
    </section>
  );
}

// frontmatter (between --- fences) + body. Lossless raw editing — no reverse
// parser, so custom MDX (DiaryCarousel, ImageLoader, …) survives untouched.
const FENCE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

function EditExisting({ id }: { id: string }) {
  const post = useQuery({ queryKey: ['post', id], queryFn: () => api.getPost(id), retry: false });
  const [fm, setFm] = useState('');
  const [body, setBody] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!post.data) return;
    const m = post.data.raw.match(FENCE);
    setFm(m ? m[1] : '');
    setBody(m ? m[2] : post.data.raw);
    setDirty(false);
  }, [post.data]);

  const save = useMutation({
    mutationFn: () => api.savePost(id, `---\n${fm}\n---\n${body}`),
    onSuccess: () => setDirty(false),
  });
  const edit = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  return (
    <section className="editor-page">
      <div className="row">
        <h1>{post.data?.title || id}</h1>
        <div>
          <span className="muted">{save.isPending ? '저장 중…' : dirty ? '변경됨' : save.isSuccess ? '저장됨' : ''}</span>{' '}
          <button type="button" className="btn-primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>저장</button>
        </div>
      </div>
      {post.isLoading && <p className="muted">불러오는 중…</p>}
      {post.isError && <p className="muted">불러오기 실패</p>}
      {post.data && (
        <>
          <label className="field-label">frontmatter</label>
          <textarea className="raw-mdx fm" value={fm} spellCheck={false} onChange={(e) => edit(setFm)(e.target.value)} />
          <label className="field-label">content (MDX)</label>
          <textarea className="raw-mdx" value={body} spellCheck={false} onChange={(e) => edit(setBody)(e.target.value)} />
        </>
      )}
    </section>
  );
}
