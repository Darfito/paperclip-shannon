---
name: foundation--validate
description: >
  Check project health — verify that all expected files exist, config is
  valid, and the command chain is in a consistent state. Also checks
  traceability: every feature with a spec should have @spec tags in its
  implementation files. Read-only — does not modify any files. Posts a
  health report as a comment on the current issue.
---

# foundation--validate

Check project health. Read-only — does not modify files.

**Preconditions:**
- `.claude/project-config.json` must exist

---

## Step 1 — Validate config

Read `.claude/project-config.json`. Validate against `.claude/project-config.schema.json`:
- All required fields are present
- `schemaVersion` matches expected version
- `status` is a valid value
- `authModel` is `"supabase-auth"` or `"keycloak"`

---

## Step 2 — Check foundation files

Verify these files exist and are non-empty:

| File | Required when | Created by |
|------|--------------|------------|
| `.claude/project-config.json` | Always | `foundation:init` |
| `.claude/docs/foundation/product-mission.md` | Always | `foundation:init` → `foundation--discover` |
| `.claude/docs/project-state.md` | After planning | `foundation--plan` |

Report each as: ✅ exists | ⚠️ stub only | ❌ missing

---

## Step 3 — Check baseline generated files

Based on `project-config.json`, verify init generated the expected files:

**Always expected:**
- [ ] `src/app/(auth)/callback/route.ts`
- [ ] `src/lib/auth/server.ts`
- [ ] `supabase/migrations/` has at least one migration file

**When `authModel: "supabase-auth"`:**
- [ ] `src/app/(auth)/login/page.tsx`
- [ ] `src/app/(auth)/signup/page.tsx`

**When `authModel: "keycloak"`:**
- [ ] `src/app/(auth)/login/page.tsx`

**When `multiTenant: true`:**
- [ ] `src/app/(app)/onboarding/` exists
- [ ] Baseline migration includes `tenants`, `tenant_members` tables

**When `multiTenant: false`:**
- [ ] Baseline migration includes `profiles` table (without `active_tenant_id`)

---

## Step 4 — Check feature files

If `project-state.md` exists with features at stage `implementation` or later:

For each such feature, verify:
- [ ] Spec exists: `.claude/docs/specs/{feature-name}.md`
- [ ] Migration exists: `supabase/migrations/*_{feature-name}.sql` (if feature required schema changes)
- [ ] Feature code exists: `src/features/{domain}/`
- [ ] Tests exist alongside feature code

**Traceability check:** For each feature that has a spec file, search for `// @spec: {feature-name}` in `src/features/` and test files. Report:
- ✅ `{feature-name}`: code files ({count}), test files ({count})
- ⚠️ `{feature-name}`: code files found but no `@spec` tags in tests
- ⚠️ `{feature-name}`: no `@spec` tags found (predates traceability — add via `implementation--review`)

---

## Step 5 — Check standards consistency

- [ ] `CLAUDE.md` references `project-config.json`
- [ ] No hardcoded multi-tenancy assumptions in a single-tenant project
- [ ] No hardcoded single-tenant assumptions in a multi-tenant project

---

## Step 6 — Post health report

Post the complete report as a comment on the issue:

```
Project Health: {projectName}
Config: ✅ valid | ❌ {issue}
Status: {project-config status}

Foundation:
  ✅ project-config.json
  ✅ product-mission.md (completed)
  ✅ project-state.md ({N} features planned, {M} done)

Baseline:
  ✅ Auth pages
  ✅ Auth utility
  ✅ Baseline migration

Features:
  ✅ {feature} — spec, migration, code, tests, traceability
  ⚠️ {feature} — spec exists, no migration yet
  🔲 {feature} — not started

Issues found: {count}
  ❌ {description of each issue}
```
