import type { Brewery, BreweryInput } from '../../lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListState } from '@/components/ListState';
import { Pager, usePager } from '@/components/Pager';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, PREFECTURES, SakeRefError } from '../../lib/api';
import { countLabel, EditOverlay, EditorActions, EditorMsg, errStatus, Field, type Msg, SearchBar } from './shared';

interface BreweryForm { name: string; yomigana: string; prefecture: string; address: string; note: string }
const EMPTY_BREWERY: BreweryForm = { name: '', yomigana: '', prefecture: '', address: '', note: '' };
const breweryToForm = (b: Brewery): BreweryForm => ({
  name: b.name,
  yomigana: b.yomigana ?? '',
  prefecture: b.prefecture ?? '',
  address: b.address ?? '',
  note: b.note ?? '',
});
const breweryToInput = (f: BreweryForm): BreweryInput => ({
  name: f.name.trim(),
  yomigana: f.yomigana.trim() || null,
  prefecture: f.prefecture || null,
  address: f.address.trim() || null,
  note: f.note.trim() || null,
});

// ── 목록 ──

export function BreweryList() {
  const list = useQuery({ queryKey: ['breweries'], queryFn: () => api.searchBreweries(), retry: false });

  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  const items = list.data ?? [];
  const appliedTrim = appliedQuery.trim();
  const hasQuery = appliedTrim.length > 0;
  const qLower = appliedTrim.toLowerCase();
  const filtered = hasQuery
    ? items.filter((b) => `${b.name} ${b.prefecture ?? ''} ${b.address ?? ''}`.toLowerCase().includes(qLower))
    : items;
  const pager = usePager(filtered);

  const applySearch = () => { setAppliedQuery(searchInput); pager.reset(); };
  const resetSearch = () => { setSearchInput(''); setAppliedQuery(''); pager.reset(); };

  return (
    <>
      <div className="row">
        <h1>양조장 {countLabel(!!list.data, items.length, filtered.length, hasQuery)}</h1>
        <Link to="new" className={buttonVariants({})} data-testid="sakes-add-button"><Plus className="size-4" />추가</Link>
      </div>

      <SearchBar
        input={searchInput}
        onInput={setSearchInput}
        onSubmit={applySearch}
        onReset={resetSearch}
        showReset={hasQuery}
        placeholder="양조장명·주소 검색"
      />

      <ListState
        isLoading={list.isLoading}
        isError={list.isError}
        total={items.length}
        shown={filtered.length}
        query={appliedQuery}
        emptyText="아직 등록된 양조장이 없습니다. 사케를 등록하면 자동으로 쌓이거나 '+ 추가'로 등록하세요."
      />
      {pager.visible.length > 0 && (
        <ul className="post-table sakes-list">
          {pager.visible.map((b, i) => (
            <li key={b.id}>
              <Link className="row-btn" to={b.id} data-testid={`sakes-row-${i}`}>
                <span className="post-title">{b.name}</span>
                {(b.prefecture || b.address) && (
                  <span className="row-meta">{[b.prefecture, b.address].filter(Boolean).join(' · ')}</span>
                )}
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

export function BreweryEdit({ id }: { id: string }) {
  const navigate = useNavigate();
  const list = useQuery({ queryKey: ['breweries'], queryFn: () => api.searchBreweries(), retry: false });
  const isNew = id === 'new';
  const goBack = () => navigate('..');

  if (!isNew && list.isLoading) {
    return <EditOverlay kind="BREWERY" title="불러오는 중…" onBack={goBack}><p className="muted">불러오는 중…</p></EditOverlay>;
  }
  const existing = isNew ? null : (list.data?.find((b) => b.id === id) ?? null);
  if (!isNew && !existing) {
    return (
      <EditOverlay kind="BREWERY" title="이미 삭제된 항목입니다" onBack={goBack}>
        <p className="muted sakes-empty">이미 삭제된 항목입니다.</p>
      </EditOverlay>
    );
  }
  return <BreweryEditForm key={id} id={id} isNew={isNew} initial={existing} />;
}

function BreweryEditForm({ id, isNew, initial }: { id: string; isNew: boolean; initial: Brewery | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<BreweryForm>(() => (initial ? breweryToForm(initial) : EMPTY_BREWERY));
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const canSave = dirty && form.name.trim().length > 0;
  const update = (patch: Partial<BreweryForm>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };
  const goBack = () => navigate('..');

  const save = useMutation({
    mutationFn: async (): Promise<{ created: Brewery | null }> => {
      const input = breweryToInput(form);
      if (isNew) return { created: (await api.upsertBrewery(input)).brewery };
      await api.updateBrewery(id, input);
      return { created: null };
    },
    onSuccess: ({ created }) => {
      if (created) qc.setQueryData<Brewery[]>(['breweries'], (old) => (old ? [...old, created] : [created]));
      qc.invalidateQueries({ queryKey: ['breweries'] });
      setDirty(false);
      setMsg({ text: '저장됨', kind: 'ok' });
      if (created) navigate(`../${created.id}`, { replace: true });
    },
    onError: (err) => {
      if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['breweries'] });
        navigate('..', { replace: true });
      } else {
        setMsg({ text: '저장에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const del = useMutation({
    mutationFn: (targetId: string) => api.deleteBrewery(targetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breweries'] });
      navigate('..', { replace: true });
    },
    onError: (err) => {
      // 409: 참조 존재 → blocking 인라인 메시지 (조용한 데이터 손실 금지).
      // v2에서 양조장을 물고 있는 건 사케가 아니라 브랜드다 (사케는 브랜드에 매달린다).
      if (err instanceof SakeRefError) {
        setMsg({ text: `이 양조장은 브랜드 ${err.count}개가 참조 중이라 삭제할 수 없습니다. 「브랜드」 탭에서 먼저 정리하세요.`, kind: 'block' });
      } else if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['breweries'] });
        navigate('..', { replace: true });
      } else {
        setMsg({ text: '삭제에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const onDelete = () => {
    if (isNew) return;
    // eslint-disable-next-line no-alert -- 조용한 파괴 금지: 명시 confirm (persona 하드라인)
    if (!confirm(`${form.name.trim()} 양조장을 삭제할까요?`)) return;
    del.mutate(id);
  };

  return (
    <EditOverlay kind="BREWERY" title={isNew ? '새 항목' : (form.name || '(이름 없음)')} onBack={goBack}>
      <div className="sake-editor" data-testid="sakes-editor">
        <div className="sake-editor__grid">
          <div className="sake-editor__full">
            <Field label="이름 *">
              <Input value={form.name} placeholder="양조장 이름" data-testid="sakes-editor-name-input" onChange={(e) => update({ name: e.target.value })} />
            </Field>
          </div>
          <Field label="요미가나(읽기)">
            <Input value={form.yomigana} placeholder="히라가나" onChange={(e) => update({ yomigana: e.target.value })} />
          </Field>
          <Field label="도도부현(都道府県)">
            <Select value={form.prefecture || null} onValueChange={(v) => update({ prefecture: v || '' })}>
              <SelectTrigger className="w-full" data-testid="sakes-editor-prefecture-select">
                <SelectValue placeholder="도도부현 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">(없음)</SelectItem>
                {PREFECTURES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="sake-editor__full">
            <Field label="세부 주소(住所)">
              <Input
                value={form.address}
                placeholder="예: にかほ市平沢字中町59"
                data-testid="sakes-editor-address-input"
                onChange={(e) => update({ address: e.target.value })}
              />
            </Field>
          </div>
          <div className="sake-editor__full">
            <Field label="메모">
              <Textarea value={form.note} onChange={(e) => update({ note: e.target.value })} />
            </Field>
          </div>
        </div>
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
