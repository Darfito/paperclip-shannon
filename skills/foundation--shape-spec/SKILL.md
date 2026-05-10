---
name: foundation--shape-spec
description: >
  Create a feature spec before implementation begins. A spec is a short,
  precise document that defines acceptance criteria, data shape, and UI
  reference for one feature — the contract between planning and building.
  Reads project-config.json, product-mission.md, and any existing screen
  spec, then writes the spec to .claude/docs/specs/{feature-name}.md and
  updates project-state.md. Derives the feature name from the current issue.
  Supports --from-urs FR-XX mode: reads spec data directly from urs/index.json
  instead of open-ended analysis. Use --from-urs on URS-first FR issues.
---

# foundation--shape-spec

Create a feature spec. The spec is the contract between planning and building — it must exist before `architecture--new-feature` or `implementation--new-feature` runs.

**Preconditions:**
- `.claude/project-config.json` must exist
- `.claude/docs/project-state.md` should exist
- `.claude/docs/specs/_template.md` must exist

---

## --from-urs mode (URS-first FR issues)

**Detect:** If the issue description contains `--from-urs FR-XX` (where XX is a two-digit number), activate `--from-urs` mode. All steps below are replaced by the URS-first workflow. Do NOT run the standard Steps 1–6 in this case.

### --from-urs Step 1 — Extract FR ID

Parse the FR ID from the issue description: look for the pattern `--from-urs (FR-\d+)`.

### --from-urs Step 2 — Read URS artifacts

Read:
- `urs/index.json` — find the entry where `id == "{FR_ID}"`
- `urs/applies-to.json` — find all entries that include `{FR_ID}` in their `applies_to` list

Extract from the FR entry: `id`, `title`, `text`, `rank`, `risk_zone`.
Extract from `applies-to.json`: NFR/UR/VR constraints that apply to this FR.

### --from-urs Step 3 — Write spec from URS data

Determine feature slug: lowercase the title, replace spaces with hyphens, strip special chars.

Write `specs/{feature-slug}.md` using the standard spec template structure, populated entirely from URS data — no LLM invention of requirements:

```markdown
# Spec: {FR_ID} — {title}

**Source:** urs/index.json → {FR_ID}
**Risk Zone:** Z{risk_zone} (Rank {rank})
**Generated:** {today's date}

## Requirement

{text from urs/index.json — verbatim}

## Constraints (from applies-to.json)

{For each NFR/UR/VR that applies to this FR:}
- **{id} ({type}):** {title}

## Acceptance Criteria

Derive 2–4 testable, verb-first criteria directly from the requirement text. Example:
- "Users can {action implied by FR text}"
- "{System} rejects {negative case from FR text}"

Do NOT invent criteria beyond what the requirement text implies.

## Data Shape

Based on the requirement text, identify:
- Tables likely touched (nouns in the requirement)
- New columns or tables needed
- Any RPC-level logic (complex business rules)

## Implementation Notes

Edge cases and constraints implied by the requirement text and its NFR/UR/VR constraints.
```

### --from-urs Step 4 — Write task expansion record

Write `urs/tasks/{FR_ID}.json`:

```json
{
  "fr_id": "{FR_ID}",
  "tasks": ["spec", "migration", "rpc", "action", "component", "tests"],
  "completed": ["spec"],
  "spec_path": "specs/{feature-slug}.md",
  "generated_at": "{ISO timestamp}"
}
```

### --from-urs Step 5 — Update project-state.md

Read `.claude/docs/project-state.md`. In the `## URS Backlog` section, update the row for this FR: set Maturity to `spec`, update Last Updated.

### --from-urs Step 6 — Post completion comment

Post on the issue:

```
Spec written from URS data.

- Source: urs/index.json → {FR_ID}
- Spec: specs/{feature-slug}.md
- Task expansion: urs/tasks/{FR_ID}.json
- Constraints applied: {list of NFR/UR/VR IDs that apply to this FR}

Next: run architecture--new-feature (if schema changes needed) or implementation--new-feature.
```

---

## Standard mode (non-URS issues)

If the issue description does NOT contain `--from-urs`, use the standard workflow below.

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
