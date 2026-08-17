import type { DiarySpot } from './types';

export type SpotMarkerProps = {
  spot: DiarySpot;
  index: number;
  x: number;
  y: number;
  active: boolean;
  onActivate: (index: number) => void;
  onDeactivate: () => void;
  onSelect: (spot: DiarySpot, index: number) => void;
};

const RADIUS = 8;
const RADIUS_ACTIVE = 11;

export function SpotMarker({ spot, index, x, y, active, onActivate, onDeactivate, onSelect }: SpotMarkerProps) {
  // anchor 가 있으면 본문으로 스크롤, 없으면 툴팁 토글 — 어느 쪽이든 실제 동작이 있으므로
  // role="button" 이 거짓말이 되지 않는다.
  const label = `${index + 1}. ${spot.name}, ${spot.city}${spot.anchor ? ' — 본문으로 이동' : ''}`;

  return (
    <g>
      <circle cx={x} cy={y} r={RADIUS_ACTIVE + 4} className="tm-glow" aria-hidden="true" />
      <circle
        cx={x}
        cy={y}
        r={active ? RADIUS_ACTIVE : RADIUS}
        className="tm-dot"
        role="button"
        tabIndex={0}
        aria-label={label}
        onMouseEnter={() => onActivate(index)}
        onMouseLeave={onDeactivate}
        onFocus={() => onActivate(index)}
        onBlur={onDeactivate}
        onClick={() => onSelect(spot, index)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onSelect(spot, index);
        }}
      />
      <text x={x} y={y} className="tm-num" aria-hidden="true">{index + 1}</text>
    </g>
  );
}
