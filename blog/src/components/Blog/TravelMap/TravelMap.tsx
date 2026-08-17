import type { GeoProjection } from 'd3-geo';
import type { MultiPoint } from 'geojson';
import type { CSSProperties } from 'react';

import { geoMercator, geoPath } from 'd3-geo';
import { curveCatmullRom, line } from 'd3-shape';
import { useEffect, useMemo, useRef, useState } from 'react';

import { prefectureCodes } from './prefectures';
import { SpotMarker } from './SpotMarker';
import { TravelMapTooltip } from './TravelMapTooltip';
import type { DiarySpot, TravelMapProps } from './types';
import { useGeoData } from './useGeoData';

import './travel-map.css';

const PADDING = 24;
/** spots 가 한 점에 몰린 날이 지도 전체를 차지하지 않게 하는 최소 폭(도 단위, 약 2km) */
const MIN_SPAN = 0.02;

/**
 * 그날 spots 를 감싸는 사각형. 지도 축척은 배경 GeoJSON 이 아니라 이것에 맞춘다 —
 * 도도부현 전체에 맞추면 하루가 한 도시 안일 때 점이 한 곳에 뭉친다.
 *
 * Polygon 이 아니라 MultiPoint 로 돌려준다. d3-geo 의 ring winding 규약은 GeoJSON 스펙과
 * 반대라, 사각형을 Polygon 으로 만들면 방향을 한 번 틀리는 순간 fitExtent 가 「지구 전체」를
 * 잡아 축척이 통째로 망가진다(같은 이유로 scripts/split-muni-geojson.mjs 가 원본을 뒤집는다).
 * 점 집합에는 winding 이 없어서 그 함정 자체가 사라진다 — bounds 는 어차피 동일하다.
 */
function spotsExtent(spots: DiarySpot[]): MultiPoint {
  const lngs = spots.map(s => s.lng);
  const lats = spots.map(s => s.lat);

  let west = Math.min(...lngs);
  let east = Math.max(...lngs);
  let south = Math.min(...lats);
  let north = Math.max(...lats);

  if (east - west < MIN_SPAN) {
    const mid = (east + west) / 2;
    west = mid - MIN_SPAN / 2;
    east = mid + MIN_SPAN / 2;
  }
  if (north - south < MIN_SPAN) {
    const mid = (north + south) / 2;
    south = mid - MIN_SPAN / 2;
    north = mid + MIN_SPAN / 2;
  }

  // 15% 여백 — 가장자리 spot 이 테두리에 붙지 않게
  const padX = (east - west) * 0.15;
  const padY = (north - south) * 0.15;

  return {
    type: 'MultiPoint',
    coordinates: [
      [west - padX, south - padY],
      [east + padX, north + padY],
    ],
  };
}

/**
 * 방문 순서대로 이은 곡선. 마운트 시 stroke-dashoffset 으로 그려 들어온다.
 * 길이는 DOM 에 붙은 뒤에야 잴 수 있어 한 번 더 렌더한다 — 재기 전에는 숨긴다.
 */
function RoutePath({ spots, projection }: { spots: DiarySpot[]; projection: GeoProjection }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState<number | null>(null);

  const d = useMemo(() => {
    const toPoint = (spot: DiarySpot) => projection([spot.lng, spot.lat]);
    const generator = line<DiarySpot>()
      .x(spot => toPoint(spot)?.[0] ?? 0)
      .y(spot => toPoint(spot)?.[1] ?? 0)
      .curve(curveCatmullRom.alpha(0.5));

    return generator(spots) ?? '';
  }, [spots, projection]);

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

export function TravelMap({ spots, className }: TravelMapProps) {
  // 5. 로컬 state + 파생
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  // 「탭으로」 활성화된 인덱스. active 와 따로 두는 이유는 아래 selectSpot 주석 참조.
  const tappedIndexRef = useRef<number | null>(null);

  const codes = useMemo(() => prefectureCodes(spots.map(s => s.prefecture)), [spots]);
  const geo = useGeoData(codes);

  const projected = useMemo(() => {
    if (geo.status !== 'ready' || dims.width === 0 || dims.height === 0 || spots.length === 0)
      return null;

    const projection = geoMercator().fitExtent(
      [[PADDING, PADDING], [dims.width - PADDING, dims.height - PADDING]],
      spotsExtent(spots),
    );
    return { projection, pathGen: geoPath(projection) };
  }, [geo.status, dims.width, dims.height, spots]);

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

  function selectSpot(spot: DiarySpot, index: number) {
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
    // anchor 가 없으면 스크롤할 곳이 없다 — 활성 상태만 유지한다.
    // 토글로 두면 데스크톱에서 hover 로 뜬 툴팁이 클릭하는 순간 사라지고,
    // 커서가 그대로라 mouseenter 가 다시 안 걸려 툴팁이 돌아오지 않는다.
    // 해제는 터치의 「바깥 탭」(Task 7)이 담당한다.
    if (!spot.anchor) {
      setActiveIndex(index);
      return;
    }

    const target = document.getElementById(spot.anchor);
    if (!target) {
      if (import.meta.env.DEV)
        console.warn(`[TravelMap] anchor #${spot.anchor} 를 찾지 못했습니다 (spot: ${spot.name})`);
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 8. JSX
  if (spots.length === 0) return null;

  const activeSpot = activeIndex === null ? null : spots[activeIndex];
  const activePoint = activeSpot && projected
    ? projected.projection([activeSpot.lng, activeSpot.lat])
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
                  className="tm-muni"
                />
              ))}
            </g>
            {spots.length >= 2 && <RoutePath spots={spots} projection={projected.projection} />}
            <g>
              {spots.map((spot, i) => {
                const point = projected.projection([spot.lng, spot.lat]);
                if (!point) return null;
                return (
                  <SpotMarker
                    key={`${spot.name}-${i}`}
                    spot={spot}
                    index={i}
                    x={point[0]}
                    y={point[1]}
                    active={activeIndex === i}
                    onActivate={setActiveIndex}
                    onDeactivate={deactivate}
                    onSelect={selectSpot}
                  />
                );
              })}
            </g>
          </svg>
        )}
        {activeSpot && activePoint && (
          <TravelMapTooltip
            title={activeSpot.name}
            sub={activeSpot.description ?? activeSpot.city}
            x={activePoint[0]}
            y={activePoint[1]}
            containerWidth={dims.width}
            containerHeight={dims.height}
          />
        )}
      </div>
      <p className="tm-credit">
        출처:
        {' '}
        <a href="https://nlftp.mlit.go.jp/ksj/" target="_blank" rel="noreferrer">
          国土数値情報（行政区域データ）国土交通省
        </a>
      </p>
    </div>
  );
}
