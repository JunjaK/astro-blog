# Product

## Register

brand

## Users

- **본인 (Jun)** — 1차 큐레이터이자 독자. 개인 기록과 정체성 허브로 쓴다. ("미래의 나")
- **동료 개발자** — `blog`의 기술 글을 읽으러 온다. 가끔, 가볍게.
- **채용 담당자 / 협업 상대** — `about`(이력서)과 `project`(포폴)로 실력을 평가한다.

데스크탑과 모바일(~400px) 양쪽에서, 대개 캐주얼하게 둘러본다.

## Product Purpose

jun-devlog는 **하나의 개인 개발 블로그가 여러 역할을 겸하는** 사이트다. 콘텐츠 모드는 다르지만 **서피스끼리 템플릿을 공유**하는 게 핵심 제약이다:

- `about` → 개인 이력서 (전문·신뢰)
- `project` + `playground` → **동일 리스팅 양식 공유**(Project 컴포넌트 / projects.scss). project=포폴(전문), playground=실험 데모지만, 한 템플릿이라 **시각 처리는 공유**한다. 모드 차이는 콘텐츠로 드러내지, 시각 언어를 포크하지 않는다.
- `home` → playground와 비슷한 결 (실험적·플레이풀 인트로)
- `blog` → 일기·개인 일상, 가끔 기술 글 (따뜻·개인적)

성공 = 서피스마다 콘텐츠 온도는 달라도 **하나의 일관된, 차분하고 믿음직한 개인 사이트**로 읽히는 것. 글과 사진이 주인공이고, 디자인은 조용히 실력을 증명한다.

## Brand Personality

차분함, 정돈됨, 믿음직함 (calm / composed / credible).

- **기본(resting) 톤은 조용한 전문성** — 차분하고 읽기 편하며 신뢰가 간다.
- 따뜻함(여행·diary)과 실험성(playground)은 그 위에 얹는 **의도된 악센트**이지, 기본값으로 시끄럽게 깔리지 않는다.
- 레퍼런스 결: **tech-minimal**(Vercel/Linear 블로그, overreacted: 여백·타이포 중심) + **warm-editorial**(종이·사진 감성을 단정하게)의 혼합.

## Anti-references

- **흔한 템플릿 / 기본 Medium 느낌** — 개성 없는 양산형, "AI가 만든" 티.
- **기업 SaaS 랜딩** — 히어로-메트릭, 똑같은 카드 그리드, 과장 CTA.
- **장식 과잉** — 종이질감·모션·텍스처가 콘텐츠보다 시선을 끄는 것.
- **네온·해커 dev-edgy** — 검은바탕 형광색, 과한 글로우/그라디언트.

## Design Principles

1. **One system, many moods.** 모든 서피스가 하나의 디자인 시스템(타입 스케일·색·크롬)을 공유한다. about/project는 전문적으로, blog는 개인적으로, home·playground는 실험적으로 읽히되 별개의 시각 언어로 쪼개지지 않는다. **project·playground는 실제로 한 리스팅 템플릿을 공유**하므로 라우트별 스타일 포크 자체가 불가능하다(=토큰을 페이지마다 재발명하면 안 되는 이유). 모드는 콘텐츠·가벼운 악센트로 표현한다.
2. **Calm is the resting state.** 기본은 조용한 전문성. 온기와 실험성은 그 위의 통제된 변주이지, 기본 소음이 아니다.
3. **Content is the subject.** 크롬과 장식은 글·사진을 받쳐줄 뿐, 경쟁하지 않는다.
4. **Trust through restraint.** 신뢰(이력서·포폴)는 화려함이 아니라 정밀함과 일관성에서 나온다.
5. **Personal, not precious.** 여행·일상의 온기는 환영하지만 단정한 단일 톤으로, 스크랩북처럼 어지럽지 않게.

## Accessibility & Inclusion

- **WCAG AA 명도대비** (라이트·다크 모두).
- **`prefers-reduced-motion` 존중** — 모션이 많다(tegaki loop, velocity stream, flip 등). 감소 설정 시 정적/최소로.
- 그 외 특별 요구는 없음 (개인 블로그라 과하게 잡지 않음).
