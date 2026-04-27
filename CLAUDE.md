# paperclip-shannon

A fork of Paperclip adapted for the AI Software Factory Orchestrator-Worker pipeline. Built and maintained by the Gunawan AI Company.

## What This Repo Is

Paperclip is a multi-agent software development platform. This fork extends it with:
- **Pipeline stage tracking** — `pipeline_stage` column on issues, `PIPELINE_STAGES` constant
- **Automatic pipeline advancement** — `NEXT_COMMAND:` marker in agent comments triggers stage transitions and issue reassignment
- **Shannon company bootstrap** — opinionated `company-creator` skill that always produces a 4-agent Shannon factory (CEO → PM → UI/UX Lead → SWE Lead)
- **Worker dispatch** — `worker--dispatch` skill for parallel sub-task execution via single `messages.create()` API calls
- **Review checkpoint** — `request_confirmation` interaction gates the pipeline before advancing from `sandboxed` to `tested`

## Vault Context

The project knowledge base (Obsidian vault) is at `/home/paperclip/vault/`.

Start here for full context:
- `Main Index.md` — complete map of the AI Software Factory system, all connected documents, and current gaps
- `Changelog.md` — all documents sorted by last updated date; scan this first to catch what's new
- `AI Software Factory/Building/Paperclip Shannon — Modification Plan.md` — all changes made to this repo and why
- `AI Software Factory/Building/Skill Port Analysis — ai-software-factory ke paperclip-shannon.md` — the 13 ported skills and the reasoning behind porting them
- `AI Software Factory/Building/Orchestrator-Worker Architecture.md` — the architecture this repo implements

## Key Directories

| Path | Purpose |
|---|---|
| `skills/` | Factory skills — 13 ported from `ai-software-factory` + Paperclip-native skills |
| `.agents/skills/company-creator/` | Shannon company bootstrap skill |
| `packages/db/src/schema/issues.ts` | `pipeline_stage` column definition |
| `packages/shared/src/constants.ts` | `PIPELINE_STAGES`, `PipelineStage`, `PIPELINE_STAGE_LABELS` |
| `server/src/routes/issues.ts` | `NEXT_COMMAND:` parsing and pipeline advancement logic |

## Dev Server

```bash
pnpm dev --bind lan   # accessible at http://84.247.150.72:3100
pnpm dev:stop
pnpm -r typecheck     # typecheck all 20 packages
pnpm test:run
```

## Branch Convention

Active development happens on `feat/*` branches. PRs target `master`.
