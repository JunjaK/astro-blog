# _docs Index

프로젝트 설계 계획 · 아키텍처 문서 인덱스. 상태↔폴더 lockstep (`docs-lifecycle`).

## Active

### Planning
- [사케/양조장 마스터 DB + API — editor 전용, DB-우선 autofill + 관리 페이지](./active/processing/2026-07-07/2026-07-07-sake-master-db-plan.md) — `processing` · 2026-07-07 · team-run (Leader+FE+BE+C-infra+UIUX). breweries+sakes 2테이블, `/editor-api/sake/*` 9라우트, name_norm dedup, 값-복사 스냅샷. Designer 3명(겹침 0). base `dc2eb1b`.
- [블로그 글쓰기 전용 웹앱 (Notion-style Editor + RPi 발행 백엔드)](./active/planning/2026-06-28/2026-06-28-blog-editor-app-plan.md) — `planning` · 2026-06-28 · team-brainstorm (Leader+FE+BE+Infra+UIUX). [diagram](./active/planning/2026-06-28/2026-06-28-blog-editor-app-plan.visual.html)

### Processing
_(none)_

### Handoff
- [step 0 — 모노레포 분리 + editor 초기세팅 + 브랜치 배포](./handoff/2026-06-29-blog-editor-step0-handoff.md) — 2026-06-29 · ✅ 완료(blog/editor 분리, 두 배포 success, 라이브 블로그 200 확인)

## Complete
- [시음 노트(Tasting Note) 블로그 카테고리 — nihonshu 상세 + AI autofill](./complete/2026-07-06/2026-07-06-tasting-note-plan.md) — `complete` · 2026-07-06 · team-run (Leader+FE+BE+C-advisory+UIUX). music 카테고리 미러, Contract 11필드 SSOT, Designer 4명(겹침 0). base `fix/blog-hydration-418`@cf51e44.
- [블로그 SSR↔CSR 하이드레이션 불일치(#418) 감사 + 수정](./complete/2026-06-29/2026-06-29-blog-hydration-mismatch-audit-plan.md) — `complete` · 2026-06-29 · 범인=AnimatedThemeToggler(테마 기반 아이콘). 픽스+하드닝+sweep 하니스+CI 게이트, sweep 80/80, prod 검증. [diagram](./complete/2026-06-29/2026-06-29-blog-hydration-mismatch-audit-plan.visual.html)
