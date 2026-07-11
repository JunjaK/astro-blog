import type { KeyboardEvent, PointerEvent } from 'react';
import { useRef, useState } from 'react';
import { X } from 'lucide-react';

// 8×8 매트릭스 (값 1..8). 甘辛(X): 1=甘口(좌) ↔ 8=辛口(우). 濃淡(Y): 1=淡麗(아래) ↔ 8=濃醇(위).
// 리드아웃/셀 aria-label 공용 포맷 — 5단계 일본어 라벨 폐기, n/8 수치.
function coordLabel(amakara: number, noutan: number) {
  return `甘辛 ${amakara}/8 · 濃淡 ${noutan}/8`;
}

const clampVal = (n: number) => Math.max(1, Math.min(8, n)); // 값 1..8
const clampIdx = (n: number) => Math.max(0, Math.min(7, n)); // 그리드 인덱스 0..7

// 甘辛(X: 甘1↔辛8) × 濃淡(Y: 淡1↔濃8, 濃醇 top) discrete 8×8 picker.
// Pair-commit: amakara & noutan are set/cleared together (no partial value).
export function AmakaraNoutanPicker({ amakara, noutan, onChange }: {
  amakara?: number;
  noutan?: number;
  onChange: (v: { amakara?: number; noutan?: number }) => void;
}) {
  const hasValue = amakara !== undefined && noutan !== undefined;
  const [focus, setFocus] = useState(() => ({ ax: amakara ?? 4, nou: noutan ?? 4 }));
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
      case 'ArrowLeft': e.preventDefault(); commitAndFocus(clampVal(focus.ax - 1), focus.nou); break;
      case 'ArrowRight': e.preventDefault(); commitAndFocus(clampVal(focus.ax + 1), focus.nou); break;
      case 'ArrowUp': e.preventDefault(); commitAndFocus(focus.ax, clampVal(focus.nou + 1)); break;
      case 'ArrowDown': e.preventDefault(); commitAndFocus(focus.ax, clampVal(focus.nou - 1)); break;
      case 'Enter': case ' ': e.preventDefault(); commit(focus.ax, focus.nou); break;
      case 'Delete': case 'Backspace': case 'Escape': e.preventDefault(); clear(); break;
    }
  };

  const coordFromPointer = (e: PointerEvent) => {
    const el = gridRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const col = clampIdx(Math.floor(((e.clientX - r.left) / r.width) * 8));
    const row = clampIdx(Math.floor(((e.clientY - r.top) / r.height) * 8));
    return { ax: col + 1, nou: 8 - row };
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

  // Auxiliary sliders (touch-friendly). Reflect current value or roving focus when unset;
  // moving either commits BOTH axes (pair-commit, mirrors grid). 甘辛=하단 가로, 濃淡=우측 세로.
  const axVal = amakara ?? focus.ax;
  const nouVal = noutan ?? focus.nou;
  const setAx = (v: number) => commit(clampVal(v), noutan ?? focus.nou);
  const setNou = (v: number) => commit(amakara ?? focus.ax, clampVal(v));

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
          {Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => {
            const ax = col + 1; // 1..8, 좌→우 = 甘→辛
            const nou = 8 - row; // 1..8, 아래→위 = 淡→濃 (row 0 top = 8 = 濃醇)
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
      {/* 보조 슬라이더 (터치용). 가로 2개 — 방향이 명확하고 Safari 포함 전 브라우저 안정. pair-commit 동일. */}
      <div className="amakara-noutan-picker__sliders">
        <label className="amakara-noutan-picker__srow">
          <span className="amakara-noutan-picker__scap">甘</span>
          <input
            type="range" min={1} max={8} step={1} value={axVal}
            className="amakara-noutan-picker__slider"
            aria-label="甘辛 (1 甘口 ~ 8 辛口)"
            onChange={(e) => setAx(Number(e.target.value))}
          />
          <span className="amakara-noutan-picker__scap">辛</span>
        </label>
        <label className="amakara-noutan-picker__srow">
          <span className="amakara-noutan-picker__scap">淡</span>
          <input
            type="range" min={1} max={8} step={1} value={nouVal}
            className="amakara-noutan-picker__slider"
            aria-label="濃淡 (1 淡麗 ~ 8 濃醇)"
            onChange={(e) => setNou(Number(e.target.value))}
          />
          <span className="amakara-noutan-picker__scap">濃</span>
        </label>
      </div>
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
