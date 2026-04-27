---
name: implementation--review
description: >
  Review implementation code against AI Software Factory standards. Checks
  Server Actions (requireAuth, safeParse, ActionResult), components (no
  useEffect fetch, use client at leaf level), state management, and type
  safety. Applies zone-specific depth based on riskZones in project-config.
  Updates project-state.md stage if the feature passes all checks. Posts a
  report as a comment on the issue.
---

# implementation--review

Audit implementation code against AI Software Factory standards.

**Preconditions:**
- `.claude/project-config.json` must exist

Read before starting:
- `.claude/project-config.json` — project context (multi-tenant, auth model, riskZones)
- `.claude/docs/implementation-os/standards.md`

---

## What to review

Determine scope from the issue context:
- If the issue references a specific feature: review `src/features/{domain}/`
- Otherwise: review all of `src/features/`

---

## Zone awareness

Read `project-config.json` and check `riskZones`. Apply zone-specific depth based on the file path:

**Zone 1 (Critical) — additional checks beyond standard:**
- [ ] No dynamic SQL construction or string interpolation in queries
- [ ] Auth checks cannot be bypassed by parameter manipulation
- [ ] Input validation covers boundary conditions (empty, max length, special chars)
- [ ] Error messages do not leak internal state, stack traces, or query details
- [ ] All database writes go through Server Actions (never client-side)

**Zone 3 (Presentational) — lighter review:**
- [ ] No business logic in presentational components (logic belongs in `actions.ts` or `lib/`)
- [ ] No direct Supabase calls in components
- [ ] Accessibility basics: labels, alt text, keyboard navigation
- [ ] Components are presentational (no side effects in render)

Report the zone for each file reviewed:
```
✅ src/lib/auth/server.ts [Zone 1 — Critical]
❌ src/features/tasks/_components/TaskForm.tsx [Zone 3 — Presentational]
```

---

## Standard checks

### Server Actions

- [ ] `'use server'` at top of file
- [ ] Returns `ActionResult<T>` — never throws
- [ ] `requireAuth()` is first call in every action
- [ ] Input validated with `safeParse()` before any database call
- [ ] No service_role key in client-callable code

### Components

- [ ] Forms use React Hook Form + Zod resolver
- [ ] No `useEffect` + `fetch` for data fetching (use TanStack Query)
- [ ] `'use client'` is at leaf level, not on parent layouts
- [ ] No direct Supabase client calls in Client Components

### State management

- [ ] URL state for shareable/bookmarkable state
- [ ] No Zustand for data that comes from the server
- [ ] No Redux

### Type safety

- [ ] No `any` types
- [ ] Database types from Supabase-generated types, not hand-written
- [ ] Zod schemas are source of truth for input shapes

---

## Report format

```
❌ src/features/projects/actions.ts:42
   Issue: Input not validated before database call
   Standard: .claude/docs/implementation-os/standards.md — Validation
   Fix: Add safeParse() before the supabase call

✅ src/features/projects/schemas.ts — Zod schemas correct, types exported
```

---

## Update project state

If this review was run for a specific feature and all checks pass with no ❌:
- Read `.claude/docs/project-state.md`
- Update the feature's **Stage** to `reviewed ←`
- Set the `reviewed` column in Feature Timeline to today's date
- Write the updated `project-state.md`

If issues were found, do not update the stage.

---

## Post completion comment

Post the full report as a comment on the issue. End with:

> "Review complete. {N issues found / All checks passed.}
>
> {If issues: Fix the issues above, then re-run `implementation--review`.}
> {If clear and was for a specific feature: Feature is reviewed. Ready for sandbox testing.}"
