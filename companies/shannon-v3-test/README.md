# Shannon V3 Test Factory

A test instance of the Shannon v3 Roundtable Debate pipeline. Used to validate Step 12 server code (debate-router) without touching the production `shannon-factory-2` company.

## What it builds

This is a test company — use it to verify the roundtable debate flow works end-to-end before migrating the production company to v3.

## Pipeline stages

| Stage | Who drives it |
|---|---|
| `spec` | CEO → PM ↔ SWE Lead debate (+ optional UI/UX). Debate router handles routing. |
| `design` | UI/UX Lead (full design pass after spec). Advances via `NEXT_COMMAND:`. |
| `implementation` | SWE Lead dispatches Code/Design/Test Workers. |
| `sandboxed` | SWE Lead runs sandbox tests. Human checkpoint before advancing. |
| `tested` | QA sign-off. |
| `shipped` | Done. |

## Org chart

- **CEO** (no reports-to) — frames `[TASK]`, handles deadlock `[DECISION]`
- **PM** (reports to CEO) — produces `[PM BRIEF v<n>]`
- **UI/UX Lead** (reports to PM) — produces `[UI/UX SPEC]` (only when `[NEEDS_DESIGN: yes]`)
- **SWE Lead** (reports to CEO) — validation gate `[CONFIRMED]`/`[CONCERNS]`/`[LGTM]`, implementation lead

## Skills used

| Skill | Used by |
|---|---|
| `paperclip` | All agents |
| `foundation--discover`, `foundation--plan`, `foundation--shape-spec`, `foundation--validate`, `foundation--status` | PM |
| `foundation--inject-standards` | PM, UI/UX, SWE Lead |
| `design--import`, `design--system` | UI/UX Lead |
| `architecture--new-feature`, `architecture--review` | SWE Lead |
| `implementation--new-feature`, `implementation--review`, `data-fetching--review` | SWE Lead |
| `worker--dispatch` | SWE Lead |
| `sandbox--up`, `sandbox--down`, `sandbox--test`, `sandbox--status` | SWE Lead |

## Getting started

```bash
# Import as a NEW company (does not overwrite shannon-factory-2)
node cli/dist/index.js company import companies/shannon-v3-test \
  --target new \
  --new-company-name "Shannon V3 Test" \
  --yes \
  --paperclip-url http://127.0.0.1:3100
```

Or upload via the dashboard: `/<PREFIX>/company/import` → Local Zip → select "New company".

> **Requires:** Server running with Step 12 debate-router code (`feat/step-12-roundtable` or master after merge).

## Rollback

To remove this test company entirely:

```bash
node cli/dist/index.js company list --paperclip-url http://127.0.0.1:3100
node cli/dist/index.js company delete --company-id <V3_COMPANY_ID> --paperclip-url http://127.0.0.1:3100
```

See the vault playbook `Shannon V3 — Test Playbook with Rollback` for the full rollback matrix.
