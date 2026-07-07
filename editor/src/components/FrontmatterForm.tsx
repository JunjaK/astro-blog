import type { Frontmatter, LyricsKind, Sake, SakeInput, TastingAutofill, TokuteiMeisho } from '../lib/api';
import type { ReactNode } from 'react';
import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, AutofillError, TOKUTEI_MEISHO } from '../lib/api';
import { NIHONSHU_FLAVOR_LABELS } from '../lib/nihonshuFlavors';
import { AmakaraNoutanPicker } from './AmakaraNoutanPicker';
import { DatePicker, TagInput, ThumbnailInput } from './fields';

type DrinkKind = NonNullable<Frontmatter['drinkKind']>;

export const CATEGORIES = ['daily', 'diary', 'game', 'music', 'tasting', 'web'];
const LYRICS_TYPES: { value: LyricsKind; label: string }[] = [
  { value: 'jpop', label: 'J-POP (원문·루비·번역)' },
  { value: 'kpop', label: 'K-POP (가사만)' },
  { value: 'pop', label: 'POP (원문·번역)' },
];
const DRINK_KINDS: { value: DrinkKind; label: string }[] = [
  { value: 'nihonshu', label: '니혼슈(日本酒)' },
  { value: 'whisky', label: '위스키' },
  { value: 'beer', label: '맥주' },
  { value: 'other', label: '기타 주류' },
];
// DB-pick objective keys (Sake → Frontmatter, authoritative augment). Includes join-only
// breweryYomigana. Subjective keys (amakara/noutan/flavorTags) and title are never in master.
const DB_PICK_KEYS = ['brand', 'brandYomigana', 'yomigana', 'brewery', 'breweryYomigana', 'tokuteiMeisho', 'riceType', 'seimaiBuai', 'alcohol', 'nihonshuDo', 'sando'] as const;
// Subset persisted back to the sake master on save — SakeInput has no breweryYomigana
// (양조장 읽기는 브루어리 레코드 소유). 그 한 필드만 제외.
const MASTER_SAVE_KEYS = ['brand', 'brandYomigana', 'yomigana', 'brewery', 'tokuteiMeisho', 'riceType', 'seimaiBuai', 'alcohol', 'nihonshuDo', 'sando'] as const;

// AI-autofillable fields, in review-panel order. `estimate` = AI-must-not-invent numeric.
// brand/yomigana류는 문자열 — 「추정」 뱃지 없음.
const AUTOFILL_ROWS: { key: keyof TastingAutofill; label: string; estimate?: boolean }[] = [
  { key: 'brand', label: '브랜드(銘柄)' },
  { key: 'brandYomigana', label: '브랜드 요미가나' },
  { key: 'yomigana', label: '술이름 요미가나' },
  { key: 'brewery', label: '양조장' },
  { key: 'breweryYomigana', label: '양조장 요미가나' },
  { key: 'tokuteiMeisho', label: '특정명칭' },
  { key: 'riceType', label: '원료미' },
  { key: 'seimaiBuai', label: '정미보합(%)', estimate: true },
  { key: 'alcohol', label: '도수(%)', estimate: true },
  { key: 'nihonshuDo', label: '일본주도(SMV)', estimate: true },
  { key: 'sando', label: '산도', estimate: true },
  { key: 'amakara', label: '甘辛' },
  { key: 'noutan', label: '濃淡' },
  { key: 'flavorTags', label: '향미 태그' },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function fmt(key: keyof TastingAutofill, v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (key === 'amakara' && typeof v === 'number') return `甘辛 ${v}/8`;
  if (key === 'noutan' && typeof v === 'number') return `濃淡 ${v}/8`;
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

// Status → user message. Error never writes a field (augment-only fails closed).
function errMessage(status: number): string {
  switch (status) {
    case 401: return ''; // login bounce already navigating away
    case 502: return 'AI 서버 오류입니다. 잠시 후 다시 시도해 주세요';
    case 503: return 'AI가 설정되지 않았습니다(API 키 없음)';
    case 504: return '응답이 20초를 넘겨 중단됐습니다. 다시 시도해 주세요';
    default: return 'AI 응답을 해석하지 못했습니다';
  }
}

function Field({ label, badge, children }: { label: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground text-xs font-normal">{label}</Label>
        {badge}
      </div>
      {children}
    </div>
  );
}

// Local, non-persistent "this came from AI, please verify" marker. Cleared on manual edit.
function AiBadge() {
  return <span className="border-primary/40 text-primary rounded-full border px-1.5 py-0.5 text-[10px] leading-none">AI 채움 · 확인 요망</span>;
}

// DB master authoritative-fill marker (green). Outranks AiBadge; cleared on manual edit.
function DbBadge() {
  return (
    <span
      className="rounded-full border border-[#7fff9f]/40 bg-[#2a4a32] px-1.5 py-0.5 text-[10px] leading-none text-[#7fff9f]"
      title="마스터 DB에서 확정 채움"
    >
      마스터
    </span>
  );
}

function NumberField({ label, badge, value, onChange, min, max, step }: {
  label: string;
  badge?: ReactNode;
  value?: number;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label} badge={badge}>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) => {
          const n = e.target.value === '' ? undefined : Number(e.target.value);
          onChange(n === undefined || Number.isNaN(n) ? undefined : n);
        }}
      />
    </Field>
  );
}

