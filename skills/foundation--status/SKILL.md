---
name: foundation--status
description: >
  Show the current project state and suggest the next feature to work on.
  Read-only — does not modify any files. Reads project-state.md and
  project-config.json, renders a pipeline view of all features, and identifies
  the next unblocked feature to build. Post the status report as a comment on
  the current issue.
---

# foundation--status

Show current project state and suggest next action. Read-only.

**Preconditions:**
- `.claude/project-config.json` must exist
- `.claude/docs/project-state.md` should exist (run `foundation--plan` first)

---

## Step 1 — Read state

Read:
- `.claude/project-config.json`
- `.claude/docs/project-state.md`
- `.claude/docs/foundation/product-mission.md`

---

## Step 2 — Render status

Compose a status report in this format:

```
Project: {projectName}
Type: {multi-tenant / single-tenant} | Auth: {Supabase Auth / Keycloak}
Status: {project-config status}

Feature Pipeline:
  Auth (baseline)        [spec → arch → impl → tested → reviewed → shipped] ✓
  {Feature name}         [spec → arch → impl ←                            ]
  {Feature name}         [                                                 ]

  Legend: ← = current stage, ✓ = shipped

Schema: {list of current tables from Schema Snapshot}
```

For each feature in the backlog, render the pipeline showing completed stages and the current stage marked with `←`. Shipped features show `✓`. Features with no stage yet show an empty pipeline.

---

## Step 3 — Identify and suggest next action

Find the next feature to build:
- First item in the backlog whose stage is not `shipped` and whose dependencies are all `shipped`

If a next feature is found, append to the report:

> "**Next up: {feature name}.** Run `foundation--shape-spec` to spec it, then follow the feature workflow: `architecture--new-feature` → `implementation--new-feature` → sandbox testing → `architecture--review` + `implementation--review`."

If all features are shipped:

> "All planned features are complete. Options: add new features with `foundation--shape-spec`, run a quality audit with `architecture--review` or `implementation--review`, or proceed to deployment."

---

## Step 4 — Post as comment

Post the complete status report as a comment on the current issue.

This skill does not modify any files.
