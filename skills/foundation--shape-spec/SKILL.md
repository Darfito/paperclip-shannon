---
name: foundation--shape-spec
description: >
  Create a feature spec before implementation begins. A spec is a short,
  precise document that defines acceptance criteria, data shape, and UI
  reference for one feature — the contract between planning and building.
  Reads project-config.json, product-mission.md, and any existing screen
  spec, then writes the spec to .claude/docs/specs/{feature-name}.md and
  updates project-state.md. Derives the feature name from the current issue.
---

# foundation--shape-spec

Create a feature spec. The spec is the contract between planning and building — it must exist before `architecture--new-feature` or `implementation--new-feature` runs.

**Preconditions:**
- `.claude/project-config.json` must exist
- `.claude/docs/project-state.md` should exist
- `.claude/docs/specs/_template.md` must exist

---

## Step 1 — Read context

Read before starting:
- `.claude/project-config.json` — multi-tenant, auth model, regulated status
- `.claude/docs/foundation/product-mission.md` — project context and use cases
- `.claude/docs/architecture-os/schema-conventions.md` — data shape constraints
- `.claude/docs/specs/_template.md` — output format

Derive the feature name from the current issue title. Check whether a screen spec already exists at `.claude/docs/design-os/screens/{feature-name}.md` — if so, read it now. The design spec is the source of truth for what the feature should look like.

---

## Step 2 — Acceptance criteria

Write concrete, testable acceptance criteria for this feature. Each criterion must be:
- Observable (verifiable in a browser or a test)
- Specific enough that "done" is unambiguous
- Phrased from the user's perspective

For each use case in `product-mission.md` that this feature touches, include a criterion for it.

If `project-config.json` has `multiTenant: true`, always include:
> "Tenant A cannot access Tenant B's data for this feature."

---

## Step 3 — Data shape

Determine what the database needs:
- Does an existing table need new columns?
- Does a new table need to be created?
- What indexes are needed?
- Is there business logic that warrants an RPC, or is this a direct query?

Apply schema-conventions.md rules — RLS and audit triggers are mandatory and will be added automatically in the migration. Do not include them as acceptance criteria.

---

## Step 4 — Implementation notes

From the issue context and existing codebase docs, note:
- Edge cases or constraints the builder should know
- Non-obvious interactions with other features
- Performance concerns (e.g., a query that runs on every page load)

---

## Step 5 — Write spec and update state

Generate the spec using `.claude/docs/specs/_template.md` format.
Write to `.claude/docs/specs/{feature-name}.md`.

Then read `.claude/docs/project-state.md` and update:
- **Backlog:** set the feature's **Spec** column to `[spec](../specs/{feature-name}.md)`, set **Stage** to `spec ←`
- **Feature Timeline:** set the `spec` column to today's date (MM-DD format)

Write the updated `project-state.md`.

---

## Step 6 — Post completion comment

Post a comment on the issue:

> "Spec written to `.claude/docs/specs/{feature-name}.md`. project-state.md updated.
>
> Next step:
> - If the spec requires schema changes: run `architecture--new-feature`
> - If no schema changes needed: run `implementation--new-feature`"
