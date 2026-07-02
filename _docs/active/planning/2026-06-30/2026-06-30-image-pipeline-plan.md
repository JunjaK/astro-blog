# 이미지 파이프라인 계획 — 변형(variant) 생성 + 카탈로그 DB

**작성일:** 2026-06-30
**상태:** 구현 완료 (2026-07-03) — P1–P5의 **리버서블·로컬 부분 전부 실행+커밋**; 파일 삭제·RPi 변형 생성·배포는 사용자 게이트 대기. 적대적 리뷰 1회 + 수정 9건 반영.
> 커밋: P1 `0b4eb35` · P2/P3 `a18f236` · P3 `c4aaa9f` · P4 `7751c3a` · P5스크립트 `da1486c` · 리뷰수정 `08d646c` · P5마이그레이션 `817d27c`. (브랜치 `fix/blog-hydration-418`, 미푸시)
**연관:** [[2026-06-28-blog-editor-app-plan]] (D8 데이터모델, 발행 마일스톤 ①), [[CLAUDE.md]] Image Assets
**제약(사용자 확정):** 외부 서비스 금지(Cloudflare Image Resizing/Polish, thumbor 등 ✗). **`sharp` + 정적 파일**만. 자가호스팅(RPi), monochrome 톤 유지.

---

## 1. 문제

- 블로그 글(특히 diary)에 이미지 **20장+**. 표시 크기(캐러셀 ≈360px 칸, 인라인 ≈720px)와 무관하게 **2000px 원본 그대로** 전송 → reader 페이지 로딩이 수십 MB.
- `DiaryCarousel.tsx`엔 이미 `loading=lazy` + `decoding=async` + `contentVisibility:auto` 적용됨 → **개수/지연 레버는 이미 당겨짐. 남은 건 byte(원본 크기) 레버 하나.**
- `ImageLoader.astro`도 `loading=lazy`만 있고 원본 크기 그대로.
- 블로그 image service = `passthroughImageService()`(최적화 off), `/files`는 런타임 서빙이라 Astro `<Image>` 빌드 최적화 대상도 아님.

## 2. 환경 전환 (중요 — 사용자 확정)

- **로컬 `blog/image-assets` 전부 삭제 예정.** 그건 에디터 없던 시절 Typora→MDX 변환 후 *렌더링 검증용*으로 두던 것. 에디터가 그 워크플로를 대체 → 더 이상 로컬 이미지 보관 안 함.
- ⇒ 이미지는 **RPi `/home/jun/blog-files`(=`/files`)에만** 존재. 블로그 빌드(GitHub Actions)엔 로컬 이미지 없음.
- ⇒ 블로그 dev `/files` 미들웨어는 로컬 부재 시 prod 프록시(이미 그렇게 동작) → dev에서도 이미지 보임.
- ⇒ **변형 생성·치수 정보는 전부 RPi/DB 기준**으로 설계(로컬 image-size 읽기 불가).

## 3. 핵심 아키텍처 — DB=소스 / 컨벤션+매니페스트=투영 (D8과 동일 철학)

| 계층 | 역할 |
|---|---|
| **변형 파일** (`.v/foo.<w>.webp`) | 정적 산출물, nginx 서빙. **원본 경로에서 순수 문자열 변환으로 도출** → 블로그가 `srcset`을 컨벤션만으로 방출 |
| **`images` 카탈로그 DB** (에디터, RPi SQLite) | 관리 소스 — 원본↔변형 연결, dedup(해시), 사용처(고아 탐지), 배치 진행, **치수(w/h)** |
| **`image-manifest.json`** (DB→블로그 투영) | path→{w,h} 만. 블로그 빌드가 import해 `width/height` 부여(레이아웃시프트 제거). 로컬 이미지 없으니 이 투영이 치수 공급원 |
| **블로그 컴포넌트** | 원본 경로 → 컨벤션 `srcset` + 매니페스트 `width/height`. 변형 없으면 `onError`→원본 폴백 |

> **DB가 죽어도 블로그는 빌드/서빙된다** — 변형 URL은 컨벤션, 치수만 매니페스트. DB는 *배치/관리* 도구.

## 4. 결정 (D-numbered)

- **D1 변형 사이즈:** `480 / 960 / 1600` (+ `full`) webp, q80.
  - **갤러리 슬라이드(≈360px) → 480.** **일반 인라인 이미지(≈720px, 더 크게 표시) → 기본 960** (480이면 깨져 보임 — 사용자 지적). 인라인 srcset 480/960/1600. 라이트박스/확대 → `full`.
