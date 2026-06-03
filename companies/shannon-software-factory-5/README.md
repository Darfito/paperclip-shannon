# Shannon Software Factory 5

A clean re-import of the Shannon Software Factory v4 pipeline — same agents, same skills, same roundtable + URS-first behaviour. Use this package when you want to start with an empty issue and project list.

## What this is

| Aspect | v4 (live) | v5 (this package) |
|---|---|---|
| Agents | CEO → PM → UI/UX Lead → SWE Lead | Same |
| Skills | Same | Same |
| Roundtable debate router | Required (server) | Required (server) |
| URS-first lane | Yes | Yes |
| CEO PM Oversight (recurring) | Yes (live-patched) | Yes (baked in) |
| SOUL.md per agent | Yes (live-patched) | Yes (baked in) |
| Name / slug | Shannon Software Factory 4 / `…` | **Shannon Software Factory 5** / `shannon-software-factory-5` |
| Version | `0.4.0` | `0.5.0` |

The only differences from v4 are the company name, slug, and version. Import this package to get a fresh company instance in Paperclip with empty issues and projects — the trial-and-error noise from the v4 instance stays behind.

## Pipeline stages

| Stage | Owner | Output |
|---|---|---|
| `spec` (roundtable) | PM ↔ SWE Lead, arbitrated by CEO | `[PM BRIEF v<n>]` → `[CONFIRMED]`/`[CONCERNS]` → `[LGTM]` |
| `design` | UI/UX Lead (only if `[NEEDS_DESIGN: yes]`) | `[UI/UX SPEC]` |
| `implementation` | SWE Lead (dispatches workers) | Reviewed code |
| `sandboxed` | SWE Lead | `sandbox--test` pass + `request_confirmation` |
| `tested` | SWE Lead | Approval gate satisfied |
| `shipped` | — | `NEXT_COMMAND: stage=shipped` |

## Agents

- **CEO** — frame-setter, decision arbiter, URS structurer, PM oversight loop. Skills: `paperclip`, `foundation--urs-draft`.
- **PM** — spec author, URS compiler, sprint planner, FR issue creator. Skills: `paperclip`, `foundation--inject-standards`, `foundation--discover`, `foundation--plan`, `foundation--shape-spec`, `foundation--validate`, `foundation--status`, `foundation--urs`, `foundation--sprint-plan`, `urs--create-issues`.
- **UI/UX Lead** — light agent, design spec author. Skills: `paperclip`, `foundation--inject-standards`, `design--import`, `design--system`.
- **SWE Lead** — validation gate, worker dispatcher, sandbox + checkpoint gatekeeper. Skills: `paperclip`, `foundation--inject-standards`, `architecture--new-feature`, `architecture--review`, `implementation--new-feature`, `implementation--review`, `data-fetching--review`, `worker--dispatch`, `sandbox--up`, `sandbox--down`, `sandbox--test`, `sandbox--status`.

Each agent has both an `AGENTS.md` (operational contract — what to do) and a `SOUL.md` (identity + judgment heuristics + anti-patterns). The AGENTS.md prelude instructs the agent to read SOUL.md first on every run.

## Getting started

Upload this directory (zipped) via the Paperclip UI's company-import flow, or run:

```bash
paperclipai company import --from companies/shannon-software-factory-5/
```

### After import

`cwd` is intentionally left blank in `.paperclip.yaml`. Set it per project in the Paperclip UI when you create the first project (or per-agent if you want them to share a workspace from day one). The roundtable debate router and system-comment wakeup machinery rely on server-side code (Steps 12+13 in this repo) — make sure those are deployed before triggering the first issue.

## Server prerequisites

This template assumes the same server features as v3/v4:

- `debate-router.ts` for tagged-signal routing (`[TASK]`, `[PM BRIEF v<n>]`, `[CONFIRMED]`, `[CONCERNS]`, `[UI/UX SPEC]`, `[LGTM]`, `[DECISION]`).
- System comment insertion in `routes/issues.ts` for autonomous continuation.
- `pipeline_stage` column on issues, `NEXT_COMMAND:` parsing.

These are already deployed in this fork (`paperclip-shannon`) at the master commit referenced by the live v4 company.
