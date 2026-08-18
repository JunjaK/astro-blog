---
title: TravelMap — diary 인터랙티브 루트 지도
status: reference
topic: travel-map
kind: impl
scope: frontend
created: 2026-04-23
updated: 2026-08-18
related: []
---

# TravelMap — diary 인터랙티브 루트 지도

`japan-around-trip` 등 여행 diary 글에서 `### 루트` 의 구글맵 스크린샷과 `### 방문한 곳` 불릿 목록을
인터랙티브 SVG 지도로 대체한다. **앞으로 일본 여행 글을 쓸 때 이 문서를 먼저 본다.**

브랜치 `feat/travel-map` (base `518f863`), 커밋 17개. 적용 완료: 7편
(`14_12-10`, `22_12-18` ~ `27_12-23`). 나머지 편은 미적용 — 아래 「새 글에 적용하기」대로 하면 된다.

---

## 1. 새 글에 적용하기 (저작 가이드)

### 1-1. 데이터 초안 만들기

```bash
cd blog
node scripts/resolve-map-urls.mjs <slug>            # 본문 파싱 + 구글맵 단축 URL 좌표 해석
node scripts/resolve-map-urls.mjs <slug> --dry-run  # 네트워크 없이 파싱만 확인
```

본문 `방문한 곳` 을 읽어 `src/data/diarySpots/<slug>.ts` 초안을 만든다.
`maps.app.goo.gl` 링크가 붙은 항목은 좌표가 자동으로 채워지고, 나머지는 비어서 나온다.
**이미 파일이 있으면 덮지 않고 `.draft.ts` 로 뺀다** — 사람이 채운 좌표를 날리지 않기 위해서다.

### 1-2. 좌표 채우기 — 도시 그룹당 1개면 된다

`lat`/`lng` 는 **선택**이다. 지도 마커는 도시(또는 도도부현) 그룹 단위로 찍히고 그 좌표는 그룹에
속한 장소들의 중심점이므로, **그룹마다 대표 장소 하나만** 있으면 지도가 성립한다.
장소를 전수 조사하는 것은 지금 아무도 쓰지 않는 데이터를 모으는 일이다.

좌표를 구하는 순서:

1. 본문의 구글맵 단축 URL → 스크립트가 자동 (`!3d!4d` = 장소 정확 좌표)
2. OSM Nominatim — 일본어 명칭으로 조회한다. **`countrycodes=jp` 를 붙여도 오매칭이 난다**
3. 구글맵에서 직접 확인. Plus Code(`9397+VM 마쓰시마마치`)를 줘도 된다 — 해당 시정촌 폴리곤의
   중심점을 기준으로 디코드하면 검증 가능한 값만으로 복원된다

> **좌표를 추론하거나 지어내지 않는다.** 미확인 항목은 주석으로 빼두고 `?` 로 남긴다.
> 자리채우기(시정촌 중심점 등)를 넣으면 지도가 조용히 틀린다.
> 출처는 주석으로 남긴다 — `// [OSM] 平湯民俗館`, `// [저자]`, `// [구글맵]`.

### 1-3. anchor 붙이기

마커를 클릭하면 본문 섹션으로 스크롤한다. 그룹 안에서 **처음 만나는 `anchor`** 가 목적지다.

`anchor` 값은 Astro 가 헤딩에 붙이는 id 다. 규칙을 손으로 계산하지 말고 `bun run check-spots` 로
대조한다(내부적으로 Astro 와 같은 `github-slugger` 를 쓴다). 규칙이 미묘하다 —
`—` 는 사라지고 연속 공백이 `--` 가 된다:

```
「아오모리 아침 — 우토우 신사 재방문」  →  아오모리-아침--우토우-신사-재방문
「스시 요시카네 - 사키즈케 ~ 스이모노」  →  스시-요시카네---사키즈케--스이모노
```

**소제목이 없는 편은 anchor 를 비운다.** 27편 중 9편이 `## 일정` 에 소제목이 없다. 그런 편은
클릭해도 툴팁만 뜬다 — 정상 동작이다.

### 1-4. MDX 수정 (편당 3곳)

