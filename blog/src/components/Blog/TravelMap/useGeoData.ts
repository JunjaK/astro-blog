import type { Feature, FeatureCollection, Geometry } from 'geojson';

import { useEffect, useState } from 'react';

/** split-muni-geojson.mjs 가 남기는 property 는 name 하나뿐이다 */
export type MuniProperties = { name: string };
export type MuniFeature = Feature<Geometry, MuniProperties>;
export type MuniCollection = FeatureCollection<Geometry, MuniProperties>;

export type UseGeoDataResult =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: MuniCollection; error: null }
  | { status: 'error'; data: null; error: Error };

// URL 단위 모듈 캐시. 한 페이지에 지도가 여러 개거나 같은 현을 쓰는 글을 오가도 재요청하지 않는다.
const cache = new Map<string, Promise<MuniCollection>>();

function load(code: string) {
  const url = `/geo/muni/${code}.json`;
  let entry = cache.get(url);

  if (!entry) {
    entry = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`GeoJSON fetch failed: ${url} ${res.status}`);
      return res.json() as Promise<MuniCollection>;
    });
    // 실패한 Promise 를 캐시에 남기면 재시도가 영영 안 된다.
    // 여기서 한 번 잡아두면 소비자가 붙기 전 rejection 이 unhandled 로 새지도 않는다.
    entry.catch(() => cache.delete(url));
    cache.set(url, entry);
  }

  return entry;
}

/**
 * 도도부현 코드 배열을 받아 필요한 GeoJSON 만 받고 하나의 FeatureCollection 으로 합친다.
 * 코드가 비면 빈 컬렉션을 ready 로 돌려준다 (spots 가 없는 글).
 */
export function useGeoData(codes: readonly string[]): UseGeoDataResult {
  // 배열 prop 은 매 렌더 새 참조라 그대로 의존성에 넣으면 무한 fetch 가 된다.
  // 정렬된 문자열 키로 바꿔 원시값 비교가 되게 한다.
  const key = [...new Set(codes)].sort().join(',');

  const [state, setState] = useState<UseGeoDataResult>({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    Promise.all(key.split(',').filter(Boolean).map(load))
      .then((parts) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          data: { type: 'FeatureCollection', features: parts.flatMap(part => part.features) },
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });

    return () => { cancelled = true; };
  }, [key]);

  return state;
}
