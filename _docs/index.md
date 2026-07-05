# _docs Index

프로젝트 설계 계획 · 아키텍처 문서 인덱스. 상태↔폴더 lockstep (`docs-lifecycle`).

## Active

### Planning
- [시음 노트(Tasting Note) 블로그 카테고리 — nihonshu 상세 + AI autofill](./complete/2026-07-06/2026-07-06-tasting-note-plan.md) — `complete` · 2026-07-06 · team-run (Leader+FE+BE+C-advisory+UIUX). music 카테고리 미러, Contract 11필드 SSOT, Designer 4명(겹침 0). base `fix/blog-hydration-418`@cf51e44.
- [블로그 글쓰기 전용 웹앱 (Notion-style Editor + RPi 발행 백엔드)](./active/planning/2026-06-28/2026-06-28-blog-editor-app-plan.md) — `planning` · 2026-06-28 · team-brainstorm (Leader+FE+BE+Infra+UIUX). [diagram](./active/planning/2026-06-28/2026-06-28-blog-editor-app-plan.visual.html)

### Processing
_(none)_

### Handoff
- [step 0 — 모노레포 분리 + editor 초기세팅 + 브랜치 배포](./handoff/2026-06-29-blog-editor-step0-handoff.md) — 2026-06-29 · ✅ 완료(blog/editor 분리, 두 배포 success, 라이브 블로그 200 확인)

## Complete
- [블로그 SSR↔CSR 하이드레이션 불일치(#418) 감사 + 수정](./complete/2026-06-29/2026-06-29-blog-hydration-mismatch-audit-plan.md) — `complete` · 2026-06-29 · 범인=AnimatedThemeToggler(테마 기반 아이콘). 픽스+하드닝+sweep 하니스+CI 게이트, sweep 80/80, prod 검증. [diagram](./complete/2026-06-29/2026-06-29-blog-hydration-mismatch-audit-plan.visual.html)
