---
name: jun-devlog
description: 차분한 전시장 — 중립 zinc 프레임 위에 emerald 한 가닥, 콘텐츠가 주인공인 개인 개발 블로그
colors:
  emerald-accent: "#059669"
  emerald-link: "#10b981"
  emerald-wash: "#ecfdf5"
  ink-title: "#27272a"
  ink-body: "#3f3f46"
  ink-muted: "#71717a"
  surface: "#ffffff"
  surface-alt: "#f4f4f5"
  border: "#e4e4e7"
  ink-title-dark: "#f4f4f5"
  ink-body-dark: "#d4d4d8"
  ink-muted-dark: "#a1a1aa"
  surface-dark: "#09090b"
typography:
  page-title:
    fontFamily: "Roboto, 'M PLUS 1p', 'Noto Sans KR Variable', sans-serif"
    fontSize: "clamp(1.5rem, 1.05rem + 1.9vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Roboto, 'M PLUS 1p', 'Noto Sans KR Variable', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Roboto, 'M PLUS 1p', 'Noto Sans KR Variable', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  subtitle:
    fontFamily: "Roboto, 'M PLUS 1p', 'Noto Sans KR Variable', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Roboto, 'M PLUS 1p', 'Noto Sans KR Variable', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Roboto, 'M PLUS 1p', 'Noto Sans KR Variable', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Roboto, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0.04em"
  handwriting:
    fontFamily: "Caveat, 'Segoe Script', cursive"
    fontSize: "1.25rem"
    fontWeight: 600
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.emerald-accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.md}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: jun-devlog

## 1. Overview

**Creative North Star: "차분한 전시장 (The Calm Gallery)"**

콘텐츠가 전시물이다. 글과 사진이 벽에 걸린 작품이고, 인터페이스는 그것을 받치는 중립적인 전시장 벽이다. 배경은 조용한 zinc 무채색, 길찾기는 단 한 가닥의 emerald 녹색으로만 한다. 방문자가 about(이력서), project(포폴), blog(일기), playground(실험)를 오갈 때 콘텐츠의 온도는 바뀌어도 전시장 자체는 늘 같은 차분한 프레임이어야 한다.

이 시스템은 명시적으로 거부한다: 양산형 템플릿/Medium 느낌, 기업 SaaS 랜딩(히어로-메트릭·과장 CTA), 콘텐츠보다 시선을 끄는 장식 과잉, 검은바탕 형광색 dev-edgy. 신뢰는 화려함이 아니라 정밀함과 일관성에서 나온다.

핵심 제약: `project`와 `playground`는 한 리스팅 템플릿을 공유하고 `home`은 `playground` 결이다. 즉 라우트별로 시각 언어를 포크할 수 없다. 모드 차이(전문↔실험↔개인)는 콘텐츠와 가벼운 악센트로 표현하지, 사이즈·토큰을 페이지마다 재발명해서가 아니다.

**Key Characteristics:**
- 중립 zinc 프레임 + emerald 단일 악센트 (Restrained 컬러 전략)
- 단일 모듈러 타입 스케일(1.25 비율), 모든 서피스 공유
- 하이브리드 입체감: 본문은 평평, 전시물(갤러리·라이트박스)만 부드러운 그림자
- 정제·세련된 컴포넌트, 다국어(KR/JA/EN) 본문

## 2. Colors

무채색 zinc 위에 emerald 한 가닥. 녹색은 정체성이자 유일한 길찾기 신호다.

