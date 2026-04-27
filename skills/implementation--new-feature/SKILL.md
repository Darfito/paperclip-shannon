---
name: implementation--new-feature
description: >
  Scaffold the implementation layer for a feature: Server Action, Zod schema,
  component structure, and TanStack Query hook if needed. Reads the feature
  spec, API contract, and design screen spec to generate the correct files.
  Every generated file includes a @spec traceability comment. Writes files to
  src/features/{domain}/ and updates project-state.md. Run after
  architecture--new-feature (or directly if no schema changes were needed).
---

# implementation--new-feature

Scaffold the Server Action, Zod schema, and components for a feature.

**Preconditions:**
- `.claude/project-config.json` must exist
- Migration should exist for this feature (if it required schema changes)

Read before starting:
- `.claude/project-config.json` — multi-tenant, auth model
- `.claude/docs/implementation-os/standards.md`
- `.claude/docs/architecture-os/api-contracts.md` — find the contract for this feature
- `.claude/docs/specs/{feature-name}.md` — the feature spec
- `.claude/docs/design-os/screens/{feature-name}.md` — screen spec if it exists

**If a screen spec exists, read it before writing any component code.** The design spec is the source of truth for what the UI should look like.

---

## Step 1 — Determine feature context

From the spec and API contract, derive:
- Feature name and domain (`src/features/{domain}/`)
- Whether this is a **write action** (mutation) or **read-only display**
  - Write → scaffold Server Action + form/button component
  - Read-only → scaffold Server Component page + typed RPC call (no Server Action)
- Whether the API contract references an RPC or direct table query
  - Direct query → use `supabase.from('table').select()`
  - RPC → use `supabase.rpc('function_name', params)` with typed return interface

---

## Step 2 — Scaffold structure

Generate this file structure:

```
src/features/{domain}/
  schemas.ts
  actions.ts
  _components/
    {FeatureName}Form.tsx     ← if form-based
    {FeatureName}Button.tsx   ← if action-triggered
  hooks/
    use{FeatureName}.ts       ← if client data fetching needed
```

**Traceability:** Add `// @spec: {feature-name}` in every generated file:
- In `schemas.ts` and utility files: first line
- In `actions.ts`: after `'use server'`
- In components: after `'use client'` (if present)

### schemas.ts

```typescript
// @spec: {feature-name}
import { z } from 'zod';

export const {featureName}Schema = z.object({
  // fields from spec data shape
});

export type {FeatureName}Input = z.infer<typeof {featureName}Schema>;
```

### actions.ts (write actions)

```typescript
'use server';
// @spec: {feature-name}

import { requireAuth } from '@/lib/auth/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/actions';
import { {featureName}Schema } from './schemas';

export async function {featureName}Action(
  input: {FeatureName}Input
): Promise<ActionResult<{ReturnType}>> {
  const { user } = await requireAuth();  // always first

  const parsed = {featureName}Schema.safeParse(input);  // always before DB call
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  // implementation
}
```

Rules that must always hold:
- `requireAuth()` is always the first call
- Input validated with `safeParse()` before any database call
- Return `ActionResult<T>` — never throw, never return raw errors

### Read-only Server Component pattern

For read-only features, generate:
- A Server Component page with a direct RPC call
- A typed interface for the RPC return shape
- A presentational client component if interactivity is needed
- No `actions.ts` or `schemas.ts`

### Component rules

- React Hook Form + Zod resolver for forms
- Shadcn Form primitives
- Never call Server Actions from `useEffect`

---

## Step 3 — Update project state

Read `.claude/docs/project-state.md` and update:
- **Backlog:** set the feature's **Stage** to `implementation ←`
- **Feature Timeline:** set the `implementation` column to today's date
- **Established Patterns:** if this is the first feature of its kind, document the pattern

Write the updated `project-state.md`.

---

## Step 4 — Post completion comment

Post a comment on the issue:

> "Implementation scaffolded at `src/features/{domain}/`. project-state.md updated.
>
> Files created: [list]
>
> Next step: run `architecture--review` and `implementation--review` on this feature, then sandbox testing."
