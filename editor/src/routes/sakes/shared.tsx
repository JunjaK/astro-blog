import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// leaves lifted verbatim out of the old routes/SakesPage.tsx inline editor (route-based edit
// rework — plan §Frontend SakesPage 라우트화) so the three entity panels can share them.

export interface Msg { text: string; kind: 'ok' | 'err' | 'block' }

// 제네릭 req<T>는 상태코드를 문자열 메시지로 접으므로 message 선두 3자리로 상태를 복원한다.
// 404 → 리스트 재조회, 5xx → 제네릭 인라인 메시지. (409 brewery는 SakeRefError로 별도 처리)
export function errStatus(err: unknown): number {
  return err instanceof Error ? Number(err.message.slice(0, 3)) : 0;
}

export const num = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
};
export const str = (n: number | null): string => (n === null ? '' : String(n));

// 패널 헤더 카운트: 로딩 전엔 표시 없음, 검색 미적용 시 전체만, 적용 시 필터/전체 분수 표기
// (Phase 2 보정 3 — 검색 적용 시 몇 건이 걸러졌는지 알 수 있어야 한다).
export function countLabel(loaded: boolean, total: number, filtered: number, hasQuery: boolean): string {
  if (!loaded) return '';
  return hasQuery ? `(${filtered}/${total})` : `(${total})`;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sake-editor__field">
      <Label className="text-muted-foreground font-mono text-[11px] font-medium tracking-wide uppercase">{label}</Label>
      {children}
    </div>
  );
}

// 2변수 검색: input(바인딩) + applied(필터 소스). Enter/「검색」에서만 apply, 「초기화」는 노출 시에만.
export function SearchBar({ input, onInput, onSubmit, onReset, showReset, placeholder }: {
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
      <Button type="button" variant="secondary" onClick={onSubmit} data-testid="sakes-search-submit"><Search className="size-4" />검색</Button>
      {showReset && (
        <Button type="button" variant="outline" onClick={onReset} data-testid="sakes-search-reset">초기화</Button>
      )}
    </div>
  );
}

// claude design "Editor Redesign": actions row is 삭제 ← → 저장 only — no 취소/cancel button
// (「← 목록」 in the overlay header already covers leave-without-saving).
export function EditorActions({ isNew, canSave, pending, onSave, onDelete }: {
  isNew: boolean;
  canSave: boolean;
  pending: boolean;
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
      <div className="flex items-center gap-3">
        <Button type="button" onClick={onSave} disabled={!canSave || pending} data-testid="sakes-editor-save">
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </div>
  );
}

export function EditorMsg({ msg }: { msg: Msg | null }) {
  if (!msg) return null;
  return <p className={`sake-editor__msg ${msg.kind}`}>{msg.text}</p>;
}

// 전체화면 편집 오버레이 chrome — 부모 리스트는 미언마운트 상태로 뒤에 남는다(검색/페이지/스크롤 보존).
// CSS(.sake-edit-overlay)는 D1이 이미 병합(fixed inset-0, overflow-y auto, overscroll contain).
// mount 시 「← 목록」 버튼에 포커스 이동 + body 스크롤락, unmount 시 원복 — 둘 다 lifecycle 정당화된 effect.
// Esc 바인딩은 의도적으로 없음(FrontmatterForm의 combobox/slash-menu Escape 시맨틱과 충돌 — Phase 2 보정 2③).
export function EditOverlay({ kind, title, onBack, children }: { kind: string; title: string; onBack: () => void; children: ReactNode }) {
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  return (
    <div className="sake-edit-overlay">
      <div className="sake-edit-overlay__header">
        <div className="sake-edit-overlay__header-inner">
          <button
            ref={backRef}
            type="button"
            className={buttonVariants({ variant: 'outline' })}
            onClick={onBack}
            data-testid="sakes-edit-back"
          >
            ← 목록
          </button>
          <div className="sake-edit-overlay__titlewrap">
            <span className="sake-edit-overlay__kind">{kind}</span>
            <span className="sake-edit-overlay__title">{title}</span>
          </div>
        </div>
      </div>
      <div className="sake-edit-overlay__body">{children}</div>
    </div>
  );
}