- **D2 포맷:** **webp만**(avif는 RPi 인코딩 비용↑, 보류).
- **D3 네이밍(순수 도출):** 원본 `/files/<dir>/foo.png` → 변형 `/files/<dir>/.v/foo.<size>.webp`. 블로그·에디터 공용 `variant(src, size)` 한 함수.
- **D4 원본 미보존(사용자 확정):** 진짜 원본은 **사용자 클라우드에 백업** → 서버엔 보존 안 함. **전부 webp 변환.** `full` = **원본 해상도 webp**(이전 2k 강제 캡 **해제** — 썸네일/변형이 표시를 담당). 초대형(>~2560px)만 라이트박스 부담 줄이려 sane cap 선택 가능.
- **D5 매니페스트(필요):** 로컬 image-assets 삭제로 빌드가 로컬 이미지를 못 읽음 → `images` DB에서 **`image-manifest.json`(path→{w,h}) 투영**을 만들어 블로그가 소비. 캐러셀은 고정 aspect 컨테이너라 매니페스트 불필요(인라인 이미지에만 필요).
- **D6 변형 생성 위치(RPi):** **RPi에서 생성**(`/files`가 거기). 에디터 Hono+sharp의 ① 배치 스크립트(기존 전량) + ② 업로드 시점(신규). 로컬 생성/rsync(`/publish-images`) 워크플로 은퇴.
- **D7 cover = 글 내부 이미지 재사용(사용자 확정, dedup 목적):** 별도 `*-thumb.webp` 크롭 파일 폐지. **글 대표이미지 = 본문에 이미 있는 이미지 중 적당한 것 선택** → frontmatter `thumbnail:`이 그 원본 `/files/...`를 가리킴 → 카드에선 그 이미지의 480 변형을 `object-cover`로 프레이밍(CSS). **중복 파일 0.** 에디터 ThumbnailInput = 업로드/크롭 → **본문 이미지에서 선택**으로 변경.

## 5. 데이터 처리 (기존 전량 마이그레이션) — 위험, 단계적 + dry-run

> 이미지 + MDX frontmatter/body 참조가 걸린 마이그레이션. **참조 재작성 전 삭제 절대 금지.** 각 단계 dry-run + (클라우드 외) 백업.

1. **인벤토리** — RPi `/files` 전 이미지 스캔. 원본 vs 기존 분리 thumb(`-thumb.webp` 등) 구분.
2. **변형 생성** — 모든 *원본*에 `.v/<size>.webp`(480/960/1600/full) 생성(idempotent). mov/gif/mp4 스킵.
3. **카탈로그 적재** — 각 원본 → `images` 행(해시/치수/바이트). 해시로 dedup 발견. `image-manifest.json` 출력.
4. **cover 재작성(dedup)** — 각 글의 frontmatter `thumbnail:`을 **본문에 있는 이미지 중 하나의 원본 경로**로 치환(기존 분리 thumb는 본문 이미지와 중복이므로). 인라인 본문 이미지 경로는 **원본 그대로 유지**(블로그가 컨벤션으로 변형 도출 → body 수정 불필요).
5. **검증** — 빌드 + 링크 체커: 모든 참조가 실제 파일로 해소되는지.
6. **정리** — 검증 통과 후에만 구 분리 thumb 파일 삭제.

> **dedup 원칙(사용자 확정):** cover는 본문 이미지를 재사용(별도 파일 0). 기존 `-thumb.webp`는 본문과 중복 → frontmatter 재작성 → 빌드 검증 → 구 thumb 삭제. **삭제는 항상 재작성·검증 다음.**

## 6. 컴포넌트 고도화

