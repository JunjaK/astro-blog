import type { Sake, SakeInput, TokuteiMeisho } from '../../lib/api';
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
import { TagInput } from '../../components/fields';
import { api, TOKUTEI_MEISHO } from '../../lib/api';
import { countLabel, EditOverlay, EditorActions, EditorMsg, errStatus, Field, type Msg, num, SearchBar, str } from './shared';

interface SakeForm {
  name: string;
  yomigana: string;
  brand: string;
  brandYomigana: string;
  brewery: string;
  tokuteiMeisho: TokuteiMeisho | '';
  riceType: string[];
  seimaiBuai: string;
  alcohol: string;
  nihonshuDo: string;
  sando: string;
  note: string;
}

const EMPTY_SAKE: SakeForm = {
  name: '', yomigana: '', brand: '', brandYomigana: '', brewery: '', tokuteiMeisho: '', riceType: [],
  seimaiBuai: '', alcohol: '', nihonshuDo: '', sando: '', note: '',
};

function sakeToForm(s: Sake): SakeForm {
  return {
    name: s.name,
    yomigana: s.yomigana ?? '',
    brand: s.brand ?? '',
    brandYomigana: s.brandYomigana ?? '',
    brewery: s.brewery ?? '',
    tokuteiMeisho: s.tokuteiMeisho ?? '',
    riceType: s.riceType,
    seimaiBuai: str(s.seimaiBuai),
    alcohol: str(s.alcohol),
    nihonshuDo: str(s.nihonshuDo),
    sando: str(s.sando),
    note: s.note ?? '',
  };
}

// PUT은 full body(신규 필드 포함) — 생략 시 조용한 unlink/clear 방지.
function sakeToInput(f: SakeForm): SakeInput {
  return {
    name: f.name.trim(),
    yomigana: f.yomigana.trim() || null,
    brand: f.brand.trim() || null,
    brandYomigana: f.brandYomigana.trim() || null,
    brewery: f.brewery.trim() || null,
    tokuteiMeisho: f.tokuteiMeisho === '' ? null : f.tokuteiMeisho,
    riceType: f.riceType,
    seimaiBuai: num(f.seimaiBuai),
    alcohol: num(f.alcohol),
    nihonshuDo: num(f.nihonshuDo),
    sando: num(f.sando),
    note: f.note.trim() || null,
  };
}

// ── 목록 ──

