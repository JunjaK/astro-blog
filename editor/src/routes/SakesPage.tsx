import type { ReactNode } from 'react';
import type { Brand, BrandInput, Brewery, BreweryInput, Sake, SakeInput, TokuteiMeisho } from '../lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '../components/fields';
import { api, PREFECTURES, SakeRefError, TOKUTEI_MEISHO } from '../lib/api';

// editId sentinel: null = 편집기 닫힘, 'new' = 신규 추가, string = 기존 행 편집.
type EditId = string | 'new' | null;
interface Msg { text: string; kind: 'ok' | 'err' | 'block' }

// 제네릭 req<T>는 상태코드를 문자열 메시지로 접으므로 message 선두 3자리로 상태를 복원한다.
// 404 → 리스트 재조회, 5xx → 제네릭 인라인 메시지. (409 brewery는 SakeRefError로 별도 처리)
function errStatus(err: unknown): number {
  return err instanceof Error ? Number(err.message.slice(0, 3)) : 0;
}

const num = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
};
const str = (n: number | null): string => (n === null ? '' : String(n));

// ── 공용 leaf ──

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sake-editor__field">
      <Label className="text-muted-foreground text-xs font-normal">{label}</Label>
      {children}
    </div>
  );
}

// 2변수 검색: input(바인딩) + applied(필터 소스). Enter/「검색」에서만 apply, 「초기화」는 노출 시에만.
function SearchBar({ input, onInput, onSubmit, onReset, showReset, placeholder }: {
  input: string;
  onInput: (v: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  showReset: boolean;
  placeholder: string;
}) {
  return (
    <div className="sakes-search">
      <Input
        className="sakes-search__input"
        value={input}
        placeholder={placeholder}
        data-testid="sakes-search-input"
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } }}
      />
      <Button type="button" onClick={onSubmit} data-testid="sakes-search-submit">검색</Button>
      {showReset && (
        <Button type="button" variant="outline" onClick={onReset} data-testid="sakes-search-reset">초기화</Button>
      )}
    </div>
  );
}

// 빈 상태 구분: data-empty(전량 0) ≠ data-search-empty(검색 결과 0). 로딩/에러 우선.
function ListState({ isLoading, isError, total, shown, emptyText, query }: {
  isLoading: boolean;
  isError: boolean;
  total: number;
  shown: number;
  emptyText: string;
  query: string;
}): ReactNode {
  if (isLoading) return <p className="muted sakes-empty">불러오는 중…</p>;
  if (isError) return <p className="muted sakes-empty">목록을 불러오지 못했습니다.</p>;
  if (total === 0) return <p className="muted sakes-empty" data-empty>{emptyText}</p>;
  if (shown === 0) return <p className="muted sakes-empty" data-search-empty>{`'${query}' 검색 결과가 없습니다.`}</p>;
  return null;
}

