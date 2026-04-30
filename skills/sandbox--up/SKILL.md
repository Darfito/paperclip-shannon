---
name: sandbox--up
description: >
  Start the local development sandbox: ensure Playwright is installed, verify
  the local Supabase stack is running (start it if not), start the Next.js dev
  server in background, and confirm the app responds on port 3000. Saves the
  dev server PID to .sandbox/dev.pid for sandbox--down to use. Run this before
  sandbox--test or any manual QA session.
---

# sandbox--up

Start the local development sandbox so the agent can test and visually inspect the running app.

**Preconditions:**
- `.env.local` must exist with real Supabase credentials (run `foundation--discover` first)
- `package.json` must have a `dev` script

---

## Step 1 — Ensure Playwright is installed

Check whether Playwright is already installed:

```bash
npx playwright --version 2>/dev/null
```

If the command fails (not installed), install it:

```bash
npx playwright install --with-deps chromium
```

This is a one-time ~200MB download. Subsequent runs skip it automatically.

---

## Step 2 — Ensure local Supabase is running

```bash
npx supabase status
```

If the status output shows `API URL` and `anon key`, the stack is already running — skip to Step 3.

If it shows an error or "not running", start it:

```bash
npx supabase start
```

Wait for it to complete before continuing.

---

## Step 3 — Start the dev server

Create the sandbox output directory and start the dev server in background:

```bash
mkdir -p .sandbox
pnpm dev > .sandbox/dev.log 2>&1 &
echo $! > .sandbox/dev.pid
```

---

## Step 4 — Wait for the app to respond

Poll until the dev server is ready (timeout 60 seconds):

```bash
timeout 60 bash -c 'until curl -s http://localhost:3000 > /dev/null 2>&1; do sleep 2; done'
```

If the timeout is reached without a response, read `.sandbox/dev.log` for errors, include them in the completion comment, and stop — do not proceed to sandbox--test.

---

## Step 5 — Post completion comment

Post a comment on the issue:

> "Sandbox up. Dev server running on http://localhost:3000 (PID: [pid from .sandbox/dev.pid]). Local Supabase running. Ready for `sandbox--test`."
