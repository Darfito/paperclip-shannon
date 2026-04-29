---
name: data-fetching--review
description: >
  Audit data fetching patterns against caching and server/client standards.
  Checks: use cache directive usage, cacheTag/cacheLife presence, no
  unstable_cache, no useEffect+fetch, TanStack Query for client-side fetching,
  HydrationBoundary usage. Can review a specific file, a feature directory,
  or all of src/. Posts a report as a comment on the issue.
---

# data-fetching--review

Audit data fetching and caching patterns against AI Software Factory standards.

**Preconditions:**
- `.claude/project-config.json` must exist

Read before starting:
- `.claude/project-config.json` — project context
- `.claude/docs/data-fetching-os/caching-strategy.md`
- `.claude/docs/data-fetching-os/server-vs-client.md`

---

## What to review

Determine scope from the issue context:
- If the issue references a specific feature: review `src/features/{domain}/`
- Otherwise: review all of `src/`

---

## Caching checks

- [ ] Supabase queries wrapped in `'use cache'` functions where appropriate
- [ ] `cacheTag` set for granular invalidation
- [ ] `cacheLife` set explicitly
- [ ] `revalidateTag` called with two args: `revalidateTag('tag', 'max')`
- [ ] User-specific or RLS-governed data is **NOT** cached
- [ ] Auth state is **NOT** cached
- [ ] `unstable_cache` is **NOT** used (deprecated in Next.js 16)

---

## Server vs client checks

- [ ] Default to Server Components — `'use client'` only at leaf level
- [ ] No `useEffect` + `fetch` patterns
- [ ] TanStack Query for all client-side data fetching
- [ ] `HydrationBoundary` + `prefetchQuery` where a client component needs data on first render without a loading spinner
- [ ] Realtime subscriptions invalidate via `queryClient.invalidateQueries()`

---

## Report format

```
❌ src/features/dashboard/components/DashboardStats.tsx
   Issue: Direct Supabase query in Client Component via useEffect+fetch
   Standard: .claude/docs/data-fetching-os/server-vs-client.md
   Fix: Move query to Server Component parent, pass data as props

✅ src/features/projects/queries.ts — Correctly wrapped with 'use cache',
   cacheTag and cacheLife set
```

---

## Post completion comment

Post the full report as a comment on the issue. End with:

> "Data fetching review complete. {N issues found / All checks passed.}
>
> {If issues: Fix the issues above, then re-run `data-fetching--review`.}
> {If clear: Data fetching patterns are correct.}"