- **공통 헬퍼** `blog/src/utils/imageVariant.ts`: `variant(src, size)`(D3), `srcsetFor(src)`, 매니페스트 `dims(src)`.
- **`DiaryCarousel.tsx`** (변경 최소): 슬라이드 `<img src>` → `variant(item.src,'480')` + `srcSet`/`sizes` + `onError`→`item.src`. **라이트박스 items → `variant(item.src,'full')`.** lazy/contentVisibility 유지.
- **`ImageLoader.astro`** (일반 이미지 — 갤러리보다 크게 표시되니 **기본 960**): `srcset`(480/960/1600)+`sizes`+`width`/`height`(매니페스트). lightbox(`data-lightbox`)=`full`. `loading=lazy` 유지.
- **`ImageLoader.tsx`**(hover-lens)/**Polaroid***: 동일 헬퍼. Polaroid 썸네일=480, 확대=full.

## 7. 에디터 저장 흐름 (신규 업로드) — 사용자 [컴포넌트 고도화]

```
업로드(저장 시) → webp 변환 (2k 캡 해제, full=원본 해상도)
  → 변형 480/960/1600 생성 (server/images.ts 공유 모듈)
  → images 행 upsert (해시 dedup) + image-manifest 갱신
  → 본문엔 원본 /files/media/<hash>.webp 그대로
```

- 공유 모듈 **`editor/server/images.ts`**: `generateVariants(buf, baseName, outDir) → {w,h,bytes,hash}`. media 엔드포인트 + 배치 CLI 공용.
- 갤러리 추가분도 동일(`flushUploads`의 blob→업로드 경로에 변형 훅).
- **에디터 미리보기 변형:** 갤러리 썸네일 480, **단일 이미지(MdxMedia) 960**(작으면 깨져 보임).

## 8. DB 스키마 (추가)

```sql
CREATE TABLE IF NOT EXISTS images (
  path        TEXT PRIMARY KEY,   -- 정규 /files/... 원본 경로
  hash        TEXT NOT NULL,      -- 원본 내용 sha256(16hex) → dedup
  ext         TEXT,
  width       INTEGER, height INTEGER, bytes INTEGER,
  variants    INTEGER NOT NULL DEFAULT 0,  -- 변형 생성 완료 플래그
  created_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash);

CREATE TABLE IF NOT EXISTS image_usage (   -- 어떤 글이 어떤 이미지를 쓰나(고아/역추적)
  image_path  TEXT NOT NULL,
  post_id     TEXT NOT NULL,
  PRIMARY KEY (image_path, post_id)
);
```

- `image_usage`는 글 저장 시 body에서 `/files/[^"')\s]+` 추출해 갱신.
- **자산관리(사용자 요청)**: dedup=hash 그룹, 고아=`image_usage` 없는 `images`, 재사용/cover선택 UI=`images` 조회. 전부 이 스키마로 충족.

## 9. 단계 (phasing) — 실행 현황

1. ✅ **P1** — `variant()`/`srcSet()` 헬퍼 + `DiaryCarousel` 슬라이드(480)/라이트박스(원본) + 대상 글 변형. `0b4eb35`.
2. ✅ **P2** — `image-manifest.json`(1292장, sharp metadata·EXIF-orient 보정) + `imageVariant.size()` + 에디터 `server/images.ts` + `images`/`image_usage` 카탈로그. 블로그 매니페스트 커밋됨(image-assets 삭제 후 생존). `a18f236`,`7751c3a`. *(RPi 전량 변형 파일 생성은 게이트 §외)*
3. ✅ **P3** — `ImageLoader.astro`/`.tsx` srcset(480/960/1600)+치수+클릭원본, Polaroid는 P5에서 배선. `a18f236`,`c4aaa9f`,`817d27c`.
4. ✅ **P4(저장 훅)** — media 변형+카탈로그+usage, 2k캡→4096, try/catch, HEIC MIME. `7751c3a`,`08d646c`. *(cover=본문선택 ThumbnailInput UX는 보류 — 기존글은 P5가 dedup)*
5. 🟡 **P5** — cover 재작성(52/52)+소비처 변형 배선+generateThumbnails 은퇴 **실행 완료** `817d27c`. **게이트 대기**: 구 `-thumb.webp` 70개 삭제, 로컬 image-assets 삭제, RPi 변형 생성.
6. ⬜ **P6(선택)** — 에디터 자산 UI(재사용/고아정리). 카탈로그 DB·usage 준비됨, UI만 남음.

### 리뷰 반영 (적대적 리뷰 1회)
onError 무한리로드(터미널 폴백), HEIC octet-stream MIME 허용, media 4096 cap(RPi OOM), 고아파일 unlink, setImageUsage 트랜잭션, isVariant 정밀화(`-480/960/1600`), EXIF orient 치수, migrate `$` replacer. skip(안전): srcset sub-tier descriptor, migrate base-order latent.

## 10. 열린 질문

- ✅ **Q1(해결):** cover = 본문 이미지 재사용, 구 thumb 제거(dedup).
- ✅ **Q2(해결):** 원본 미보존(클라우드 백업), 전부 webp, 2k 캡 해제.
- **Q3** avif 추가? RPi 인코딩 비용 — 보류 추천.
- **Q4** **P1 체감 슬라이스 먼저** vs P2 배치/DB 먼저? 추천: **P1**.
