# _note/ — owner's personal notes (agent read-only)

This bucket is **yours**. The agent treats it as **read-only**: it reads `_note/` for
context but will NOT create, move, merge, reorganize, or delete anything here unless you
explicitly ask. Dump notes freely — no frontmatter, no lifecycle, no structure required.

- Owner: you (human). Tool-agnostic — lives at repo root, not under `.claude/`.
- Exempt from `_docs/` automation (lifecycle, status frontmatter, merge-on-completion).
- Keep one central `_note/` at the repo root; preserve provenance with subfolders (`_note/<source>/`).
- Graduation: when a note becomes project-canonical, you (not the agent) promote it `_note/ → _docs/`.

Governance detail: `skills/docs-lifecycle/SKILL.md` (Three-bucket section).
