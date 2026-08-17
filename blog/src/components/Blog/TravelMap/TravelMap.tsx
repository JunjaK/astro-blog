import type { GeoProjection } from 'd3-geo';
import type { CSSProperties } from 'react';

import { geoMercator, geoPath } from 'd3-geo';
import { curveCatmullRom, line } from 'd3-shape';
import { useEffect, useMemo, useRef, useState } from 'react';

import { groupAnchor, groupSpotsByCity, isPlottable } from './groupSpots';
import { prefectureCodes } from './prefectures';
import { SpotMarker } from './SpotMarker';
import { TravelMapTooltip } from './TravelMapTooltip';
import type { TravelMapProps } from './types';
import { useGeoData } from './useGeoData';

import './travel-map.css';

const PADDING = 24;
/**
 * 방문 순서대로 이은 곡선. 마운트 시 stroke-dashoffset 으로 그려 들어온다.
 * 길이는 DOM 에 붙은 뒤에야 잴 수 있어 한 번 더 렌더한다 — 재기 전에는 숨긴다.
 */
type RoutePoint = { lat: number; lng: number };

function RoutePath({ points, projection }: { points: RoutePoint[]; projection: GeoProjection }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState<number | null>(null);

  const d = useMemo(() => {
    const toPoint = (point: RoutePoint) => projection([point.lng, point.lat]);
    const generator = line<RoutePoint>()
      .x(point => toPoint(point)?.[0] ?? 0)
      .y(point => toPoint(point)?.[1] ?? 0)
      .curve(curveCatmullRom.alpha(0.5));

    return generator(points) ?? '';
  }, [points, projection]);

  useEffect(() => {
    setLength(pathRef.current?.getTotalLength() ?? null);
  }, [d]);

  return (
    <path
      ref={pathRef}
      d={d}
      className={length === null ? 'tm-route' : 'tm-route tm-route-draw'}
      // visibility 는 레이아웃을 유지해서 getTotalLength() 가 그대로 동작한다 (display:none 은 안 된다)
      style={length === null
        ? { visibility: 'hidden' }
        : { '--tm-route-length': length } as CSSProperties}
    />
  );
}

