import { useRef, useState } from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { pendingMedia } from '../tiptap/pendingMedia';
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

export function TagInput({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
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
        placeholder="태그 추가…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
      />
    </div>
  );
}

// The box IS the control: empty → + to add; filled → hover to replace / remove.
// Pick → crop/resize dialog → object-URL preview + register pending; upload on save.
export function ThumbnailInput({ value, onChange }: { value?: string; onChange: (src: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const pick = () => ref.current?.click();
  return (
    <div className="group border-input relative aspect-video w-44 overflow-hidden rounded-md border border-dashed">
      {value
        ? (
          <>
            <img src={value} alt="" className="size-full object-cover" />
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
          const f = e.target.files?.[0];
          if (f) setCropSrc(URL.createObjectURL(f));
          if (ref.current) ref.current.value = '';
        }}
      />
      {cropSrc && (
        <CropDialog
          src={cropSrc}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onConfirm={(blob) => {
            URL.revokeObjectURL(cropSrc);
            const url = URL.createObjectURL(blob);
            pendingMedia.set(url, new File([blob], 'thumbnail.webp', { type: 'image/webp' }));
            onChange(url);
            setCropSrc(null);
          }}
        />
      )}
    </div>
  );
}
