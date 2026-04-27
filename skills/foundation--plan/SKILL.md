---
name: foundation--plan
description: >
  Plan all project features upfront and create a prioritized backlog in
  project-state.md. Run after foundation:discover to establish the development
  roadmap. Derives features from product-mission.md use cases, identifies
  dependencies, determines build order, and writes project-state.md. If a
  backlog already exists, updates it with any new features found.
  Output: .claude/docs/project-state.md with complete feature backlog.
---

# foundation--plan

Plan all features and create the development backlog. Run after `foundation--discover`.

**Preconditions:**
- `.claude/project-config.json` must exist
- `.claude/docs/foundation/product-mission.md` must be completed
- `project-config.json` status should be `"active"`

---

## Step 1 — Read context

Read:
- `.claude/project-config.json` — architectural choices
- `.claude/docs/foundation/product-mission.md` — use cases, users, scope
- `.claude/docs/project-state.md` — current backlog if it exists

---

## Step 2 — Derive features

From the use cases in `product-mission.md`, derive the list of features needed. For each feature, write a one-line description.

If a backlog already exists in `project-state.md`, identify any use cases not yet represented and add them as new features.

---

## Step 3 — Identify dependencies and build order

For each feature, identify:
- **Depends on:** which features must be built first (e.g., tasks depends on projects)
- **Tables needed:** rough idea of what tables this feature requires
- **Shared patterns:** features that share similar CRUD patterns

Determine build order based on:
1. Dependencies first
2. Core functionality before nice-to-haves
3. Features that establish shared patterns early (first CRUD sets the template for others)

---

## Step 4 — Write project-state.md

Write or update `.claude/docs/project-state.md`:

```markdown
# Project State

Last updated: {today's date} — initialized by foundation--plan

## Backlog

| # | Feature           | Status    | Depends On        | Spec |
|---|-------------------|-----------|-------------------|------|
| 1 | Auth (baseline)   | ✅ Done   | —                 | —    |
| 2 | {Feature name}    | 🔲 Pending | {dependencies}    | —    |

## Schema Snapshot

Tables: profiles{, tenants, tenant_members} (from baseline migration)
Key relationships: (none yet beyond baseline)

## Established Patterns

(populated after first feature is built)

## Architecture Notes

{Any cross-cutting concerns identified during planning}
```

---

## Step 5 — Post completion comment

After writing `project-state.md`, post a comment on the issue:

> "Backlog created with {N} features. First feature to build: **{feature name}**. Run `foundation--shape-spec` to spec it."
