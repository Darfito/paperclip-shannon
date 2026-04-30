---
name: sandbox--status
description: >
  Check the current state of the local development sandbox: whether the
  Next.js dev server is running and whether the local Supabase stack is up.
  Read-only — does not start or stop anything. Posts a status summary as a
  comment. Use to diagnose sandbox issues before running sandbox--test.
---

# sandbox--status

Check whether the sandbox is up without starting or stopping anything.

---

## Step 1 — Check local Supabase

```bash
npx supabase status
```

Note whether the API URL and anon key are shown (stack running) or an error is returned (stack stopped).

---

## Step 2 — Check dev server

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

- `200` or `307` → dev server is running
- Connection refused / timeout → dev server is stopped

Also check if a PID file exists:

```bash
cat .sandbox/dev.pid 2>/dev/null && echo "PID file exists" || echo "No PID file"
```

---

## Step 3 — Post status comment

Post a comment on the issue:

```
Sandbox status:

Supabase: {running at http://127.0.0.1:54321 | stopped}
Dev server: {running on http://localhost:3000 (PID: N) | stopped}

{If anything is stopped: "Run sandbox--up to start the sandbox."}
```
