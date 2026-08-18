# _docs Index

프로젝트 설계 계획 · 아키텍처 문서 인덱스. 상태↔폴더 lockstep (`docs-lifecycle`).

## Active

### Planning
- [일본 일주 diary 지도 playground](./active/planning/2026-08-16/2026-08-16-japan-trip-map-final.md) — `planning` · 2026-08-16, **개정 2026-08-17** · 로컬LLM 초안(v1 Qwen3.8/v2 Gemma4) 후 병합·검증. **D1 재결정: ECharts 6.1.0 → d3-geo 로 통일**(접근성·다크모드·재사용). 도도부현 16곳 레이어 + city marker 2차, 팬/줌은 `d3-zoom`. **선행: [TravelMap](./reference/travel-map/2026-08-18-travel-map.md)(구현 완료, 7편 적용) → 이 계획** 순서 확정. 선행이 `city`/`prefecture`/`mapUrl` 을 채택해 미확인 1·2·3·6번 해소 — 좌표·GeoJSON·매핑 테이블·렌더링 코어를 선행에서 그대로 받는다
- [editor UI/UX 수리 + 글 생성/발행 구현](./active/processing/2026-07-17/2026-07-17-editor-uiux-fix-plan.md) — `processing` · 2026-07-17 · team-run (Leader+FE+BE+C-infra+UIUX). 버튼 44px floor, 「더 보기」 클라 페이지네이션, SakesPage 라우트 편집뷰, 글 생성 POST /posts + 로컬 발행(git 수동). Designer 4명(BE+D1+D2∥D3, 겹침 0), 병합 BE→D1→(D2∥D3). base `b1a7b4c`.
- [사케/양조장 마스터 DB + API — editor 전용, DB-우선 autofill + 관리 페이지](./complete/2026-07-07/2026-07-07-sake-master-db-plan.md) — `complete` · 2026-07-07 · team-run (Leader+FE+BE+C-infra+UIUX). breweries+sakes 2테이블, `/editor-api/sake/*` 9라우트, name_norm dedup, 값-복사 스냅샷. Designer 3명(겹침 0). base `dc2eb1b`.
- [블로그 글쓰기 전용 웹앱 (Notion-style Editor + RPi 발행 백엔드)](./active/planning/2026-06-28/2026-06-28-blog-editor-app-plan.md) — `planning` · 2026-06-28 · team-brainstorm (Leader+FE+BE+Infra+UIUX). [diagram](./active/planning/2026-06-28/2026-06-28-blog-editor-app-plan.visual.html)

### Processing
_(none)_

### Handoff
- [step 0 — 모노레포 분리 + editor 초기세팅 + 브랜치 배포](./handoff/2026-06-29-blog-editor-step0-handoff.md) — 2026-06-29 · ✅ 완료(blog/editor 분리, 두 배포 success, 라이브 블로그 200 확인)

## Reference

문서화가 끝나 앞으로 참조하는 통합본. 상태 이동이 아니라 **읽기 대상**이다.

- [TravelMap — diary 인터랙티브 루트 지도](./reference/travel-map/2026-08-18-travel-map.md) — `reference` · `travel-map` · 2026-04-23 시작, 2026-08-18 통합. **일본 여행 diary 글을 쓸 때 먼저 볼 것.** 저작 가이드(좌표 조달 → anchor → MDX 3곳 → `check-spots`) + 입도 규칙(단일 현=도시 마커 / 다현=현 마커) + 함정 8종(d3 winding, 원거리 도서, 해안선 단순화, 지오코딩 오매칭 등) + 원문 데이터 정정. diary 7편 적용 완료

## Complete
- [시음 노트(Tasting Note) 블로그 카테고리 — nihonshu 상세 + AI autofill](./complete/2026-07-06/2026-07-06-tasting-note-plan.md) — `complete` · 2026-07-06 · team-run (Leader+FE+BE+C-advisory+UIUX). music 카테고리 미러, Contract 11필드 SSOT, Designer 4명(겹침 0). base `fix/blog-hydration-418`@cf51e44.
- [블로그 SSR↔CSR 하이드레이션 불일치(#418) 감사 + 수정](./complete/2026-06-29/2026-06-29-blog-hydration-mismatch-audit-plan.md) — `complete` · 2026-06-29 · 범인=AnimatedThemeToggler(테마 기반 아이콘). 픽스+하드닝+sweep 하니스+CI 게이트, sweep 80/80, prod 검증. [diagram](./complete/2026-06-29/2026-06-29-blog-hydration-mismatch-audit-plan.visual.html)

## Topic Vocabulary

`_docs/complete/` · `_docs/reference/` 의 토픽 폴더는 반드시 이 목록에 있어야 한다 (docs-lifecycle I3).
새 토픽은 맞는 게 하나도 없을 때만 만들고, 같은 커밋에 여기 추가한다.

| topic | 범위 |
|---|---|
| `travel-map` | diary 여행 지도 — `<TravelMap>`, diarySpots, GeoJSON 자산, playground 종합 지도 |