// Inline (never modal) DB-first autofill. Search-select combobox (DB master = authoritative) →
// applyDbPick bypasses review, never upserts. Miss / Enter-without-highlight → AI → checkbox
// review → 선택 적용 (+ best-effort 마스터 저장). AI values never immediate-commit; user-filled
// fields default unchecked (augment-only, no clobber).
function TastingAutofillPanel({ current, defaultQuery, onApply, onDbPick }: {
  current: Frontmatter;
  defaultQuery: string;
  onApply: (patch: Partial<Frontmatter>, keys: string[]) => void;
  onDbPick: (sake: Sake) => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [debounced, setDebounced] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [hi, setHi] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TastingAutofill | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saveToMaster, setSaveToMaster] = useState(true);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const listId = useId();
  const optionId = (i: number) => `${listId}-opt-${i}`;

  // 250ms debounce → server-side normalize+LIKE search. Failure is silent (empty dropdown).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const search = useQuery({
    queryKey: ['sakes', 'search', debounced],
    queryFn: () => api.searchSakes(debounced),
    enabled: debounced.length >= 1,
    retry: false,
  });

  const candidates = (search.data ?? []).slice(0, 8);
  const truncated = (search.data?.length ?? 0) > 8;
  const open = !dismissed && query.trim().length >= 1 && candidates.length > 0;

  const present = result ? AUTOFILL_ROWS.filter((r) => result[r.key] !== undefined) : [];
  const hasNumericEstimate = present.some((r) => r.estimate);

  const close = () => {
    setResult(null);
    setChecked(new Set());
  };

  const run = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setDismissed(true);
    setLoading(true);
    setError('');
    setResult(null);
    setSaveMsg(null);
    try {
      const res = await api.autofillTasting(q);
      const keys = AUTOFILL_ROWS.filter((r) => res[r.key] !== undefined).map((r) => r.key as string);
      // Default-check only empty fields → won't clobber values the user already typed.
      setChecked(new Set(keys.filter((k) => isEmpty(current[k]))));
      setSaveToMaster(true);
      setResult(res);
    } catch (e) {
      setError(errMessage(e instanceof AutofillError ? e.status : 0));
    } finally {
      setLoading(false);
    }
  };

  // DB candidate pick: authoritative fill via parent, bypass review, close everything.
  const pick = (sake: Sake) => {
    onDbPick(sake);
    setQuery(sake.name);
    setDismissed(true);
    setHi(-1);
    setSaveMsg(null);
    close();
  };

  const toggle = (k: string) =>
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const apply = () => {
    if (!result) return;
    const patch: Partial<Frontmatter> = {};
    const keys: string[] = [];
    for (const r of present) {
      const k = r.key as string;
      if (!checked.has(k)) continue;
      keys.push(k);
      if (r.key === 'flavorTags') {
        // union-merge with existing tags (dedup) rather than replace.
        patch.flavorTags = Array.from(new Set([...(current.flavorTags ?? []), ...(result.flavorTags ?? [])]));
      } else {
        (patch as Record<string, unknown>)[k] = result[r.key];
      }
    }
    if (keys.length) onApply(patch, keys);

    // Best-effort master save (checked objective keys only, name = panel query). Applied patch
    // never rolls back on save failure. saveName empty → skip.
    const saveName = query.trim();
    if (saveToMaster && saveName) {
      const input: SakeInput = { name: saveName };
      for (const k of MASTER_SAVE_KEYS) {
        if (checked.has(k) && result[k] !== undefined) Object.assign(input, { [k]: result[k] });
      }
      api.upsertSake(input)
        .then(({ created }) => setSaveMsg({ text: created ? '마스터에 추가됨' : '기존 마스터 갱신됨', ok: true }))
        .catch(() => setSaveMsg({ text: '마스터 저장 실패 — 글은 정상 저장됩니다', ok: false }));
    }
    close();
  };

  return (
    <div className="tasting-ai">
      <div className="tasting-ai__bar">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHi(-1); setDismissed(false); }}
            placeholder="사케명 (예: 旭酒造 - 獺祭 45)"
            className="w-full"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open && hi >= 0 ? optionId(hi) : undefined}
            onKeyDown={(e) => {
              if (open && e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % candidates.length); }
              else if (open && e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + candidates.length) % candidates.length); }
              else if (e.key === 'Enter') { e.preventDefault(); if (open && hi >= 0) pick(candidates[hi]); else void run(); }
              else if (e.key === 'Escape' && open) { e.preventDefault(); setDismissed(true); setHi(-1); }
            }}
          />
          {open && (
            <div className="slash-menu tag-ac-menu" role="listbox" id={listId}>
              {candidates.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  id={optionId(i)}
                  aria-selected={i === hi}
                  className={i === hi ? 'slash-item active' : 'slash-item'}
                  onMouseEnter={() => setHi(i)}
                  onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                >
                  <span>{s.name}{s.yomigana ? `（${s.yomigana}）` : ''}</span>
                  {(s.brewery || s.tokuteiMeisho) && (
                    <span className="slash-hint">{[s.brewery, s.tokuteiMeisho].filter(Boolean).join(' · ')}</span>
                  )}
                </button>
              ))}
              {truncated && <div className="slash-item slash-hint">검색어를 좁히세요</div>}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => void run()} disabled={loading || !query.trim()}>
          <Sparkles className="size-4" />
          {loading ? '조회 중…' : 'AI 자동 채움'}
        </Button>
      </div>
      {error && <p className="tasting-ai__error">{error}</p>}
      {saveMsg && <p className={saveMsg.ok ? 'tasting-ai__savemsg' : 'tasting-ai__error'}>{saveMsg.text}</p>}
      {result && (
        <div className="tasting-ai__panel">
          {present.length === 0
            ? <p className="tasting-ai__empty">제안할 항목이 없습니다.</p>
            : (
                <>
                  {hasNumericEstimate && (
                    <p className="tasting-ai__caveat">AI 추정치입니다. 수치는 공식 자료로 반드시 검증하세요.</p>
                  )}
                  <ul className="tasting-ai__rows">
                    {present.map((r) => {
                      const k = r.key as string;
                      const cur = current[r.key];
                      return (
                        <li key={k} className="tasting-ai__row">
                          <label className="tasting-ai__pick">
                            <input type="checkbox" className="tasting-ai__check" checked={checked.has(k)} onChange={() => toggle(k)} />
                            <span className="tasting-ai__name">{r.label}</span>
                            {r.estimate && <span className="tasting-ai__est">추정</span>}
                          </label>
                          <span className="tasting-ai__val">
                            {!isEmpty(cur) && <span className="tasting-ai__cur">{fmt(r.key, cur)} → </span>}
                            {fmt(r.key, result[r.key])}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="tasting-ai__foot">
                    <label className="tasting-ai__save">
                      <input
                        type="checkbox"
                        className="tasting-ai__check"
                        checked={saveToMaster && !!query.trim()}
                        disabled={!query.trim()}
                        onChange={(e) => setSaveToMaster(e.target.checked)}
                      />
                      <span>마스터에 저장</span>
                    </label>
                    <div className="tasting-ai__actions">
                      <Button type="button" variant="outline" onClick={close}>닫기</Button>
                      <Button type="button" onClick={apply} disabled={checked.size === 0}>선택 적용</Button>
                    </div>
                  </div>
                </>
              )}
        </div>
      )}
    </div>
  );
}

export function FrontmatterForm({ value, onChange }: { value: Frontmatter; onChange: (fm: Frontmatter) => void }) {
  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set());
  const [dbFilled, setDbFilled] = useState<Set<string>>(new Set());

  const without = (keys: string[]) => (prev: Set<string>) => {
    const n = new Set(prev);
    keys.forEach((k) => n.delete(k));
    return n;
  };

  // Manual edits clear both provenance badges for the fields they touch.
  const set = (patch: Partial<Frontmatter>) => {
    const keys = Object.keys(patch);
    if (aiFilled.size && keys.some((k) => aiFilled.has(k))) setAiFilled(without(keys));
    if (dbFilled.size && keys.some((k) => dbFilled.has(k))) setDbFilled(without(keys));
    onChange({ ...value, ...patch });
  };

  // Autofill-apply keeps the AI badge (opposite of `set`); it supersedes any DbBadge on the key.
  const applyAutofill = (patch: Partial<Frontmatter>, keys: string[]) => {
    onChange({ ...value, ...patch });
    setAiFilled((prev) => new Set([...prev, ...keys]));
    if (dbFilled.size) setDbFilled(without(keys));
  };

  // DB pick = authoritative augment: set only non-null objective keys, mark DbBadge, bypass the
  // review panel, never upsert (hallucination-guard lock). Subjective keys / title untouched.
  const applyDbPick = (sake: Sake) => {
    const patch: Partial<Frontmatter> = {};
    const keys: string[] = [];
    for (const k of DB_PICK_KEYS) {
      const v = sake[k];
      if (v === null || v === undefined) continue;
      if (k === 'riceType' && Array.isArray(v) && v.length === 0) continue;
      (patch as Record<string, unknown>)[k] = v;
      keys.push(k);
    }
    if (!keys.length) return;
    onChange({ ...value, ...patch });
    setDbFilled((prev) => new Set([...prev, ...keys]));
    if (aiFilled.size) setAiFilled(without(keys));
  };

  // Badge priority: db → ai.
  const aiBadge = (k: string): ReactNode =>
    dbFilled.has(k) ? <DbBadge /> : aiFilled.has(k) ? <AiBadge /> : undefined;

  const isMusic = (value.category ?? '').toLowerCase() === 'music';
  const isTasting = (value.category ?? '').toLowerCase() === 'tasting';
  const drinkKind = value.drinkKind ?? 'nihonshu';
  const isNihonshu = drinkKind === 'nihonshu';

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="제목">
          <Input value={value.title ?? ''} onChange={(e) => set({ title: e.target.value })} />
        </Field>
      </div>
      <Field label="분류">
        {/* value (data) stays lowercase; label is capitalized for display */}
        <Select
          value={(value.category ?? '').toLowerCase()}
          onValueChange={(v) => {
            const cat = v ?? undefined;
            const patch: Partial<Frontmatter> = { category: cat };
            // Seed the discriminator so the blog card's drinkKind gate has a value.
            if ((cat ?? '').toLowerCase() === 'tasting' && value.drinkKind === undefined) patch.drinkKind = 'nihonshu';
            set(patch);
          }}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="분류 선택" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="작성일">
        <DatePicker value={value.created} onChange={(iso) => set({ created: iso })} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="태그">
          <TagInput value={value.tags ?? []} onChange={(tags) => set({ tags })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="썸네일">
          <ThumbnailInput value={value.thumbnail} onChange={(thumbnail) => set({ thumbnail })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="설명">
          <Textarea value={value.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        </Field>
      </div>

      {isMusic && (
        <div className="border-border mt-1 grid gap-3 border-t pt-4 sm:col-span-2 sm:grid-cols-2">
          <div className="text-foreground/80 text-sm font-medium sm:col-span-2">음악 정보</div>
          <div className="sm:col-span-2">
            <Field label="가사 유형">
              <Select value={value.lyricsType ?? 'jpop'} onValueChange={(v) => set({ lyricsType: (v as LyricsKind) ?? undefined })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="가사 유형" /></SelectTrigger>
                <SelectContent>
                  {LYRICS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="아티스트"><Input value={value.artist ?? ''} onChange={(e) => set({ artist: e.target.value })} /></Field>
          <Field label="앨범"><Input value={value.album ?? ''} onChange={(e) => set({ album: e.target.value })} /></Field>
          <Field label="발매연도">
            <Input type="number" value={value.releaseYear ?? ''} onChange={(e) => set({ releaseYear: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
          <Field label="Apple Music"><Input value={value.appleMusicUrl ?? ''} onChange={(e) => set({ appleMusicUrl: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="YouTube Music"><Input value={value.youtubeMusicUrl ?? ''} onChange={(e) => set({ youtubeMusicUrl: e.target.value })} /></Field>
          </div>
        </div>
      )}

      {isTasting && (
        <div className="border-border mt-1 grid gap-3 border-t pt-4 sm:col-span-2 sm:grid-cols-2">
          <div className="text-foreground/80 text-sm font-medium sm:col-span-2">시음 정보</div>
          <div className="sm:col-span-2">
            <Field label="종류">
              <Select value={drinkKind} onValueChange={(v) => set({ drinkKind: (v as DrinkKind) ?? undefined })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="종류 선택" /></SelectTrigger>
                <SelectContent>
                  {DRINK_KINDS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {isNihonshu && (
            <>
              <div className="sm:col-span-2">
                <TastingAutofillPanel current={value} defaultQuery={value.title ?? ''} onApply={applyAutofill} onDbPick={applyDbPick} />
              </div>
              {/* 銘柄 + 읽기류(요미가나) — 컴팩트 2×2 그룹 */}
              <Field label="브랜드(銘柄)" badge={aiBadge('brand')}>
                <Input value={value.brand ?? ''} onChange={(e) => set({ brand: e.target.value })} />
              </Field>
              <Field label="브랜드 요미가나" badge={aiBadge('brandYomigana')}>
                <Input value={value.brandYomigana ?? ''} onChange={(e) => set({ brandYomigana: e.target.value })} placeholder="히라가나" />
              </Field>
              <Field label="술이름 요미가나" badge={aiBadge('yomigana')}>
                <Input value={value.yomigana ?? ''} onChange={(e) => set({ yomigana: e.target.value })} placeholder="히라가나" />
              </Field>
              <Field label="양조장 요미가나" badge={aiBadge('breweryYomigana')}>
                <Input value={value.breweryYomigana ?? ''} onChange={(e) => set({ breweryYomigana: e.target.value })} placeholder="히라가나" />
              </Field>
              <Field label="양조장(酒蔵)" badge={aiBadge('brewery')}>
                <Input value={value.brewery ?? ''} onChange={(e) => set({ brewery: e.target.value })} />
              </Field>
              <Field label="특정명칭(特定名称)" badge={aiBadge('tokuteiMeisho')}>
                <Select
                  value={value.tokuteiMeisho ?? null}
                  onValueChange={(v) => set({ tokuteiMeisho: (v as TokuteiMeisho | null) ?? undefined })}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="특정명칭 선택" /></SelectTrigger>
                  <SelectContent>
                    {TOKUTEI_MEISHO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="원료미(酒米)" badge={aiBadge('riceType')}>
                  <TagInput value={value.riceType ?? []} onChange={(riceType) => set({ riceType })} placeholder="쌀 품종 추가…" />
                </Field>
              </div>
              <NumberField label="정미보합(精米歩合, %)" badge={aiBadge('seimaiBuai')} value={value.seimaiBuai} onChange={(seimaiBuai) => set({ seimaiBuai })} min={0} max={100} />
              <NumberField label="도수(%)" badge={aiBadge('alcohol')} value={value.alcohol} onChange={(alcohol) => set({ alcohol })} min={0} step={0.1} />
              <NumberField label="일본주도(日本酒度)" badge={aiBadge('nihonshuDo')} value={value.nihonshuDo} onChange={(nihonshuDo) => set({ nihonshuDo })} step={0.1} />
              <NumberField label="산도(酸度)" badge={aiBadge('sando')} value={value.sando} onChange={(sando) => set({ sando })} min={0} step={0.1} />
              <div className="sm:col-span-2">
                <Field label="향미 태그" badge={aiBadge('flavorTags')}>
                  <TagInput value={value.flavorTags ?? []} onChange={(flavorTags) => set({ flavorTags })} suggestions={NIHONSHU_FLAVOR_LABELS} placeholder="향미 태그 추가…" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="甘辛 × 濃淡" badge={aiFilled.has('amakara') || aiFilled.has('noutan') ? <AiBadge /> : undefined}>
                  <AmakaraNoutanPicker
                    amakara={value.amakara}
                    noutan={value.noutan}
                    onChange={(v) => set({ amakara: v.amakara, noutan: v.noutan })}
                  />
                </Field>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
