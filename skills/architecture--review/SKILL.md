---
name: architecture--review
description: >
  Review existing database migrations and RPC functions against AI Software
  Factory standards. Checks RLS, tenant_id presence, audit triggers, SECURITY
  INVOKER/DEFINER rules, and naming conventions. Can review a specific
  migration, all migrations, a specific RPC, or all functions. Updates
  project-state.md stage if the feature passes. Posts a report as a comment.
---

# architecture--review

Audit schema and RPC code against AI Software Factory standards.

**Preconditions:**
- `.claude/project-config.json` must exist

Read before starting:
- `.claude/project-config.json` — multi-tenant vs single-tenant
- `.claude/docs/architecture-os/schema-conventions.md`
- `.claude/docs/architecture-os/rpc-standards.md`
- `.claude/docs/architecture-os/audit-trail.md`
- `.claude/docs/foundation/compliance-standards.md`

---

## What to review

Determine the review scope from the issue context:
- If the issue references a specific feature: review migrations and functions for that feature
- Otherwise: review all migrations in `supabase/migrations/` and all functions

---

## Schema checks

For each migration file, check:

- [ ] All tables have: `id (UUID)`, `created_at`, `updated_at`, `created_by`, `updated_by`
- [ ] **When multi-tenant:** all business tables have `tenant_id`
- [ ] RLS enabled on every table in the **same migration** that creates it
- [ ] **When multi-tenant:** RLS policies use `(SELECT private.get_active_tenant_id())` pattern
- [ ] **When single-tenant:** RLS policies use `auth.uid()` for access control
- [ ] No `SECURITY DEFINER` functions in the `public` schema
- [ ] Audit trigger on all business-critical tables (per `audit-trail.md`)
- [ ] Table names are plural snake_case
- [ ] Foreign keys have corresponding indexes

---

## RPC checks

For each RPC function, check:

- [ ] `SECURITY INVOKER` by default
- [ ] `SECURITY DEFINER` only in `private` schema with `SET search_path = ''`
- [ ] **When multi-tenant:** tenant membership validated at start of every RPC
- [ ] **When single-tenant:** `auth.uid()` validated at start of every RPC
- [ ] No raw string interpolation in dynamic SQL
- [ ] Consistent return shapes

---

## Report format

```
❌ [table/function name]
   Issue: [what is wrong]
   Standard: [which doc and section]
   Fix: [exact SQL to resolve it]

✅ [table/function name] — [brief confirmation]
```

---

## Update project state

If this review was run for a specific feature and all checks pass with no ❌:
- Read `.claude/docs/project-state.md`
- Update the feature's **Stage** to `reviewed ←` (architecture reviewed)
- Set the `architecture_reviewed` column in Feature Timeline to today's date
- Write the updated `project-state.md`

If issues were found, do not update the stage.

---

## Post completion comment

Post the full report as a comment on the issue. End with:

> "Review complete. {N issues found / All checks passed.}
>
> {If issues: Fix the issues above, then re-run `architecture--review`.}
> {If clear: Ready to proceed with `implementation--new-feature`.}"