### Primary
- **Emerald Accent** (#059669, green-0): 강조·CTA·활성 상태·`--accent-color`. 화면당 ≤10%로만.
- **Emerald Link** (#10b981, green-1): 링크, h2 밑줄 악센트(`--color-link`), 테두리 강조.
- **Emerald Wash** (#ecfdf5, green-5): 아주 옅은 배경 워시 (코드블록·메타 영역). 다크에선 저투명 틴트.

### Neutral
- **Ink Title** (#27272a / dark #f4f4f5, zinc-800): 제목.
- **Ink Body** (#3f3f46 / dark #d4d4d8, zinc-700): 본문.
- **Ink Muted** (#71717a / dark #a1a1aa, zinc-500): 메타·캡션·보조.
- **Surface** (#ffffff / dark #09090b) · **Surface Alt** (#f4f4f5, zinc-100) · **Border** (#e4e4e7, zinc-200).

베이스는 shadcn HSL 토큰(`--background` `--foreground` `--muted` 등, 240 hue zinc). 위 hex는 그 zinc 스케일과 emerald 램프의 표기값이다.

### Named Rules
**The One Thread Rule.** emerald는 화면당 ≤10%. 한 가닥의 녹색이 길을 안내한다는 게 핵심이라, 두 가닥이 되는 순간 신호가 죽는다. 정보는 색만으로 전달하지 않는다(WCAG: 형태·라벨 병행).

## 3. Typography

**Body / UI Font:** Roboto (다국어 폴백 'M PLUS 1p' → 'Noto Sans KR Variable' → sans-serif)
**Display Accent:** Chunkfive (슬랩, 특수 디스플레이 한정)
**Handwriting:** Caveat (tegaki 손글씨 캡션, 장식 전용)
**Numeric / Tag:** Roboto monospace

**Character:** 한 종류의 휴머니스트 sans가 본문부터 제목까지 끌고 간다. 위계는 폰트 종류가 아니라 크기·굵기 대비로 만든다.

### Hierarchy (단일 ladder, ~1.2-1.25 간격. mood 보존 위해 현재 크기에 앵커링한 compact 인스턴스. 이 토큰들이 SSOT, `global.css :root`에 정의)
- **Page Title** `--type-page-title` (700, clamp(1.5rem→2rem) = 24→32px): about/project/blog 메인 제목 + 본문 h1. 빅스텝 clamp로 ~400px까지 매끄럽게(768 하드점프 금지).
- **Heading** `--type-h2` (600, 1.5rem = 24px): 본문 h2.
- **Title** `--type-h3` / `--type-card-title` (600, 1.25rem = 20px): 본문 h3, 리스트 카드 제목.
- **Subtitle** `--type-h4` (600, 1.125rem = 18px): 본문 h4, empty-state desc.
- **Body** `--type-body` (400, 1rem = 16px, lh 1.7): 본문. 65–75ch.
- **Label** `--type-label` (500, 0.875rem = 14px): 메타·설명·카테고리·번역 (기존 0.8/0.9/1.0 군집 통일).
- **Caption** `--type-caption` (500, 0.8125rem = 13px): 최소 가독. 그 이하 금지.
- **Handwriting** (Caveat): tegaki 캡션 전용. 위계 밖.

### Named Rules
**The Single Scale Rule.** 모든 서피스는 위 8단계 중 하나를 쓴다. 페이지마다 rem을 새로 찍지 않는다(과거: 1.2 vs 1.25 카드제목, 0.8/0.9 메타, 1.3em/1.2em 본문 헤딩 같은 off-scale 금지).
**The Page-Title Rule.** about/project/blog의 메인 제목은 전부 **`--type-page-title` 토큰 하나**를 공유한다. 페이지마다 2rem/1.5rem로 다르게 두지 않는다.
**The Body-Heading Rule.** `.article-entry`(마크다운 본문) 헤딩은 별도 em-스케일을 만들지 말고 위 rem 스케일을 따른다. h5·h6를 본문 p와 같은 크기로 두지 않는다.
**The Legibility Floor.** ~400px에서 13px(Caption) 미만 텍스트 금지. 0.48rem 같은 마이크로 라벨은 Caption까지 올린다.

## 4. Elevation

하이브리드. **본문·리스트·카드는 기본 평평**(rest 상태에서 그림자 없음, 경계는 1px border나 tonal 대비로). **전시물 표면(갤러리 폴라로이드·라이트박스)에만** 부드러운 ambient 그림자로 깊이를 준다. 그림자는 분위기(ambient)용이지 구조(structural)용이 아니다.

### Shadow Vocabulary
- **ambient-card** (`box-shadow: 0 18px 30px rgba(54,41,28,.22), 0 4px 10px rgba(54,41,28,.14)`): 갤러리 폴라로이드/엽서 카드.
- **ambient-lightbox** (`box-shadow: 0 30px 60px rgba(0,0,0,.55)`): 라이트박스 떠 있는 표면.
- **hover-lift**: 카드 hover 시 그림자 증가 + 미세 translateY. 레이아웃 속성 애니메이션 금지(transform/opacity만).

### Named Rules
**The Flat-Content Rule.** 글·이력서·포폴 카드는 rest에서 평평하다. 그림자는 전시물이거나 상태 반응(hover/focus)일 때만 등장한다.

## 5. Components

### Buttons
- **Shape:** 부드러운 모서리(8px, `rounded.md`). 모든 버튼은 보이는 배경 또는 테두리를 가진다(텍스트-온리 금지).
- **Primary:** emerald 배경(#059669) + surface 텍스트, padding 8/16. hover 시 약간 진한 emerald.
- **Ghost (아이콘 전용):** 투명 배경, hover 시 accent 틴트 배경. 아이콘 버튼에 한정.
- **Hover/Focus:** background/transform 0.18s ease-out. 바운스·엘라스틱 금지.

### Cards / Containers
- **Corner:** 8px(콘텐츠 카드) ~ 2-3px(갤러리 폴라로이드, 실물 사진 느낌).
- **Background:** surface(#fff) / dark surface(#09090b). 다국어 본문.
- **Shadow:** Flat-Content Rule 적용(본문 카드 평평, 갤러리만 ambient).
- **Border:** zinc-200(#e4e4e7) 1px 또는 없음. 측면 컬러 스트라이프(border-left/right 강조) 금지.
- **Padding:** 24px 기준, 리듬 위해 변주.

### Inputs / Fields
- **Style:** surface 배경 + zinc border 1px, 8px radius. 검색은 Enter/버튼으로만 실행(키스트로크마다 X).
- **Focus:** emerald ring/border 시프트.

### Navigation
- **Style:** 상단 고정 nav, `.layout-background`(반투명 + backdrop-blur 4px). 로고는 Title 토큰 이하로(페이지 제목을 추월 금지).
- **States:** 활성=emerald, hover=accent 틴트. 모바일에서 드로어.

### Signature: Diary Gallery (폴라로이드/엽서/필름/스트림)
콘텐츠가 전시물이라는 North Star가 가장 강하게 드러나는 곳. 세피아·풍화·종이질감으로 따뜻하지만 단정하게. tegaki 손글씨 캡션은 Handwriting 전용. 단, **이 온기가 사이트 기본값이 되어선 안 된다**(blog 본문·about·project는 평평하고 차분).

## 6. Do's and Don'ts

### Do:
- **Do** 모든 텍스트를 8단계 타입 스케일(Display/Headline/Title/Subtitle/Body/Label/Caption/Handwriting) 중 하나로만 찍는다.
- **Do** about/project/blog 메인 제목에 동일한 Display 토큰을 쓰고, 빅스텝은 `clamp()`로 ~400px까지 매끄럽게 줄인다.
- **Do** emerald를 화면당 ≤10%로, 길찾기 한 가닥으로만 쓴다.
- **Do** 본문 카드는 평평하게, 갤러리·라이트박스만 ambient 그림자.
- **Do** `prefers-reduced-motion`에서 tegaki loop·velocity stream·flip을 정적/최소로. WCAG AA 명도대비(라이트·다크).
- **Do** 모든 버튼에 보이는 배경/테두리.

### Don't:
- **Don't** 페이지마다 rem을 새로 찍지 않는다(1.2 vs 1.25 카드제목, 0.8/0.9 메타, `.article-entry`의 1.3em/1.2em·16px 같은 off-scale 금지).
- **Don't** h5·h6를 본문 p와 같은 크기로 두거나, nav 로고를 페이지 제목보다 크게 두지 않는다.
- **Don't** ~400px에서 13px 미만 텍스트(0.48rem 같은 마이크로 라벨) 쓰지 않는다.
- **Don't** 양산형 템플릿/Medium 느낌, 기업 SaaS 랜딩(히어로-메트릭·과장 CTA), 장식 과잉, 검은바탕 형광색 dev-edgy로 가지 않는다.
- **Don't** 측면 컬러 스트라이프(border-left/right 강조), 그라디언트 텍스트, 장식용 글래스모피즘을 쓰지 않는다.
- **Don't** emerald를 두 가닥 이상 쓰거나, 색만으로 정보를 전달하지 않는다.
