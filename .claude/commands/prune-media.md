---
name: prune-media
description: Report orphaned editor-uploaded media on the RPi and move it to a trash dir (gated)
user_invocable: true
---

# Prune Media (운영)

에디터가 업로드한 미디어(`/home/jun/blog-files/media`) 중 **어디서도 참조되지 않는** 파일을 찾아
휴지통으로 옮긴다. 블로그 글이 쓰는 `image-assets` 계열은 대상이 아니다 — 그건 `/publish-images` 의
`removeUnusedImages.js` 소관.

## 왜 로컬과 RPi 를 오가는가

참조는 **로컬 저장소**에만 다 있고(발행된 MDX·컴포넌트에 하드코딩된 경로), 파일과 에디터 DB 는
**RPi** 에만 있다. 그래서 리포트는 로컬에서 만들고 파일 이동만 RPi 에서 한다. 스크립트는
`--inventory` 모드에서 삭제를 거부한다 — 운영 파일을 지우는 건 사람이 한다.

> **3단계에서 반드시 멈춘다.** 사용자가 목록을 보고 명시적으로 진행하라고 답하기 전에는 4단계를
> 실행하지 않는다.

## 인자

- `--days N` — 유예 기간(기본 14). 최근 N일 안에 올라온 파일은 후보에서 뺀다. 업로드는 됐지만 아직
  저장하지 않은, 편집 중인 이미지가 여기 걸린다. **낮추지 말 것.**
- `--purge-trash` — 1~4단계 대신 예전 휴지통 디렉터리를 실제로 삭제한다(맨 아래).

## 0. 준비

스크래치 디렉터리를 하나 정하고(세션 스크래치패드 등) **아래 명령들에 절대 경로를 그대로 써 넣는다.**
Bash 호출 사이에는 셸 변수가 유지되지 않으므로 `$SCRATCH` 같은 걸 쓰면 두 번째 명령부터 깨진다.
아래에서는 `<SCRATCH>` 로 표기한다.

## 1. 운영 상태 수집

```bash
# 미디어 목록: 이름 / 바이트 / mtime(epoch). RPi 는 Linux 라 GNU find 의 -printf 를 쓸 수 있다.
ssh raspi "find /home/jun/blog-files/media -maxdepth 1 -type f -printf '%f\t%s\t%T@\n'" > <SCRATCH>/inventory.tsv
```

```bash
# 에디터 DB (호스트 바인드 마운트라 컨테이너를 거치지 않아도 된다)
scp raspi:/home/jun/editor-data/blog.db <SCRATCH>/prod.db
```

둘 다 확인한다. **하나라도 비었으면 여기서 중단**한다 (경로·권한·컨테이너 상태 확인):

```bash
wc -l < <SCRATCH>/inventory.tsv
ls -la <SCRATCH>/prod.db
```

## 2. 리포트 생성 (로컬, 파괴적 동작 없음)

```bash
cd editor && DB_PATH=<SCRATCH>/prod.db BLOG_SRC=../blog/src \
  bun run prune:media -- --inventory <SCRATCH>/inventory.tsv --out <SCRATCH>/orphans.txt --days 14
```

스크립트는 참조를 4곳에서 긁고, **하나라도 못 읽으면 exit 1** 한다. 복사한 DB 에는
`PRAGMA integrity_check` 를 먼저 돌린다(찢어진 복사본은 참조를 누락시켜 살아있는 파일을 고아로 만든다).

1. 에디터 DB `posts.body`
2. 에디터 DB `posts.frontmatter` — `thumbnail` 은 여기에만 있다
3. `blog/src/content/**/*.{md,mdx}` — 에디터를 안 거친 옛 글
4. `blog/src/**` 소스 — 컴포넌트·설정에 하드코딩된 `/files/**`

`-480/-960/-1600/-thumb` 변형은 원본 이름으로 환산하므로, srcset 에서만 쓰이는 이미지도 살아남는다.