export function SakeList() {
  // 키에 쿼리 미포함 = q 생략 전량 로드, 필터는 클라이언트.
  const list = useQuery({ queryKey: ['sakes'], queryFn: () => api.searchSakes(), retry: false });

  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  const items = list.data ?? [];
  const appliedTrim = appliedQuery.trim();
  const hasQuery = appliedTrim.length > 0;
  const qLower = appliedTrim.toLowerCase();
  const filtered = hasQuery
    ? items.filter((s) => `${s.name} ${s.brand ?? ''} ${s.brewery ?? ''}`.toLowerCase().includes(qLower))
    : items;
  const pager = usePager(filtered);

  const applySearch = () => { setAppliedQuery(searchInput); pager.reset(); };
  const resetSearch = () => { setSearchInput(''); setAppliedQuery(''); pager.reset(); };

  return (
    <>
      <div className="row">
        <h1 className="page-title"><span>사케</span><span className="page-title__count">{countLabel(!!list.data, items.length, filtered.length, hasQuery)}</span></h1>
        <Link to="new" className={buttonVariants({})} data-testid="sakes-add-button"><Plus className="size-4" />추가</Link>
      </div>

      <SearchBar
        input={searchInput}
        onInput={setSearchInput}
        onSubmit={applySearch}
        onReset={resetSearch}
        showReset={hasQuery}
        placeholder="사케명·양조장 검색"
      />

      <ListState
        isLoading={list.isLoading}
        isError={list.isError}
        total={items.length}
        shown={filtered.length}
        query={appliedQuery}
        emptyText="아직 등록된 사케가 없습니다. 시음노트를 저장하면 자동으로 쌓이거나 '+ 추가'로 등록하세요."
      />
      {pager.visible.length > 0 && (
        <ul className="post-table sakes-list">
          {pager.visible.map((s, i) => (
            <li key={s.id}>
              <Link className="row-btn" to={s.id} data-testid={`sakes-row-${i}`}>
                <span className="post-cat">{s.brewery ?? '—'}</span>
                <span className="post-title">{s.name}</span>
                {(s.tokuteiMeisho || s.seimaiBuai !== null) && (
                  <span className="row-meta">
                    {[s.tokuteiMeisho, s.seimaiBuai !== null ? `정미 ${s.seimaiBuai}%` : null].filter(Boolean).join(' · ')}
                  </span>
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

// gate: id/쿼리 상태만 보고 불러오는중/삭제됨/폼 중 무엇을 보여줄지 결정. 자체 폼 상태가 없어
// list.data가 늦게 도착해도(직접 진입·새로고침) 항상 최신값을 반영한다.
export function SakeEdit({ id }: { id: string }) {
  const navigate = useNavigate();
  const list = useQuery({ queryKey: ['sakes'], queryFn: () => api.searchSakes(), retry: false });
  const isNew = id === 'new';
  const goBack = () => navigate('..');

  if (!isNew && list.isLoading) {
    return <EditOverlay kind="SAKE" title="불러오는 중…" onBack={goBack}><p className="muted">불러오는 중…</p></EditOverlay>;
  }
  const existing = isNew ? null : (list.data?.find((s) => s.id === id) ?? null);
  if (!isNew && !existing) {
    return (
      <EditOverlay kind="SAKE" title="이미 삭제된 항목입니다" onBack={goBack}>
        <p className="muted sakes-empty">이미 삭제된 항목입니다.</p>
      </EditOverlay>
    );
  }
  // key: id가 바뀌면(행 전환) 폼을 완전히 새로 마운트해 useState 초기화가 다시 돈다(effect 없이).
  return <SakeEditForm key={id} id={id} isNew={isNew} initial={existing} />;
}

function SakeEditForm({ id, isNew, initial }: { id: string; isNew: boolean; initial: Sake | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<SakeForm>(() => (initial ? sakeToForm(initial) : EMPTY_SAKE));
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  // v2: 사케는 브랜드에, 브랜드는 양조장에 매달린다 → 양조장 없이는 저장 자체가 불가(서버도 400).
  // 버튼을 미리 잠가서 400을 맞고 나서야 알게 되는 걸 막는다.
  const canSave = dirty && form.name.trim().length > 0 && form.brewery.trim().length > 0;
  const update = (patch: Partial<SakeForm>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };
  const goBack = () => navigate('..');

  const save = useMutation({
    mutationFn: async (): Promise<{ created: Sake | null }> => {
      const input = sakeToInput(form);
      if (isNew) return { created: (await api.upsertSake(input)).sake };
      await api.updateSake(id, input);
      return { created: null };
    },
    onSuccess: ({ created }) => {
      if (created) qc.setQueryData<Sake[]>(['sakes'], (old) => (old ? [...old, created] : [created]));
      qc.invalidateQueries({ queryKey: ['sakes'] });
      setDirty(false);
      setMsg({ text: '저장됨', kind: 'ok' });
      // 신규 생성 성공 시 'new' → 발급된 id로 옮겨 편집기 안에 머문다(이력에 'new'를 남기지 않음).
      if (created) navigate(`../${created.id}`, { replace: true });
    },
    onError: (err) => {
      if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['sakes'] });
        navigate('..', { replace: true });
      } else if (errStatus(err) === 400) {
        // 서버가 브랜드를 추측하지 않고 거절한 경우(그 양조장에 브랜드가 2개 이상) — 조용히 아무
        // 브랜드에나 붙이는 대신 400을 준다. 무엇을 해야 하는지 사용자에게 그대로 알린다.
        setMsg({ text: '이 양조장은 브랜드가 여러 개라 어느 브랜드인지 지정해야 합니다.', kind: 'block' });
      } else {
        setMsg({ text: '저장에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const del = useMutation({
    mutationFn: (targetId: string) => api.deleteSake(targetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sakes'] });
      navigate('..', { replace: true });
    },
    onError: (err) => {
      if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['sakes'] });
        navigate('..', { replace: true });
      } else {
        setMsg({ text: '삭제에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const onDelete = () => {
    if (isNew) return;
    // eslint-disable-next-line no-alert -- 조용한 파괴 금지: 명시 confirm (persona 하드라인)
    if (!confirm(`${form.name.trim()} 사케를 삭제할까요?`)) return;
    del.mutate(id);
  };

  return (
    <EditOverlay kind="SAKE" title={isNew ? '새 항목' : (form.name || '(이름 없음)')} onBack={goBack}>
      <div className="sake-editor" data-testid="sakes-editor">
        <div className="sake-editor__grid">
          <div className="sake-editor__full">
            <Field label="이름 *">
              <Input value={form.name} placeholder="사케명" data-testid="sakes-editor-name-input" onChange={(e) => update({ name: e.target.value })} />
            </Field>
          </div>
          <div className="sake-editor__full">
            <Field label="술이름 요미가나">
              <Input value={form.yomigana} placeholder="히라가나" onChange={(e) => update({ yomigana: e.target.value })} />
            </Field>
          </div>
          <Field label="브랜드(銘柄)">
            <Input value={form.brand} placeholder="예: 獺祭" onChange={(e) => update({ brand: e.target.value })} />
          </Field>
          <Field label="브랜드 요미가나">
            <Input value={form.brandYomigana} placeholder="히라가나" onChange={(e) => update({ brandYomigana: e.target.value })} />
          </Field>
          <div className="sake-editor__full">
            <Field label="양조장(酒蔵) *">
              <Input
                value={form.brewery}
                placeholder="양조장 이름 (필수 — 브랜드가 여기 매달립니다)"
                data-testid="sakes-editor-brewery-input"
                onChange={(e) => update({ brewery: e.target.value })}
              />
            </Field>
          </div>
          <Field label="특정명칭(特定名称)">
            <Select value={form.tokuteiMeisho || null} onValueChange={(v) => update({ tokuteiMeisho: (v || '') as TokuteiMeisho | '' })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="특정명칭 선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">(없음)</SelectItem>
                {TOKUTEI_MEISHO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="정미보합(精米歩合, %)">
            <Input type="number" min={0} max={100} value={form.seimaiBuai} onChange={(e) => update({ seimaiBuai: e.target.value })} />
          </Field>
          <div className="sake-editor__full">
            <Field label="원료미(酒米)">
              <TagInput value={form.riceType} onChange={(riceType) => update({ riceType })} placeholder="쌀 품종 추가…" />
            </Field>
          </div>
          <Field label="도수(%)">
            <Input type="number" min={0} step={0.1} value={form.alcohol} onChange={(e) => update({ alcohol: e.target.value })} />
          </Field>
          <Field label="일본주도(日本酒度)">
            <Input type="number" step={0.1} value={form.nihonshuDo} onChange={(e) => update({ nihonshuDo: e.target.value })} />
          </Field>
          <Field label="산도(酸度)">
            <Input type="number" min={0} step={0.1} value={form.sando} onChange={(e) => update({ sando: e.target.value })} />
          </Field>
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
          onSave={() => save.mutate()}
          onDelete={onDelete}
        />
      </div>
    </EditOverlay>
  );
}
