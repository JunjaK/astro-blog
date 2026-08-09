import { useRef, useState } from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { attachMedia, mediaUpload } from '../tiptap/mediaUploads';
import { CropDialog } from './CropDialog';

// Native date input — far better than a cramped calendar popover on mobile.
export function DatePicker({ value, onChange }: { value?: string; onChange: (iso: string) => void }) {
  return (
    <Input
      type="date"
      className="w-full"
      value={value ? value.slice(0, 10) : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
    />
  );
}

// `suggestions` (optional) turns on an autocomplete dropdown that reuses the slash-menu look:
// opens on draft ≥1 char, filters by includes minus already-picked, Arrow/Enter/Escape, free
// text preserved. Omit it and the input behaves exactly as before (no dropdown).
export function TagInput({ value, onChange, suggestions, placeholder = '태그 추가…' }: {
  value: string[];
  onChange: (t: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const [hi, setHi] = useState(-1);
  const [dismissed, setDismissed] = useState(false);

  const q = draft.trim().toLowerCase();
  const matches = suggestions && q
    ? suggestions.filter((s) => s.toLowerCase().includes(q) && !value.includes(s)).slice(0, 8)
    : [];
  const open = !dismissed && matches.length > 0;

  const add = (t: string) => {
    const v = t.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
    setHi(-1);
  };

  return (
    <div className="relative">
      <div className="border-input flex flex-wrap items-center gap-1.5 rounded-md border bg-transparent p-1.5">
        {value.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1">
            {t}
            <button type="button" className="cursor-pointer" onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
          </Badge>
        ))}
        <input
          className="min-w-24 flex-1 bg-transparent px-1 text-base outline-none sm:text-sm"
          value={draft}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onChange={(e) => { setDraft(e.target.value); setHi(-1); setDismissed(false); }}
          onKeyDown={(e) => {
            if (open && e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % matches.length); }
            else if (open && e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + matches.length) % matches.length); }
            else if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(open && hi >= 0 ? matches[hi] : draft); }
            else if (e.key === 'Escape' && open) { e.preventDefault(); setDismissed(true); setHi(-1); }
            else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
        />
      </div>
      {open && (
        <div className="slash-menu tag-ac-menu" role="listbox">
          {matches.map((m, i) => (
            <button
              key={m}
              type="button"
              role="option"
              aria-selected={i === hi}
              className={i === hi ? 'slash-item active' : 'slash-item'}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); add(m); }}
            >
              <span>{m}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The box IS the control: empty → + to add; filled → hover to replace / remove.
// Pick / drop / paste → crop dialog → upload starts at once, object-URL preview until it lands.
export function ThumbnailInput({ value, onChange }: { value?: string; onChange: (src: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const pick = () => ref.current?.click();

  // Single funnel for picker / drop / paste. The crop step decodes through <img>/<canvas>, so a
  // format the browser can't decode (HEIC) dead-ends in the dialog with no feedback — reject it
  // up front. Body images have no such limit (server converts) — see RichEditor's handlers.
  const take = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/') || /heic|heif/i.test(f.type)) {
      setError('브라우저가 열 수 없는 형식입니다 (HEIC 등) — JPG/PNG/WebP로 변환해 주세요');
      return;
    }
    setError('');
    setCropSrc(URL.createObjectURL(f));
  };

  return (
    <div className="grid gap-1.5">
      {/* ponytail: paste needs focus (tabIndex) — hover-scoped paste would steal ⌘V from the body editor */}
      <div
        tabIndex={0}
        onPaste={(e) => take(e.clipboardData.files[0])}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={(e) => { if (!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))) setOver(false); }}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
        className={cn(
          'group border-input focus-visible:ring-ring relative aspect-video w-44 overflow-hidden rounded-md border border-dashed focus-visible:ring-2 focus-visible:outline-none',
          over && 'border-primary bg-primary/10',
        )}
      >
        {value
          ? (
            <>
              <img src={value} alt="" className="pointer-events-none size-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                <button type="button" onClick={pick} title="교체" className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:size-8">
                  <RefreshCw className="size-4" />
                </button>
                <button type="button" onClick={() => onChange('')} title="제거" className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:size-8">
                  <X className="size-4" />
                </button>
              </div>
            </>
            )
          : (
            <button type="button" onClick={pick} className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-full items-center justify-center">
              <Plus className="size-6" />
            </button>
            )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            take(e.target.files?.[0]);
            if (ref.current) ref.current.value = '';
          }}
        />
      </div>
      <p className={cn('text-[11px]', error ? 'text-destructive' : 'text-muted-foreground')}>
        {error || (uploading ? '업로드 중…' : '클릭 · 드래그&드롭 · 상자 선택 후 ⌘V 붙여넣기')}
      </p>
      {cropSrc && (
        <CropDialog
          src={cropSrc}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onConfirm={(blob) => {
            URL.revokeObjectURL(cropSrc);
            const preview = attachMedia(new File([blob], 'thumbnail.webp', { type: 'image/webp' }));
            onChange(preview);
            setCropSrc(null);
            setUploading(true);
            setError('');
            // Safe to call a possibly-stale onChange: it forwards a patch, not a rebuilt object.
            mediaUpload(preview)?.promise.then(
              (src) => { onChange(src); setUploading(false); },
              () => { setUploading(false); setError('썸네일 업로드 실패 — 다시 첨부해 주세요'); },
            );
          }}
        />
      )}
    </div>
  );
}
