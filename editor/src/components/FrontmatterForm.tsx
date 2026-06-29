import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReactNode } from 'react';
import type { Frontmatter } from '../lib/api';
import { DatePicker, TagInput, ThumbnailInput } from './fields';

export const CATEGORIES = ['daily', 'diary', 'game', 'music', 'web'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-foreground text-xs font-normal">{label}</Label>
      {children}
    </div>
  );
}

export function FrontmatterForm({ value, onChange }: { value: Frontmatter; onChange: (fm: Frontmatter) => void }) {
  const set = (patch: Partial<Frontmatter>) => onChange({ ...value, ...patch });
  const isMusic = (value.category ?? '').toLowerCase() === 'music';

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="제목">
          <Input value={value.title ?? ''} onChange={(e) => set({ title: e.target.value })} />
        </Field>
      </div>
      <Field label="분류">
        {/* value (data) stays lowercase; label is capitalized for display */}
        <Select value={(value.category ?? '').toLowerCase()} onValueChange={(v) => set({ category: v ?? undefined })}>
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
    </div>
  );
}
