import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RichEditor, type RichEditorHandle } from '../components/RichEditor';
import { FrontmatterForm } from '../components/FrontmatterForm';
import { pendingMedia } from '../tiptap/pendingMedia';
import { api, createPostErrorMessage, type Frontmatter, publishErrorMessage, SLUG_RE } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EditorPage() {
  const id = useParams()['*'] ?? '';
  return !id || id === 'new' ? <NewPost /> : <EditExisting id={id} />;
}

// prod (no BLOG_CONTENT mounted) can't write the file server-side, so publishPost hands back the
// rendered MDX instead — trigger the browser's native save-file flow for it (no library needed).
function downloadMdx(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

// gates the NewPost 저장 button — same required-field shape the server checks, plus SLUG_RE so a
// normal user never round-trips to hit the server's 400 'invalid slug'. Pure + exported for testing
// without a renderer (mirrors Pager.tsx's computePage / ListState's extraction rationale).
export function canSaveNewPost(fm: Pick<Frontmatter, 'title' | 'category' | 'created'>, slug: string): boolean {
  return Boolean(fm.title?.trim() && fm.category && fm.created && SLUG_RE.test(slug));
}

// beforeunload only binds an imperative browser API (no React-derived-state equivalent exists), so
// this is a legitimate effect, not a watch-in-place-of-event antipattern.
function useDirtyGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}

// TODO: popstate 미차단, useBlocker 불가(BrowserRouter) — 단일 사용자 리스크 낮음, 라우터 마이그레이션 시 재검토
function confirmLeave(dirty: boolean): boolean {
  return !dirty || confirm('저장하지 않은 변경이 있습니다. 나가시겠어요?');
}

function NewPost() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const richRef = useRef<RichEditorHandle>(null);
  const [fm, setFm] = useState<Frontmatter>({ category: 'Web', title: '', created: '' });
  const [slug, setSlug] = useState('');
  const [dirty, setDirty] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const type = fm.category ?? 'web';
  const canSave = canSaveNewPost(fm, slug);

  useDirtyGuard(dirty);
  const update = (next: Frontmatter) => { setFm(next); setDirty(true); setCreateErr(null); };
  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setDirty(true);
    setCreateErr(null);
  };
  const handleBack = () => { if (confirmLeave(dirty)) navigate(-1); };

  const create = useMutation({
    mutationFn: async () => {
      await richRef.current?.flushUploads();
      const finalFm = await flushThumbnail(fm);
      setFm(finalFm);
      return api.createPost(finalFm, richRef.current?.getBody() ?? '', slug);
    },
    onMutate: () => setCreateErr(null),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      navigate(`/editor/${id}`, { replace: true });
    },
    onError: (err) => setCreateErr(createPostErrorMessage(err)),
  });

  const actions = (bar: boolean) => (
    <div className={bar ? 'row editor-save-bar' : 'row'}>
      <Button type="button" variant="outline" onClick={handleBack} data-testid="editor-back-button">← 뒤로</Button>
      <div className="flex items-center gap-[14px]">
        {createErr && <span className="editor-save-err">{createErr}</span>}
        <Button type="button" disabled={!canSave || create.isPending} onClick={() => create.mutate()} data-testid="editor-save-button">
          {create.isPending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  );
  return (
    <section className="editor-page">
      {actions(false)}
      <label className="field-label" htmlFor="new-post-slug">슬러그(URL 경로)</label>
      <Input
        id="new-post-slug"
        value={slug}
        onChange={handleSlugChange}
        placeholder="my-post-slug"
        data-testid="editor-slug-input"
      />
      <FrontmatterForm value={fm} onChange={update} />
      <label className="field-label">content</label>
      {/* key=type remounts so the slash palette reflects the chosen category */}
      <RichEditor key={type} ref={richRef} segments={[]} type={type} lyricsType={fm.lyricsType} onDirty={() => { setDirty(true); setCreateErr(null); }} />
      {actions(true)}
    </section>
  );
}

function EditExisting({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const doc = useQuery({ queryKey: ['doc', id], queryFn: () => api.getDoc(id), retry: false });
  const richRef = useRef<RichEditorHandle>(null);
  const [fm, setFm] = useState<Frontmatter | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [publishMsg, setPublishMsg] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);

  if (doc.data && fm === null) setFm(doc.data.frontmatter);
  const clearMsgs = () => { setSaveErr(null); setPublishMsg(null); };
  const update = (next: Frontmatter) => { setFm(next); setDirty(true); clearMsgs(); };

  useDirtyGuard(dirty);
  const handleBack = () => { if (confirmLeave(dirty)) navigate(-1); };

  const save = useMutation({
    mutationFn: async () => {
      await richRef.current?.flushUploads();
      const finalFm = await flushThumbnail(fm!);
      setFm(finalFm);
      return api.savePost(id, finalFm, richRef.current?.getBody() ?? '');
    },
    onMutate: () => setSaveErr(null),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: () => setSaveErr('저장 실패'),
  });

  const publish = useMutation({
    mutationFn: () => api.publishPost(id),
    onMutate: () => setPublishMsg(null),
    onSuccess: (result) => {
      if (result.mode === 'written') {
        setPublishMsg({ text: `발행됨 (${result.path})`, kind: 'ok' });
      } else {
        downloadMdx(result.filename, result.content);
        setPublishMsg({ text: `다운로드됨 (${result.filename}) — blog/ 콘텐츠에 넣고 직접 커밋하세요`, kind: 'ok' });
      }
    },
    onError: (err) => setPublishMsg({ text: publishErrorMessage(err), kind: 'err' }),
  });

  const type = fm?.category ?? 'web';

  const statusText = publishMsg
    ? publishMsg.text
    : save.isPending
      ? '저장 중…'
      : saveErr ?? (dirty ? '변경됨' : save.isSuccess ? '저장됨' : '');
  const statusClass = publishMsg
    ? (publishMsg.kind === 'ok' ? 'tasting-ai__savemsg' : 'editor-save-err')
    : (saveErr ? 'editor-save-err' : 'muted');

  const actions = (bar: boolean) => (
    <div className={bar ? 'row editor-save-bar' : 'row'}>
      <Button type="button" variant="outline" onClick={handleBack} data-testid="editor-back-button">← 뒤로</Button>
      <div className="flex items-center gap-[14px]">
        <span className={statusClass}>{statusText}</span>
        <Button
          type="button"
          variant="secondary"
          disabled={dirty || save.isPending || publish.isPending}
          onClick={() => publish.mutate()}
          data-testid="editor-publish-button"
        >
          {publish.isPending ? '발행 중…' : '발행'}
        </Button>
        <Button type="button" disabled={!dirty || save.isPending} onClick={() => save.mutate()} data-testid="editor-save-button">
          {save.isPending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  );
  return (
    <section className="editor-page">
      {actions(false)}
      {doc.isLoading && <p className="muted">불러오는 중…</p>}
      {doc.isError && <p className="muted">불러오기 실패</p>}
      {doc.data && fm && (
        <>
          <FrontmatterForm value={fm} onChange={update} />
          <label className="field-label">content</label>
          <RichEditor key={type} ref={richRef} segments={doc.data.segments} type={type} lyricsType={fm.lyricsType} onDirty={() => { setDirty(true); clearMsgs(); }} />
          {actions(true)}
        </>
      )}
    </section>
  );
}