```mdx
import { TravelMap, VisitedList } from '@/components/Blog/TravelMap';
import { spots } from '@/data/diarySpots/<slug>';

### 루트
<TravelMap spots={spots} originalImageSrc="…기존 루트 스크린샷.webp" client:visible />

### 방문한 곳
<VisitedList spots={spots} />          {/* client:* 없음 — 정적 렌더 */}
```

- 기존 `<ImageLoader>` 루트 스크린샷은 **지우지 말고** `originalImageSrc` 로 넘긴다. `<details>` 안에 보존된다
- `### 방문한 곳` 의 불릿 목록은 지운다. `<VisitedList>` 가 `spots` 에서 다시 렌더한다
- **`<TableOfContents>` 는 손대지 않는다.** 두 헤딩이 그대로 남으므로 목차가 어긋나지 않는다

### 1-5. 검증

```bash
cd blog && bun run check-spots
```

통과해야 배포한다. 체크 9종 — 필수 필드 / **그룹마다 좌표 최소 1개** / `PREFECTURES` 등재 /
좌표가 해당 도도부현 안(해안 1.5km 허용) / anchor 가 실제 헤딩과 일치 / MDX 가 두 컴포넌트를 쓰는지 /
`PREFECTURES` ↔ GeoJSON 파일 1:1 / winding 반전 회귀.

### 1-6. 새 도도부현이 나오면

`PREFECTURES` 에 있는 이름은 **반드시** `public/geo/muni/{code}.json` 이 있어야 한다. 순서:

```bash
# 1) split-muni-geojson.mjs 의 KEEP 에 2자리 코드 추가
# 2) 원본 내려받아 재생성
curl -fL -o .tmp/muni-japan.json \
  https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0001/N03-21_210101.json
node scripts/split-muni-geojson.mjs
# 3) prefectures.ts 에 { code, ja } 한 줄 추가
```

**도서를 가진 현(가고시마·오키나와·시마네)은 `ISLAND_MUNICIPALITIES` 처리가 필요하다** — 아래 §4 참조.

---

## 2. 동작 방식

### 입도 규칙 — 배경과 마커는 항상 같은 단위

| 그 글이 지나는 현 | 배경 | 마커 | 라벨 |
|---|---|---|---|
| 1개 | 시정촌 경계 | 도시 그룹 | 도시명 |
| 2개 이상 | 현 실루엣(내부 경계선 제거) | 도도부현 그룹 | 도도부현명 |

축척은 **그 글이 지나는 도도부현 전체**에 맞춘다. 그룹은 `방문한 곳` 의 상위 항목을 따라
**연속된 같은 단위**만 묶는다 — 하루에 같은 도시를 두 번 들르면 마커도 두 개다(동선이므로).

**「방문한 곳」 목록은 지도 입도와 무관하게 항상 도시 단위**로 장소 전체를 보여준다.
`24_12-20` 은 마커 2개(아오모리현→도쿄도)인데 목록은 도시 4그룹·장소 8곳이다.

### 파일

```
blog/src/components/Blog/TravelMap/
  TravelMap.tsx        지도 본체 (client:visible 아일랜드)
  VisitedList.tsx      「방문한 곳」 목록 — hook 없음, 정적 렌더
  SpotMarker.tsx       번호 dot + glow
  TravelMapTooltip.tsx 툴팁 (컨테이너 밖으로 안 나가게 클램프·반전)
  groupSpots.ts        그룹핑 SSOT — 지도와 목록이 같은 계산을 쓴다
  prefectures.ts       한글 → { 행정구역코드, 일본어 }
  useGeoData.ts        도도부현 다중 fetch + 세션 캐시
  travel-map.css       tm- 프리픽스. CSS 모듈 아님 (저장소 관례)
blog/public/geo/muni/{code}.json   도도부현별 시정촌 경계 16개 · 475KB
blog/scripts/          split-muni-geojson.mjs · resolve-map-urls.mjs · check-diary-spots.ts
blog/e2e/travel-map.noauth.spec.ts
```

d3 는 **지리 연산 전용**(`d3-geo`·`d3-shape`, 합계 ~21KB gzip)이고 DOM 은 React 소유다.
그래서 접근성(마커가 `role="button"`)과 다크모드(CSS 변수)가 공짜로 따라온다.

### GeoJSON 출처

