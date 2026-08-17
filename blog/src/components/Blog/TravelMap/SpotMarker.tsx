export type SpotMarkerProps = {
  index: number;
  x: number;
  y: number;
  /** 스크린리더용. 도시명과 장소 수를 담는다 */
  label: string;
  active: boolean;
  onActivate: (index: number) => void;
  onDeactivate: () => void;
  onSelect: (index: number) => void;
};

const RADIUS = 8;
const RADIUS_ACTIVE = 11;

export function SpotMarker({ index, x, y, label, active, onActivate, onDeactivate, onSelect }: SpotMarkerProps) {
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
        onClick={() => onSelect(index)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onSelect(index);
        }}
      />
      <text x={x} y={y} className="tm-num" aria-hidden="true">{index + 1}</text>
    </g>
  );
}
