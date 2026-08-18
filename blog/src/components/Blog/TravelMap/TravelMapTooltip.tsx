export type TravelMapTooltipProps = {
  title: string;
  /** 없으면 city 를 대신 보여준다 — 원문 `방문한 곳` 에서 뽑은 spots 는 설명이 없는 게 보통이다 */
  sub?: string;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
};

/** .tm-tooltip 의 max-width(14rem)와 맞춰둔 값. 넘침 판정에만 쓴다 */
const TOOLTIP_WIDTH = 224;
const OFFSET = 12;
const EDGE = 8;

export function TravelMapTooltip({ title, sub, x, y, containerWidth, containerHeight }: TravelMapTooltipProps) {
  // 오른쪽으로 넘치면 dot 왼편으로 뒤집는다
  const overflowsRight = x + OFFSET + TOOLTIP_WIDTH > containerWidth;
  const left = overflowsRight
    ? Math.max(x - TOOLTIP_WIDTH - OFFSET, EDGE)
    : x + OFFSET;

  // 아래쪽도 컨테이너 안으로 물린다 (2줄 기준 대략 높이)
  const top = Math.min(Math.max(y - 10, EDGE), Math.max(containerHeight - 56, EDGE));

  return (
    <div className="tm-tooltip" style={{ left, top }} role="tooltip">
      <p className="tm-tooltip-title">{title}</p>
      {sub && <p className="tm-tooltip-sub">{sub}</p>}
    </div>
  );
}
