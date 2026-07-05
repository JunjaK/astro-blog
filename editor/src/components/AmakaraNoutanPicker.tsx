import type { KeyboardEvent, PointerEvent } from 'react';
import { useRef, useState } from 'react';
import { X } from 'lucide-react';

// Axis labels shared with the review panel readout. idx = value + 2 for amakara,
// idx = 2 − value for noutan (top row = 濃醇 = +2, bottom row = 淡麗 = −2).
export const AMAKARA = ['甘口', 'やや甘口', '中口', 'やや辛口', '辛口'];
export const NOUTAN = ['濃醇', 'やや濃醇', '中程度', 'やや淡麗', '淡麗'];

function coordLabel(amakara: number, noutan: number) {
  return `${AMAKARA[amakara + 2]} · ${NOUTAN[2 - noutan]}`;
}

const clamp = (n: number) => Math.max(-2, Math.min(2, n));
const clampCell = (n: number) => Math.max(0, Math.min(4, n));

// 甘辛(X: 甘−↔辛+) × 濃淡(Y: 淡麗− top? no — 濃醇 top) discrete 5×5 picker.
// Pair-commit: amakara & noutan are set/cleared together (no partial value).
export function AmakaraNoutanPicker({ amakara, noutan, onChange }: {
  amakara?: number;
  noutan?: number;
  onChange: (v: { amakara?: number; noutan?: number }) => void;
}) {
  const hasValue = amakara !== undefined && noutan !== undefined;
  const [focus, setFocus] = useState(() => ({ ax: amakara ?? 0, nou: noutan ?? 0 }));
  const gridRef = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const pressed = useRef(false);

  const cellKey = (ax: number, nou: number) => `${ax}:${nou}`;

  const commit = (ax: number, nou: number) => {
    setFocus({ ax, nou });
    if (ax !== amakara || nou !== noutan) onChange({ amakara: ax, noutan: nou });
  };

  const commitAndFocus = (ax: number, nou: number) => {
    commit(ax, nou);
    cells.current.get(cellKey(ax, nou))?.focus();
  };

  const clear = () => onChange({ amakara: undefined, noutan: undefined });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); commitAndFocus(clamp(focus.ax - 1), focus.nou); break;
      case 'ArrowRight': e.preventDefault(); commitAndFocus(clamp(focus.ax + 1), focus.nou); break;
      case 'ArrowUp': e.preventDefault(); commitAndFocus(focus.ax, clamp(focus.nou + 1)); break;
      case 'ArrowDown': e.preventDefault(); commitAndFocus(focus.ax, clamp(focus.nou - 1)); break;
      case 'Enter': case ' ': e.preventDefault(); commit(focus.ax, focus.nou); break;
      case 'Delete': case 'Backspace': case 'Escape': e.preventDefault(); clear(); break;
    }
  };

  const coordFromPointer = (e: PointerEvent) => {
    const el = gridRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const col = clampCell(Math.floor(((e.clientX - r.left) / r.width) * 5));
    const row = clampCell(Math.floor(((e.clientY - r.top) / r.height) * 5));
    return { ax: col - 2, nou: 2 - row };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pressed.current = true;
    gridRef.current?.setPointerCapture(e.pointerId);
    const c = coordFromPointer(e);
    if (c) commit(c.ax, c.nou);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pressed.current) return;
    const c = coordFromPointer(e);
    if (c) commit(c.ax, c.nou);
  };
  const onPointerUp = () => { pressed.current = false; };

  return (
    <div className="amakara-noutan-picker">
      <div className="amakara-noutan-picker__pole amakara-noutan-picker__pole--top">濃醇</div>
      <div className="amakara-noutan-picker__mid">
        <div className="amakara-noutan-picker__pole amakara-noutan-picker__pole--left">甘口</div>
        <div
          ref={gridRef}
          className="amakara-noutan-picker__grid"
          role="radiogroup"
          aria-label="甘辛(단맛↔매움)과 농담(진함↔옅음) 2D 위치 선택"
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => {
            const ax = col - 2;
            const nou = 2 - row;
            const selected = hasValue && ax === amakara && nou === noutan;
            const roving = ax === focus.ax && nou === focus.nou;
            return (
              <button
                key={cellKey(ax, nou)}
                ref={(el) => { if (el) cells.current.set(cellKey(ax, nou), el); else cells.current.delete(cellKey(ax, nou)); }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={coordLabel(ax, nou)}
                tabIndex={roving ? 0 : -1}
                className="amakara-noutan-picker__cell"
              />
            );
          }))}
        </div>
        <div className="amakara-noutan-picker__pole amakara-noutan-picker__pole--right">辛口</div>
      </div>
      <div className="amakara-noutan-picker__pole amakara-noutan-picker__pole--bottom">淡麗</div>
      <div className="amakara-noutan-picker__foot">
        <span className="amakara-noutan-picker__readout" aria-live="polite">
          {hasValue ? coordLabel(amakara, noutan) : '미선택'}
        </span>
        {hasValue && (
          <button type="button" className="amakara-noutan-picker__clear" onClick={clear}>
            <X className="size-3.5" />
            선택 해제
          </button>
        )}
      </div>
    </div>
  );
}