[`smartnews-smri/japan-topography`](https://github.com/smartnews-smri/japan-topography) —
국토수치정보 N03 가공, s0001(간소화 0.1%). 상용 포함 무상이나
**국토교통성 「国土数値情報（行政区域データ）」 표기가 의무**라 컴포넌트가 상시 노출한다.

---

## 3. 결정과 그 이유

원안이 실물에서 뒤집힌 것들. 되돌리려 할 때 같은 함정을 다시 밟지 않도록 남긴다.

| 결정 | 원안 | 확정 | 왜 |
|---|---|---|---|
| 축척 | 그날 spots bbox | **도도부현 전체** | 「시정촌 경계가 도시 스케일에서 텍스처를 준다」가 틀렸다. 다카야마시 하나가 2,166km²(일본 최대 면적 시)라 화면 전체가 시 하나 안이었고, 그릴 경계선이 없어 흰 캔버스에 루트만 떴다 |
| 마커 | 개별 장소 | **도시 그룹 / 다현이면 현 그룹** | 장소 10곳이 유니크 픽셀 7곳에 겹쳐 육안 구분은 3개. 나머지 7개는 **안 보이는데 Tab 으로는 포커스**되는 접근성 결함이었다 |
| 좌표 입도 | 장소별 전수(~215개) | **그룹당 1개** | 마커가 그룹 중심점이 되면서 장소별 좌표는 소비자가 없어졌다 |
| 목록 | 본문에서 삭제 | **spots 에서 재렌더** | 삭제만 하면 3단 중첩과 구글맵 링크가 소실된다. `mapUrl` 필드로 링크까지 보존 |
| 라이브러리 | (후속 계획은 ECharts) | **d3-geo 통일** | canvas 는 a11y 원천 불가, 테마가 CSS 변수 밖, `curveness` 는 호 하나뿐이라 catmull-rom 이 없다 |
| 스타일 | CSS 모듈 | **평범한 `.css` + 프리픽스** | 저장소에 `*.module.*` 사용처가 0. 컴포넌트 하나 때문에 메커니즘을 새로 들이지 않는다 |

---

## 4. 함정 (전부 실제로 겪음)

**d3-geo winding 이 GeoJSON 스펙과 반대다.** 원본은 RFC 7946 대로 외곽 링이 CCW 인데 d3 는 그걸
「이 폴리곤 **바깥** 전부」로 읽는다. `高山市` 가 `geoArea` 12.566 sr(=4π, 지구 전체)로 나오고
`geoPath` 는 화면을 덮는 덩어리를 그린다. `split-muni-geojson.mjs` 의 `toD3Winding()` 이
면적으로 판정해 뒤집는다(자기교정). **결과 파일은 「d3 전용」이고 RFC 7946 을 따르지 않는다.**
직접 GeoJSON 을 만들 때도 같은 함정이 있다 — 점 집합(`MultiPoint`)에는 winding 이 없다.

**원거리 도서.** 도도부현 fit 이므로 도쿄도를 그대로 두면 오가사와라·이즈 제도 때문에
남북 1,237km 가 잡혀 23구가 점이 된다. 이름으로 6곳을 제외해 135km. **거리 임계값 자동판정은
쓰면 안 된다** — 니이가타 `糸魚川市` 는 현 중심에서 1.1° 떨어졌지만 본토 도시라 같이 잘려나간다.

**해안선 단순화.** s0001 은 해안이 거칠어 해안 장소가 폴리곤 밖으로 떨어진다(마쓰시마 200m).
검증은 「폴리곤 안 **또는 경계 1.5km 이내**」로 한다. 엄격하면 거짓 실패가 난다.

**지오코딩 오매칭.** 검증 없이 믿으면 지도가 조용히 틀린다. 실제로 잡힌 것:

```
平湯神社 → 중국 선전(深圳)의 학교        (countrycodes=jp 이후에도 오사카·사가·아키타 오답)
仙台駅   → 오카야마현 구라시키시
```

**헤딩 매칭.** `## 루트 및 방문한 곳` 이 있으므로 `/^#+\s*루트/` 로 찾으면 그 줄이 먼저 잡혀
`### 루트` 안의 스크린샷을 놓친다. `/^#{2,6}\s+루트$/` 처럼 끝을 고정한다.

**`<details>` 안의 요소는 `getBoundingClientRect()` 가 값을 돌려준다.** 접혔는지 판정하려면
`checkVisibility()` 를 쓴다.

**의존성을 추가하면 dev 서버를 재기동한다.** Vite 사전번들이 낡아 `504 Outdated Optimize Dep` 으로
아일랜드가 하이드레이션되지 않는다(`astro.config.mjs` 에도 같은 경고가 있다).

**터치에서 `mouseenter` 는 뜬다.** 탭하면 `mouseover → mouseenter → pointerdown → click` 순으로
호환 마우스 이벤트가 발생한다. two-tap 판정에 `activeIndex` 를 쓰면 첫 탭이 두 번째 탭으로 오인돼
붕괴한다 → 「탭으로 활성화된 인덱스」를 별도 ref 로 추적한다.

**상호작용 요소를 품은 `<svg>` 는 `role="group"`.** `role="img"` 는 하위 트리를 presentational 로
만들어 안의 마커 버튼에 스크린리더가 도달하지 못한다.

---

## 5. 원문 데이터 정정 (저자 확인)

`방문한 곳` 원문에는 결함이 있다. 새 편을 쓸 때도 같은 종류가 나올 수 있다.

| 원문 | 정정 | 근거 |
|---|---|---|
| `아오모리현 후쿠우라지마` | 후카우라마치 | 不老ふ死温泉 은 深浦町 소재 (OSM 주소) |
| `아오모리현 이시에시` | 아오모리시 | 石江 는 아오모리시 지구. 新青森駅 주소가 「石江, 青森市」 |
| `미야기현 센다이 시` / `센다이시 ` | 미야기현 센다이시 | 띄어쓰기·도도부현 누락 |
| `마츠시마 가이칸` | 미야기현 마쓰시마쵸 | 松島海岸. 도도부현도 도시명도 아님 |
| `이시키와현` (4건) | 이시카와현 | 오타. `PREFECTURES` 타입에서 걸린다 |

**도쿄 지구는 상위 항목으로 쓴다.** `25_12-21` 은 `도쿄도 도쿄` 아래에 지구를 하위로 뒀는데
그러면 마커가 도쿄에 1개만 찍혀 시내 동선이 사라진다. `24_12-20` 처럼 지구를 상위로 올린다.

전체 파싱 실측(27편): 장소 215, 구글맵 URL 62(29%). 표기 4종 —
중첩 불릿 / `— A, B, C` 인라인 / 3단 중첩(10편) / 하위 항목 안의 `—`.
`02_11-28` 만 `## 방문한 곳`(레벨 예외)이라 파서는 `^#+` 로 찾는다.
`01_intro` 는 섹션이 없다(정상). `28_12-24` 는 상위 항목만 있고 `인천`(일본 아님)이 섞여 있다.

---

## 6. 검증 현황

- `bun run check-spots` — 7편 · GeoJSON 16개 통과. **일부러 망가뜨려 각 체크가 잡는지 확인함**
- `bun x playwright test travel-map` — chromium 12 + mobile-chrome 11 통과, 실패 0
  (skip 3 은 데스크톱/모바일 전용). two-tap 은 Pixel 5 에서 `pointer:coarse` 참인 채로 실제 실행
- `bun astro check` — net-new 0 (기존 15 errors 는 이 작업과 무관)
- 전편 마커 겹침 0 (마커 수 == 유니크 픽셀 위치 수)

**미검증 1건:** 루트 draw-in 애니메이션이 800ms 동안 그려지는 **장면**은 관측하지 못했다.
headless 가 `prefers-reduced-motion: reduce` 를 강제해 즉시 종료 상태가 된다. 구조는 확인했다
(길이 실측 630.4 · dasharray 해석 · keyframes 존재 · `getAnimations()` 반환 · 가드 동작).

---

## 7. 후속

[`japan-trip-map` playground](../../active/planning/2026-08-16/2026-08-16-japan-trip-map-final.md)
가 이 기능의 산출물을 받는다 — `diarySpots/*.ts`(도시 좌표를 여기서 도출), `prefectures.ts` 의
`ja` 필드, `useGeoData`, `SpotMarker` 의 접근성 규칙과 크레딧 블록. 복사하지 말고 import 한다.

미적용 편(20편)은 §1 대로 진행하면 된다. 착수 전 `PREFECTURES` 에 없는 도도부현이 나오는지
먼저 확인할 것.
