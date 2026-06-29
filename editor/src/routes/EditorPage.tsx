import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RichEditor, type RichEditorHandle } from '../components/RichEditor';
import { FrontmatterForm } from '../components/FrontmatterForm';
import { pendingMedia } from '../tiptap/pendingMedia';
import { api, type Frontmatter } from '../lib/api';
import { Button } from '@/components/ui/button';

export function EditorPage() {
  const id = useParams()['*'] ?? '';
  return !id || id === 'new' ? <NewPost /> : <EditExisting id={id} />;
}

// Upload a pending thumbnail (blob:) chosen via ThumbnailInput → /files/media URL.
async function flushThumbnail(fm: Frontmatter): Promise<Frontmatter> {
  const t = fm.thumbnail;
  if (t?.startsWith('blob:') && pendingMedia.has(t)) {
    const { src } = await api.uploadMedia(pendingMedia.get(t)!);
    URL.revokeObjectURL(t);
    pendingMedia.delete(t);
    return { ...fm, thumbnail: src };
  }
  return fm;
}

function NewPost() {
  // POST /posts (create) lands with the publish step. For now: fill the form + write.
  const navigate = useNavigate();
  const richRef = useRef<RichEditorHandle>(null);
  const [fm, setFm] = useState<Frontmatter>({ category: 'web', title: '', created: '' });
  const type = fm.category ?? 'web';
  const actions = (
    <div className="row">
      <Button type="button" variant="outline" size="sm" onClick={() => navigate(-1)}>← 뒤로</Button>
      <Button type="button" size="sm" disabled>저장</Button>
    </div>
  );
  return (
    <section className="editor-page">
      {actions}
      <FrontmatterForm value={fm} onChange={setFm} />
      <label className="field-label">content</label>
      {/* key=type remounts so the slash palette reflects the chosen category */}
      <RichEditor key={type} ref={richRef} segments={[]} type={type} />
      {actions}
    </section>
  );
}

function EditExisting({ id }: { id: string }) {
  const navigate = useNavigate();
  const doc = useQuery({ queryKey: ['doc', id], queryFn: () => api.getDoc(id), retry: false });
  const richRef = useRef<RichEditorHandle>(null);
  const [fm, setFm] = useState<Frontmatter | null>(null);
  const [dirty, setDirty] = useState(false);

  if (doc.data && fm === null) setFm(doc.data.frontmatter);
  const update = (next: Frontmatter) => { setFm(next); setDirty(true); };

  const save = useMutation({
    mutationFn: async () => {
      await richRef.current?.flushUploads();
      const finalFm = await flushThumbnail(fm!);
      setFm(finalFm);
      return api.savePost(id, finalFm, richRef.current?.getBody() ?? '');
    },
    onSuccess: () => setDirty(false),
  });

  const type = fm?.category ?? 'web';

  const actions = (
    <div className="row">
      <Button type="button" variant="outline" size="sm" onClick={() => navigate(-1)}>← 뒤로</Button>
      <div className="flex items-center gap-3">
        <span className="muted">{save.isPending ? '저장 중…' : dirty ? '변경됨' : save.isSuccess ? '저장됨' : ''}</span>
        <Button type="button" size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>저장</Button>
      </div>
    </div>
  );
  return (
    <section className="editor-page">
      {actions}
      {doc.isLoading && <p className="muted">불러오는 중…</p>}
      {doc.isError && <p className="muted">불러오기 실패</p>}
      {doc.data && fm && (
        <>
          <FrontmatterForm value={fm} onChange={update} />
          <label className="field-label">content</label>
          <RichEditor key={type} ref={richRef} segments={doc.data.segments} type={type} onDirty={() => setDirty(true)} />
          {actions}
        </>
      )}
    </section>
  );
}
