import { useRef, useState } from 'react';
import { CalendarIcon, Plus, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { pendingMedia } from '../tiptap/pendingMedia';

export function DatePicker({ value, onChange }: { value?: string; onChange: (iso: string) => void }) {
  const date = value ? new Date(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="w-full justify-start font-normal" />}>
        <CalendarIcon className="mr-2 size-4" />
        {date ? date.toISOString().slice(0, 10) : '날짜 선택'}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => d && onChange(d.toISOString())} autoFocus />
      </PopoverContent>
    </Popover>
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
        className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
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
// Pick = object-URL preview + register pending; upload happens on save.
export function ThumbnailInput({ value, onChange }: { value?: string; onChange: (src: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = () => ref.current?.click();
  return (
    <div className="group border-input relative aspect-video w-44 overflow-hidden rounded-md border border-dashed">
      {value
        ? (
          <>
            <img src={value} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/55 group-hover:flex">
              <button type="button" onClick={pick} title="교체" className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                <RefreshCw className="size-4" />
              </button>
              <button type="button" onClick={() => onChange('')} title="제거" className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
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
          if (!f) return;
          const url = URL.createObjectURL(f);
          pendingMedia.set(url, f);
          onChange(url);
        }}
      />
    </div>
  );
}