export function TravelMap({ spots, originalImageSrc, className }: TravelMapProps) {
  // 5. 로컬 state + 파생
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  // 「탭으로」 활성화된 인덱스. active 와 따로 두는 이유는 아래 selectSpot 주석 참조.
  const tappedIndexRef = useRef<number | null>(null);

  const codes = useMemo(() => prefectureCodes(spots.map(s => s.prefecture)), [spots]);
  const geo = useGeoData(codes);

  // 마커는 장소가 아니라 **도시 그룹** 단위다 (groupSpots.ts 주석 참조).
  // 상세 장소는 VisitedList 가 같은 그룹핑으로 전부 보여준다.
  const groups = useMemo(() => groupSpotsByCity(spots), [spots]);
  // 좌표가 하나도 없는 도시 그룹은 지도에 못 찍는다. 목록(VisitedList)에는 그대로 남는다.
  const plotted = useMemo(() => groups.filter(isPlottable), [groups]);

  // 축척은 그날 spots 의 bbox 가 아니라 **도도부현 전체**에 맞춘다.
  // spots bbox 로 맞춰봤더니(2026-08-17 실측) 다카야마시 하나가 2,166km² 라 하루 동선
  // 축척에서는 화면 전체가 시 하나 안이었다 — 그릴 경계선이 없어 흰 캔버스에 루트만 떠 있었다.
  // 현 단위로 빼면 시정촌 경계가 배경으로 살아난다.
  // (원거리 도서는 split-muni-geojson.mjs 에서 제외했다. 안 빼면 도쿄도가 남북 1,237km 다.)
  const projected = useMemo(() => {
    if (geo.status !== 'ready' || dims.width === 0 || dims.height === 0 || geo.data.features.length === 0)
      return null;

    const projection = geoMercator().fitExtent(
      [[PADDING, PADDING], [dims.width - PADDING, dims.height - PADDING]],
      geo.data,
    );
    return { projection, pathGen: geoPath(projection) };
  }, [geo, dims.width, dims.height]);

  // 6. 부수효과 — 컨테이너 크기 추적 (viewBox 재계산 → 리플로우)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ width, height });
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [spots.length]);

  // 마운트 후에 읽는다 — SSR 에는 window 가 없고, 이 값은 렌더 결과가 아니라 핸들러 동작만 바꾼다
  useEffect(() => {
    setIsCoarsePointer(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // 7. 핸들러
  function deactivate() {
    setActiveIndex(null);
    tappedIndexRef.current = null;
  }

  function selectGroup(index: number) {
    // 터치: 첫 탭은 툴팁만, 같은 마커 두 번째 탭에서 이동한다.
    //
    // 판정에 activeIndex 를 쓰면 안 된다 — Android Chrome 은 탭 후 호환용 마우스 이벤트를
    // (mouseenter → click 순으로) 발생시켜서, click 시점엔 이미 mouseenter 가 활성화를
    // 끝낸 뒤다. 그러면 첫 탭이 곧바로 두 번째 탭으로 오인돼 two-tap 이 붕괴한다.
    // 그래서 「탭으로 활성화됐는가」를 별도 ref 로 추적한다 — hover/focus 가 뭘 하든 무관해진다.
    if (isCoarsePointer && tappedIndexRef.current !== index) {
      tappedIndexRef.current = index;
      setActiveIndex(index);
      return;
    }
    tappedIndexRef.current = index;

    const group = plotted[index];
    const anchor = group && groupAnchor(group);

    // anchor 가 없으면 스크롤할 곳이 없다 — 활성 상태만 유지한다.
    // 토글로 두면 데스크톱에서 hover 로 뜬 툴팁이 클릭하는 순간 사라지고,
    // 커서가 그대로라 mouseenter 가 다시 안 걸려 툴팁이 돌아오지 않는다.
    // 해제는 터치의 「바깥 탭」(Task 7)이 담당한다.
    if (!anchor) {
      setActiveIndex(index);
      return;
    }

    const target = document.getElementById(anchor);
    if (!target) {
      if (import.meta.env.DEV)
        console.warn(`[TravelMap] anchor #${anchor} 를 찾지 못했습니다 (${group.city})`);
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 8. JSX
  if (plotted.length === 0) return null;

  const activeGroup = activeIndex === null ? null : plotted[activeIndex];
  const activePoint = activeGroup && projected
    ? projected.projection([activeGroup.lng, activeGroup.lat])
    : null;

  return (
    <div className={className}>
      <div
        ref={wrapperRef}
        className="tm-wrapper"
        // 터치에서 마커 바깥을 탭하면 해제. 데스크톱은 mouseleave 가 알아서 한다.
        onClick={(event) => {
          if (!isCoarsePointer) return;
          if ((event.target as Element).closest('.tm-dot')) return;
          deactivate();
        }}
      >
        {geo.status === 'loading' && <div className="tm-loading">지도 불러오는 중…</div>}
        {geo.status === 'error' && <div className="tm-error">지도를 불러오지 못했습니다</div>}
        {geo.status === 'ready' && projected && (
          <svg
            className="tm-svg"
            viewBox={`0 0 ${dims.width} ${dims.height}`}
            preserveAspectRatio="xMidYMid meet"
            // role="img" 를 쓰면 하위 트리가 presentational 이 돼 안의 마커 버튼에
            // 스크린리더가 도달하지 못한다. 상호작용 요소를 품은 SVG 는 group 이다.
            role="group"
            aria-label="여행 루트 지도"
          >
            <g>
              {geo.data.features.map((feature, i) => (
                <path
                  // GeoJSON feature 에 안정적인 id 가 없다. 배열 순서가 파일 순서라 고정이다.
                  key={feature.properties.name || i}
                  d={projected.pathGen(feature) ?? ''}
                  // 2개 이상 현이면 현 단위 실루엣으로 (내부 경계선 제거)
                  className={codes.length >= 2 ? 'tm-muni tm-muni--plain' : 'tm-muni'}
                />
              ))}
            </g>
            {plotted.length >= 2 && <RoutePath points={plotted} projection={projected.projection} />}
            {/* 도시 라벨은 마커보다 **먼저** 그린다. SVG 는 문서 순서가 paint 순서라
                겹칠 때 마커가 위로 올라온다 (라벨이 가려지는 건 허용) */}
            <g>
              {plotted.map((group, i) => {
                const point = projected.projection([group.lng, group.lat]);
                if (!point) return null;
                return (
                  <text
                    key={`label-${group.city}-${i}`}
                    x={point[0]}
                    y={point[1] + 22}
                    className="tm-city"
                    aria-hidden="true"
                  >
                    {group.city}
                  </text>
                );
              })}
            </g>
            <g>
              {plotted.map((group, i) => {
                const point = projected.projection([group.lng, group.lat]);
                if (!point) return null;
                return (
                  <SpotMarker
                    key={`marker-${group.city}-${i}`}
                    index={i}
                    x={point[0]}
                    y={point[1]}
                    label={`${i + 1}. ${group.prefecture} ${group.city}, ${group.spots.length}곳${groupAnchor(group) ? ' — 본문으로 이동' : ''}`}
                    active={activeIndex === i}
                    onActivate={setActiveIndex}
                    onDeactivate={deactivate}
                    onSelect={selectGroup}
                  />
                );
              })}
            </g>
          </svg>
        )}
        {activeGroup && activePoint && (
          <TravelMapTooltip
            title={`${activeGroup.prefecture} ${activeGroup.city}`}
            sub={activeGroup.spots.map(spot => spot.name).join(' · ')}
            x={activePoint[0]}
            y={activePoint[1]}
            containerWidth={dims.width}
            containerHeight={dims.height}
          />
        )}
      </div>
      {/* 라이선스 의무 표기. 지도를 못 그렸으면 쓴 데이터가 없으므로 표기도 하지 않는다 */}
      {geo.status !== 'error' && (
        <p className="tm-credit">
          출처:
          {' '}
          <a href="https://nlftp.mlit.go.jp/ksj/" target="_blank" rel="noreferrer">
            国土数値情報（行政区域データ）国土交通省
          </a>
        </p>
      )}
      {originalImageSrc && (geo.status === 'error'
        // 지도가 죽으면 스크린샷이 대체재가 아니라 본문이 된다 — 접어두지 않는다
        ? (
            <img className="tm-fallback" src={originalImageSrc} alt="여행 루트 (원본 구글 맵 스크린샷)" />
          )
        : (
            <details className="tm-details">
              <summary>구글 맵 원본 보기</summary>
              <img src={originalImageSrc} alt="여행 루트 (원본 구글 맵 스크린샷)" />
            </details>
          ))}
    </div>
  );
}