## 3. 사람 확인 — 여기서 멈춘다

카운트 체크리스트를 그대로 보여준다:

```
참조 스캔: DB n건 · 콘텐츠 n개 · 소스 n개 → 참조 이미지 n개
원본 N개 = 참조됨 A + 유예중 B(14일) + 고아 C
```

진행 금지 조건:

- `참조 스캔` 줄의 네 숫자 중 **0 이 있으면** 참조 수집이 반쪽만 돈 것이다
- `참조됨 A` 가 0 이거나 비정상적으로 작다
- 고아 목록에 최근 작업한 글의 이미지가 보인다
- `N ≠ A + B + C` (스크립트가 이미 중단했어야 하므로, 보였다면 버그다)

사용자가 명시적으로 승인하기 전에는 4단계로 넘어가지 않는다.

## 4. 휴지통으로 이동 (승인 후)

`unlink` 하지 않는다. nginx 가 서빙하는 디렉터리 **밖으로** 옮긴다. 타임스탬프는 한 번 정해서
아래 명령들에 그대로 박아 넣는다(`<STAMP>`, 예: `20260809-231500`).

```bash
scp <SCRATCH>/orphans.txt raspi:/tmp/prune-orphans.txt
```

```bash
ssh raspi "mkdir -p /home/jun/blog-files-trash/<STAMP> && cd /home/jun/blog-files/media && while IFS= read -r f; do mv -- \"\$f\" /home/jun/blog-files-trash/<STAMP>/; done < /tmp/prune-orphans.txt"
```

개수를 대조한다. **기대값 = `orphans.txt` 줄 수**:

```bash
wc -l < <SCRATCH>/orphans.txt
ssh raspi "ls -1 /home/jun/blog-files-trash/<STAMP> | wc -l"
```

숫자가 다르면 즉시 사용자에게 보고한다. 되돌리려면 방향만 바꿔 `mv` 하면 된다:

```bash
ssh raspi "cd /home/jun/blog-files-trash/<STAMP> && mv -- * /home/jun/blog-files/media/"
```

```bash
ssh raspi "rm -f /tmp/prune-orphans.txt"
```

## 5. 확인

블로그에서 최근 글 2~3개를 열어 이미지가 정상인지 본다. 깨진 게 있으면 위 되돌리기를 실행한다.

## 휴지통 비우기 (`--purge-trash`)

바로 지우지 않는다. **2주 이상 지난** 디렉터리만, 사용자 승인 후에.

```bash
ssh raspi "ls -la /home/jun/blog-files-trash/ && du -sh /home/jun/blog-files-trash/* 2>/dev/null"
# 승인 후:
ssh raspi "rm -rf /home/jun/blog-files-trash/<STAMP>"
```

## Notes

- SSH 별칭 `raspi` (`~/.ssh/config`, 키 인증)
- 컨테이너 `astro-editor` · 미디어 호스트 `/home/jun/blog-files/media` (컨테이너 `/home/files/media`)
  · DB 호스트 `/home/jun/editor-data/blog.db` (컨테이너 `/app/.data/blog.db`)
- DB 를 그냥 복사해도 되는 건 `journal_mode=delete` 이기 때문이다(별도 `-wal` 파일이 없다).
  WAL 로 바꾸면 `-wal` 까지 같이 가져오거나 `VACUUM INTO` 스냅샷으로 바꿔야 한다
- `images` 카탈로그에 남는 행은 리포트가 파일 목록만 보므로 무해하다 — 굳이 지우지 않는다
- 로컬 개발 환경 정리는 이 명령이 아니라 `cd editor && bun run prune:media -- --apply` 로 충분하다
  (그쪽은 `MEDIA_DIR/.trash/<stamp>` 로 옮긴다)
- 데이터 입력 중인 사람이 있으면 타이밍을 맞춘다. 저장 전 이미지는 유예 기간이 보호하지만,
  유예를 줄여서 돌리면 편집 중인 이미지를 지운다
