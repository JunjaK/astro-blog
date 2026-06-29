import { useRef, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
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

// Pick → object-URL preview + register pending; actual upload happens on save.
export function ThumbnailInput({ value, onChange }: { value?: string; onChange: (src: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      {value
        ? <img src={value} alt="" className="border-border size-16 rounded object-cover border" />
        : <div className="border-input size-16 rounded border border-dashed" />}
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>이미지 선택</Button>
      {value && <button type="button" className="text-muted-foreground text-sm" onClick={() => onChange('')}>제거</button>}
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