function EditorActions({ isNew, canSave, pending, onCancel, onSave, onDelete }: {
  isNew: boolean;
  canSave: boolean;
  pending: boolean;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="row sake-editor__actions">
      {/* destructive는 좌측 분리 */}
      <div>
        {!isNew && (
          <Button type="button" variant="destructive" onClick={onDelete} data-testid="sakes-editor-delete">
            <Trash2 className="size-4" />
            삭제
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="sakes-editor-cancel">취소</Button>
        <Button type="button" onClick={onSave} disabled={!canSave || pending} data-testid="sakes-editor-save">
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  );
}

function EditorMsg({ msg }: { msg: Msg | null }) {
  if (!msg) return null;
  return <p className={`sake-editor__msg ${msg.kind}`}>{msg.text}</p>;
}

// ── 사케 패널 ──

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

function SakePanel() {
  const qc = useQueryClient();
  // 키에 쿼리 미포함 = q 생략 전량 로드, 필터는 클라이언트. mutation 성공 시 invalidate.
  const list = useQuery({ queryKey: ['sakes'], queryFn: () => api.searchSakes(), retry: false });

  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [editId, setEditId] = useState<EditId>(null);
  const [form, setForm] = useState<SakeForm>(EMPTY_SAKE);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const items = list.data ?? [];
  const q = appliedQuery.trim().toLowerCase();
  const filtered = q
    ? items.filter((s) => `${s.name} ${s.brand ?? ''} ${s.brewery ?? ''}`.toLowerCase().includes(q))
    : items;
  // v2: 사케는 브랜드에, 브랜드는 양조장에 매달린다 → 양조장 없이는 저장 자체가 불가(서버도 400).
  // 버튼을 미리 잠가서 400을 맞고 나서야 알게 되는 걸 막는다.
  const canSave = dirty && form.name.trim().length > 0 && form.brewery.trim().length > 0;

  const openEdit = (s: Sake) => { setEditId(s.id); setForm(sakeToForm(s)); setDirty(false); setMsg(null); };
  const openNew = () => { setEditId('new'); setForm(EMPTY_SAKE); setDirty(false); setMsg(null); };
  const close = () => { setEditId(null); setMsg(null); };
  const update = (patch: Partial<SakeForm>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };

  const save = useMutation({
    mutationFn: async (): Promise<{ rehydrate: Sake | null }> => {
      const input = sakeToInput(form);
      if (editId === 'new') return { rehydrate: (await api.upsertSake(input)).sake };
      if (editId === null) throw new Error('no edit target');
      await api.updateSake(editId, input);
      return { rehydrate: null };
    },
    onSuccess: ({ rehydrate }) => {
      qc.invalidateQueries({ queryKey: ['sakes'] });
      if (rehydrate) { setEditId(rehydrate.id); setForm(sakeToForm(rehydrate)); }
      setDirty(false);
      setMsg({ text: '저장됨', kind: 'ok' });
    },
    onError: (err) => {
      if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['sakes'] });
        close();
        setMsg({ text: '이미 삭제된 항목입니다. 목록을 새로고침했습니다.', kind: 'err' });
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
    mutationFn: (id: string) => api.deleteSake(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sakes'] }); close(); },
    onError: (err) => {
      if (errStatus(err) === 404) { qc.invalidateQueries({ queryKey: ['sakes'] }); close(); }
      else setMsg({ text: '삭제에 실패했습니다.', kind: 'err' });
    },
  });

  const onDelete = () => {
    if (editId === null || editId === 'new') return;
    // eslint-disable-next-line no-alert -- 조용한 파괴 금지: 명시 confirm (persona 하드라인)
    if (!confirm(`${form.name.trim()} 사케를 삭제할까요?`)) return;
    del.mutate(editId);
  };

  return (
    <>
      <div className="row">
        <h1>사케 {list.data ? `(${items.length})` : ''}</h1>
        <Button size="sm" className="min-h-11 sm:h-8" onClick={openNew} data-testid="sakes-add-button">+ 추가</Button>
      </div>

      <SearchBar
        input={searchInput}
        onInput={setSearchInput}
        onSubmit={() => setAppliedQuery(searchInput)}
        onReset={() => { setSearchInput(''); setAppliedQuery(''); }}
        showReset={appliedQuery.trim().length > 0}
        placeholder="사케명·양조장 검색"
      />

      {editId !== null && (
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
            isNew={editId === 'new'}
            canSave={canSave}
            pending={save.isPending}
            onCancel={close}
            onSave={() => save.mutate()}
            onDelete={onDelete}
          />
        </div>
      )}

      <ListState
        isLoading={list.isLoading}
        isError={list.isError}
        total={items.length}
        shown={filtered.length}
        query={appliedQuery}
        emptyText="아직 등록된 사케가 없습니다. 시음노트를 저장하면 자동으로 쌓이거나 '+ 추가'로 등록하세요."
      />
      {filtered.length > 0 && (
        <ul className="post-table sakes-list">
          {filtered.map((s, i) => (
            <li key={s.id} className={editId === s.id ? 'row-active' : undefined}>
              <button type="button" className="row-btn" data-testid={`sakes-row-${i}`} onClick={() => openEdit(s)}>
                <span className="post-cat">{s.brewery ?? '—'}</span>
                <span className="post-title">{s.name}</span>
                {(s.tokuteiMeisho || s.seimaiBuai !== null) && (
                  <span className="slash-hint">
                    {[s.tokuteiMeisho, s.seimaiBuai !== null ? `정미 ${s.seimaiBuai}%` : null].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ── 양조장 패널 ──

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

function BreweryPanel() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['breweries'], queryFn: () => api.searchBreweries(), retry: false });

  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [editId, setEditId] = useState<EditId>(null);
  const [form, setForm] = useState<BreweryForm>(EMPTY_BREWERY);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const items = list.data ?? [];
  const q = appliedQuery.trim().toLowerCase();
  const filtered = q
    ? items.filter((b) => `${b.name} ${b.prefecture ?? ''} ${b.address ?? ''}`.toLowerCase().includes(q))
    : items;
  const canSave = dirty && form.name.trim().length > 0;

  const openEdit = (b: Brewery) => { setEditId(b.id); setForm(breweryToForm(b)); setDirty(false); setMsg(null); };
  const openNew = () => { setEditId('new'); setForm(EMPTY_BREWERY); setDirty(false); setMsg(null); };
  const close = () => { setEditId(null); setMsg(null); };
  const update = (patch: Partial<BreweryForm>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };

  const save = useMutation({
    mutationFn: async (): Promise<{ rehydrate: Brewery | null }> => {
      const input = breweryToInput(form);
      if (editId === 'new') return { rehydrate: (await api.upsertBrewery(input)).brewery };
      if (editId === null) throw new Error('no edit target');
      await api.updateBrewery(editId, input);
      return { rehydrate: null };
    },
    onSuccess: ({ rehydrate }) => {
      qc.invalidateQueries({ queryKey: ['breweries'] });
      if (rehydrate) { setEditId(rehydrate.id); setForm(breweryToForm(rehydrate)); }
      setDirty(false);
      setMsg({ text: '저장됨', kind: 'ok' });
    },
    onError: (err) => {
      if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['breweries'] });
        close();
        setMsg({ text: '이미 삭제된 항목입니다. 목록을 새로고침했습니다.', kind: 'err' });
      } else {
        setMsg({ text: '저장에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.deleteBrewery(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['breweries'] }); close(); },
    onError: (err) => {
      // 409: 참조 존재 → blocking 인라인 메시지 (조용한 데이터 손실 금지).
      // v2에서 양조장을 물고 있는 건 사케가 아니라 브랜드다 (사케는 브랜드에 매달린다).
      if (err instanceof SakeRefError) {
        setMsg({ text: `이 양조장은 브랜드 ${err.count}개가 참조 중이라 삭제할 수 없습니다. 「브랜드」 탭에서 먼저 정리하세요.`, kind: 'block' });
      } else if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['breweries'] });
        close();
      } else {
        setMsg({ text: '삭제에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const onDelete = () => {
    if (editId === null || editId === 'new') return;
    // eslint-disable-next-line no-alert -- 조용한 파괴 금지: 명시 confirm (persona 하드라인)
    if (!confirm(`${form.name.trim()} 양조장을 삭제할까요?`)) return;
    del.mutate(editId);
  };

  return (
    <>
      <div className="row">
        <h1>양조장 {list.data ? `(${items.length})` : ''}</h1>
        <Button size="sm" className="min-h-11 sm:h-8" onClick={openNew} data-testid="sakes-add-button">+ 추가</Button>
      </div>

      <SearchBar
        input={searchInput}
        onInput={setSearchInput}
        onSubmit={() => setAppliedQuery(searchInput)}
        onReset={() => { setSearchInput(''); setAppliedQuery(''); }}
        showReset={appliedQuery.trim().length > 0}
        placeholder="양조장명·주소 검색"
      />

      {editId !== null && (
        <div className="sake-editor" data-testid="sakes-editor">
          <Field label="이름 *">
            <Input value={form.name} placeholder="양조장 이름" data-testid="sakes-editor-name-input" onChange={(e) => update({ name: e.target.value })} />
          </Field>
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
          <Field label="세부 주소(住所)">
            <Input
              value={form.address}
              placeholder="예: にかほ市平沢字中町59"
              data-testid="sakes-editor-address-input"
              onChange={(e) => update({ address: e.target.value })}
            />
          </Field>
          <Field label="메모">
            <Textarea value={form.note} onChange={(e) => update({ note: e.target.value })} />
          </Field>
          <EditorMsg msg={msg} />
          <EditorActions
            isNew={editId === 'new'}
            canSave={canSave}
            pending={save.isPending}
            onCancel={close}
            onSave={() => save.mutate()}
            onDelete={onDelete}
          />
        </div>
      )}

      <ListState
        isLoading={list.isLoading}
        isError={list.isError}
        total={items.length}
        shown={filtered.length}
        query={appliedQuery}
        emptyText="아직 등록된 양조장이 없습니다. 사케를 등록하면 자동으로 쌓이거나 '+ 추가'로 등록하세요."
      />
      {filtered.length > 0 && (
        <ul className="post-table sakes-list">
          {filtered.map((b, i) => (
            <li key={b.id} className={editId === b.id ? 'row-active' : undefined}>
              <button type="button" className="row-btn" data-testid={`sakes-row-${i}`} onClick={() => openEdit(b)}>
                <span className="post-title">{b.name}</span>
                {(b.prefecture || b.address) && (
                  <span className="slash-hint">{[b.prefecture, b.address].filter(Boolean).join(' · ')}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ── 브랜드 패널 (v2) ──

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

function BrandPanel() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['brands'], queryFn: () => api.searchBrands(), retry: false });

  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [editId, setEditId] = useState<EditId>(null);
  const [form, setForm] = useState<BrandForm>(EMPTY_BRAND);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const items = list.data ?? [];
  const q = appliedQuery.trim().toLowerCase();
  const filtered = q
    ? items.filter((b) => `${b.name} ${b.yomigana ?? ''} ${b.brewery ?? ''}`.toLowerCase().includes(q))
    : items;
  // 브랜드는 양조장 없이 존재할 수 없다 → 둘 다 필수.
  const canSave = dirty && form.name.trim().length > 0 && form.brewery.trim().length > 0;

  const openEdit = (b: Brand) => { setEditId(b.id); setForm(brandToForm(b)); setDirty(false); setMsg(null); };
  const openNew = () => { setEditId('new'); setForm(EMPTY_BRAND); setDirty(false); setMsg(null); };
  const close = () => { setEditId(null); setMsg(null); };
  const update = (patch: Partial<BrandForm>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };

  const save = useMutation({
    mutationFn: async (): Promise<{ rehydrate: Brand | null }> => {
      const input = brandToInput(form);
      if (editId === 'new') return { rehydrate: (await api.upsertBrand(input)).brand };
      if (editId === null) throw new Error('no edit target');
      await api.updateBrand(editId, input);
      return { rehydrate: null };
    },
    onSuccess: ({ rehydrate }) => {
      // 브랜드를 고치면 양조장이 새로 생겼을 수 있고(find-or-create), 사케의 조인 표시도 바뀐다.
      qc.invalidateQueries({ queryKey: ['brands'] });
      qc.invalidateQueries({ queryKey: ['breweries'] });
      qc.invalidateQueries({ queryKey: ['sakes'] });
      if (rehydrate) { setEditId(rehydrate.id); setForm(brandToForm(rehydrate)); }
      setDirty(false);
      setMsg({ text: '저장됨', kind: 'ok' });
    },
    onError: (err) => {
      if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['brands'] });
        close();
        setMsg({ text: '이미 삭제된 항목입니다. 목록을 새로고침했습니다.', kind: 'err' });
      } else {
        setMsg({ text: '저장에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.deleteBrand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      qc.invalidateQueries({ queryKey: ['breweries'] });
      close();
    },
    onError: (err) => {
      if (err instanceof SakeRefError) {
        setMsg({ text: `이 브랜드는 사케 ${err.count}개가 참조 중이라 삭제할 수 없습니다. 먼저 해당 사케를 변경/삭제하세요.`, kind: 'block' });
      } else if (errStatus(err) === 404) {
        qc.invalidateQueries({ queryKey: ['brands'] });
        close();
      } else {
        setMsg({ text: '삭제에 실패했습니다.', kind: 'err' });
      }
    },
  });

  const onDelete = () => {
    if (editId === null || editId === 'new') return;
    // eslint-disable-next-line no-alert -- 조용한 파괴 금지: 명시 confirm (persona 하드라인)
    if (!confirm(`${form.name.trim()} 브랜드를 삭제할까요?`)) return;
    del.mutate(editId);
  };

  return (
    <>
      <div className="row">
        <h1>브랜드 {list.data ? `(${items.length})` : ''}</h1>
        <Button size="sm" className="min-h-11 sm:h-8" onClick={openNew} data-testid="sakes-add-button">+ 추가</Button>
      </div>

      <SearchBar
        input={searchInput}
        onInput={setSearchInput}
        onSubmit={() => setAppliedQuery(searchInput)}
        onReset={() => { setSearchInput(''); setAppliedQuery(''); }}
        showReset={appliedQuery.trim().length > 0}
        placeholder="브랜드명·요미가나·양조장 검색"
      />

      {editId !== null && (
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
            isNew={editId === 'new'}
            canSave={canSave}
            pending={save.isPending}
            onCancel={close}
            onSave={() => save.mutate()}
            onDelete={onDelete}
          />
        </div>
      )}

      <ListState
        isLoading={list.isLoading}
        isError={list.isError}
        total={items.length}
        shown={filtered.length}
        query={appliedQuery}
        emptyText="아직 등록된 브랜드가 없습니다. 사케를 등록하면 자동으로 쌓이거나 '+ 추가'로 등록하세요."
      />
      {filtered.length > 0 && (
        <ul className="post-table sakes-list">
          {filtered.map((b, i) => (
            <li key={b.id} className={editId === b.id ? 'row-active' : undefined}>
              <button type="button" className="row-btn" data-testid={`sakes-row-${i}`} onClick={() => openEdit(b)}>
                <span className="post-title">{b.name}</span>
                {b.brewery && <span className="slash-hint">{b.brewery}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// 사케/브랜드/양조장 마스터 관리 — 세그먼트 토글 1라우트. 탭 전환 시 패널 언마운트 = 상태 초기화.
// 탭 순서는 데이터 계층 순(蔵元 → 브랜드 → 사케)의 역순 = 자주 쓰는 것부터.
const TABS = [
  { key: 'sake', label: '사케' },
  { key: 'brand', label: '브랜드' },
  { key: 'brewery', label: '양조장' },
] as const;
type Tab = typeof TABS[number]['key'];

export function SakesPage() {
  const [tab, setTab] = useState<Tab>('sake');

  return (
    <section>
      <div className="seg-toggle" role="tablist" aria-label="관리 대상">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? 'seg seg-on' : 'seg'}
            data-testid={`sakes-tab-${t.key}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'sake' && <SakePanel />}
      {tab === 'brand' && <BrandPanel />}
      {tab === 'brewery' && <BreweryPanel />}
    </section>
  );
}
