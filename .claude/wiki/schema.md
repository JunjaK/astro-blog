# Wiki Schema

How this wiki is structured and maintained (Karpathy "schema" layer). The `wiki` skill
reads this before ingest/query/lint.

## Conventions
- Pages link to the SSOT (code / `_docs/` / `_note/`); they route and synthesize, they do NOT duplicate facts.
- Page types: entity / concept / overview / comparison.
- `index.md` = catalog; `log.md` = chronicle.

## Maintenance
- Governed by `continuous-learning` §7 (Knowledge-Base Maintenance Contract): link-don't-duplicate, same-change-same-update, periodic self-audit.
