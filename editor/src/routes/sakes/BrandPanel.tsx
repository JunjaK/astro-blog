import type { Brand, BrandInput } from '../../lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListState } from '@/components/ListState';
import { Pager, usePager } from '@/components/Pager';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, SakeRefError } from '../../lib/api';
import { countLabel, EditOverlay, EditorActions, EditorMsg, errStatus, Field, type Msg, SearchBar } from './shared';

interface BrandForm { name: string; yomigana: string; brewery: string; note: string }
const EMPTY_BRAND: BrandForm = { name: '', yomigana: '', brewery: '', note: '' };
const brandToForm = (b: Brand): BrandForm => ({
  name: b.name,
  yomigana: b.yomigana ?? '',
  brewery: b.brewery ?? '',
  note: b.note ?? '',
});
const brandToInput = (f: BrandForm): BrandInput => ({
  name: f.name.trim(),
  yomigana: f.yomigana.trim() || null,
  brewery: f.brewery.trim(),
  note: f.note.trim() || null,
});

// ── 목록 ──

export function BrandList() {
  const list = useQuery({ queryKey: ['brands'], queryFn: () => api.searchBrands(), retry: false });

  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  const items = list.data ?? [];
  const appliedTrim = appliedQuery.trim();
  const hasQuery = appliedTrim.length > 0;
  const qLower = appliedTrim.toLowerCase();
  const filtered = hasQuery
    ? items.filter((b) => `${b.name} ${b.yomigana ?? ''} ${b.brewery ?? ''}`.toLowerCase().includes(qLower))
    : items;
  const pager = usePager(filtered);

  const applySearch = () => { setAppliedQuery(searchInput); pager.reset(); };
  const resetSearch = () => { setSearchInput(''); setAppliedQuery(''); pager.reset(); };

  return (
    <>
      <div className="row">
        <h1>브랜드 {countLabel(!!list.data, items.length, filtered.length, hasQuery)}</h1>
        <Link to="new" className={buttonVariants({})} data-testid="sakes-add-button">+ 추가</Link>
      </div>

      <SearchBar
        input={searchInput}
        onInput={setSearchInput}
        onSubmit={applySearch}
        onReset={resetSearch}
        showReset={hasQuery}
        placeholder="브랜드명·요미가나·양조장 검색"
      />

      <ListState
        isLoading={list.isLoading}
        isError={list.isError}
        total={items.length}
        shown={filtered.length}
        query={appliedQuery}
        emptyText="아직 등록된 브랜드가 없습니다. 사케를 등록하면 자동으로 쌓이거나 '+ 추가'로 등록하세요."
      />
      {pager.visible.length > 0 && (
        <ul className="post-table sakes-list">
          {pager.visible.map((b, i) => (
            <li key={b.id}>
              <Link className="row-btn" to={b.id} data-testid={`sakes-row-${i}`}>
                <span className="post-title">{b.name}</span>
                {b.brewery && <span className="slash-hint">{b.brewery}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager remaining={pager.remaining} onMore={pager.more} />
    </>
  );
}

// ── 편집 (라우트 :id 자식) ──

export function BrandEdit({ id }: { id: string }) {
  const navigate = useNavigate();
  const list = useQuery({ queryKey: ['brands'], queryFn: () => api.searchBrands(), retry: false });
  const isNew = id === 'new';
  const goBack = () => navigate('..');

  if (!isNew && list.isLoading) {
    return <EditOverlay title="불러오는 중…" onBack={goBack}><p className="muted">불러오는 중…</p></EditOverlay>;
  }
  const existing = isNew ? null : (list.data?.find((b) => b.id === id) ?? null);
  if (!isNew && !existing) {
    return (
      <EditOverlay title="이미 삭제된 항목입니다" onBack={goBack}>
        <p className="muted sakes-empty">이미 삭제된 항목입니다.</p>
      </EditOverlay>
    );
  }
  return <BrandEditForm key={id} id={id} isNew={isNew} initial={existing} />;
}

function BrandEditForm({ id, isNew, initial }: { id: string; isNew: boolean; initial: Brand | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<BrandForm>(() => (initial ? brandToForm(initial) : EMPTY_BRAND));
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  // 브랜드는 양조장 없이 존재할 수 없다 → 둘 다 필수.
  const canSave = dirty && form.name.trim().length > 0 && form.brewery.trim().length > 0;
  const update = (patch: Partial<BrandForm>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };
  const goBack = () => navigate('..');

  const save = useMutation({
    mutationFn: async (): Promise<{ created: Brand | null }> => {
      const input = brandToInput(form);
      if (isNew) return { created: (await api.upsertBrand(input)).brand };
      await api.updateBrand(id, input);
      return { created: null };
    },
    onSuccess: ({ created }) => {
      // 브랜드를 고치면 양조장이 새로 생겼을 수 있고(find-or-create), 사케의 조인 표시도 바뀐다.
      if (created) qc.setQueryData<Brand[]>(['brands'], (old) => (old ? [...old, created] : [created]));
      qc.invalidateQueries({ queryKey: ['brands'] });
      qc.invalidateQueries({ queryKey: ['breweries'] });
      qc.invalidateQueries({ queryKey: ['sakes'] });
      setDirty(false);
      setMsg({ text: '저장됨', kind: 'ok' });
      if (created) navigate(`../${created.id}`, { replace: true });
    },
    onError: (err) => {
      if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['brands'] });
        navigate('..', { replace: true });
      } else {
        setMsg({ text: '저장에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const del = useMutation({
    mutationFn: (targetId: string) => api.deleteBrand(targetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      qc.invalidateQueries({ queryKey: ['breweries'] });
      navigate('..', { replace: true });
    },
    onError: (err) => {
      if (err instanceof SakeRefError) {
        setMsg({ text: `이 브랜드는 사케 ${err.count}개가 참조 중이라 삭제할 수 없습니다. 먼저 해당 사케를 변경/삭제하세요.`, kind: 'block' });
      } else if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['brands'] });
        navigate('..', { replace: true });
      } else {
        setMsg({ text: '삭제에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const onDelete = () => {
    if (isNew) return;
    // eslint-disable-next-line no-alert -- 조용한 파괴 금지: 명시 confirm (persona 하드라인)
    if (!confirm(`${form.name.trim()} 브랜드를 삭제할까요?`)) return;
    del.mutate(id);
  };

  return (
    <EditOverlay title={isNew ? '새 항목' : (form.name || '(이름 없음)')} onBack={goBack}>
      <div className="sake-editor" data-testid="sakes-editor">
        <Field label="이름 *">
          <Input value={form.name} placeholder="예: 獺祭" data-testid="sakes-editor-name-input" onChange={(e) => update({ name: e.target.value })} />
        </Field>
        <Field label="요미가나(읽기)">
          <Input value={form.yomigana} placeholder="히라가나" onChange={(e) => update({ yomigana: e.target.value })} />
        </Field>
        <Field label="양조장(酒蔵) *">
          <Input
            value={form.brewery}
            placeholder="양조장 이름 (없으면 새로 생성됩니다)"
            data-testid="sakes-editor-brewery-input"
            onChange={(e) => update({ brewery: e.target.value })}
          />
        </Field>
        <Field label="메모">
          <Textarea value={form.note} onChange={(e) => update({ note: e.target.value })} />
        </Field>
        <EditorMsg msg={msg} />
        <EditorActions
          isNew={isNew}
          canSave={canSave}
          pending={save.isPending}
          onCancel={goBack}
          onSave={() => save.mutate()}
          onDelete={onDelete}
        />
      </div>
    </EditOverlay>
  );
}
