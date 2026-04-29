---
name: architecture--new-feature
description: >
  Design the architecture for a new feature: generate the SQL migration
  (with RLS in the same migration), optional RPC functions, and an API
  contract entry. Reads the feature spec and project-config.json to determine
  multi-tenancy requirements automatically. Writes the migration to
  supabase/migrations/, appends to api-contracts.md, and updates
  project-state.md. Run after foundation--shape-spec.
---

# architecture--new-feature

Generate the database migration, RPC functions, and API contract for a new feature.

**Preconditions:**
- `.claude/project-config.json` must exist
- Feature spec should exist at `.claude/docs/specs/{feature-name}.md`

Read before starting:
- `.claude/project-config.json` — multi-tenant, auth model
- `.claude/docs/architecture-os/schema-conventions.md`
- `.claude/docs/architecture-os/rpc-standards.md`
- `.claude/docs/architecture-os/api-contracts.md`
- `.claude/docs/architecture-os/audit-trail.md`

---

## Step 1 — Read feature context

Read the feature spec at `.claude/docs/specs/{feature-name}.md`. Derive:
- Feature name and domain
- What tables this feature needs
- Which existing tables need new columns

Note: Multi-tenancy is applied automatically based on `project-config.json` — do not re-ask. If `multiTenant: true`, `tenant_id` is required on every new table. Audit logging is always enabled on business-critical tables per `audit-trail.md`.

---

## Step 2 — Schema design

For each new table, apply `schema-conventions.md`:
- Name: plural snake_case
- Required columns: `id (UUID)`, `tenant_id` (if multi-tenant), `created_at`, `updated_at`, `created_by`, `updated_by`
- Appropriate indexes (foreign keys, tenant_id + status patterns)
- **RLS enabled in the same migration — never as a separate step**

For column additions to existing tables, verify backward compatibility. Adding columns is safe; removing is not. Determine if a default value is needed for existing rows.

Generate the migration SQL. Migration filename: `YYYYMMDDHHMMSS_{feature_name}.sql`

---

## Step 3 — RPC vs direct query

Apply the decision rule from `rpc-standards.md`:
- Single-table, simple filter → direct query, no RPC
- Joins, aggregations, business logic, cross-table writes → RPC

If RPC is needed, determine:
- Function signature
- `SECURITY INVOKER` (default) vs `SECURITY DEFINER` (rare, `private` schema only)
- Generate the function SQL

---

## Step 4 — API contract

If this feature exposes a Server Action or Route Handler, add an entry to `.claude/docs/architecture-os/api-contracts.md`:
- Name
- Input schema (Zod)
- Success response shape
- Error cases
- Auth requirement

---

## Step 5 — Detect breaking schema changes

If the migration renames or drops columns or tables, scan `src/` for references to the old names. If matches are found, include them in the completion comment as a warning before writing.

---

## Step 6 — Write files, update state, and apply migration

Write:
- Migration to `supabase/migrations/{timestamp}_{feature-name}.sql`
- Append API contract to `.claude/docs/architecture-os/api-contracts.md`

Read `.claude/docs/project-state.md` and update:
- **Schema Snapshot:** add new tables and key relationships
- **Backlog:** set the feature's **Stage** to `architecture ←`
- **Feature Timeline:** set the `architecture` column to today's date

Write the updated `project-state.md`.

**Apply the migration to the local Supabase:**

```bash
npx supabase db reset
```

This replays all migrations from scratch against the local Docker stack — the local database is now in sync with the schema. If `db reset` fails, include the error in the completion comment as a warning.

---

## Step 7 — Post completion comment

Post a comment on the issue:

> "Migration generated: `supabase/migrations/{timestamp}_{feature-name}.sql`. API contract updated. project-state.md updated.
>
> {If breaking changes found: ⚠️ Warning: migration renames/drops schema elements. Update these files before proceeding: [list]}
>
> Next step: run `implementation--new-feature` to scaffold the Server Action, Zod schema, and component."
