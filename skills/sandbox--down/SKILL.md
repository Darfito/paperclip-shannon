---
name: sandbox--down
description: >
  Stop the local Next.js dev server started by sandbox--up. Reads the PID from
  .sandbox/dev.pid and kills the process. Does not stop the local Supabase
  stack — Supabase keeps running between sandbox sessions. Run after sandbox
  testing is complete or before starting a fresh sandbox session.
---

# sandbox--down

Stop the local dev server.

**Preconditions:**
- `.sandbox/dev.pid` must exist (written by `sandbox--up`)

---

## Step 1 — Kill the dev server

```bash
kill $(cat .sandbox/dev.pid) 2>/dev/null
rm -f .sandbox/dev.pid
```

If `.sandbox/dev.pid` does not exist, the server was not started via `sandbox--up`. Check for stray processes:

```bash
lsof -ti :3000 | xargs kill -9 2>/dev/null || echo "No process on port 3000"
```

---

## Step 2 — Post completion comment

Post a comment on the issue:

> "Sandbox down. Dev server stopped. Local Supabase still running."
