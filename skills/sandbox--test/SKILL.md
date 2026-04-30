---
name: sandbox--test
description: >
  Run the full test suite and take Playwright screenshots of the running app
  so the agent can visually verify the UI. Runs pnpm test:run for unit/
  integration tests, then uses headless Chromium to screenshot key routes.
  The agent reads the screenshots and reports what it sees. Posts a combined
  test + visual report as a comment. Run after sandbox--up.
---

# sandbox--test

Run tests and visually inspect the running app via Playwright screenshots.

**Preconditions:**
- Dev server must be running (`sandbox--up` must have succeeded)
- `.sandbox/dev.pid` must exist

---

## Step 1 — Verify sandbox is live

```bash
curl -s http://localhost:3000 > /dev/null 2>&1 && echo "UP" || echo "DOWN"
```

If the result is "DOWN", stop and post a comment: "Sandbox is not running. Run `sandbox--up` first."

---

## Step 2 — Run unit and integration tests

```bash
pnpm test:run 2>&1 | tee .sandbox/test-output.txt
```

Record the exit code and summary line (passed / failed / skipped counts). Do not stop on test failures — continue to visual inspection so the full picture is captured.

---

## Step 3 — Discover app routes

List the top-level route directories in `src/app/` to know what pages exist:

```bash
find src/app -maxdepth 2 -name "page.tsx" | sed 's|src/app||;s|/page.tsx||' | sort
```

Identify the routes that are publicly accessible (no auth required). At minimum screenshot:
- `/` — home or landing page
- `/login` — always present

Add any other public routes found in the output above.

---

## Step 4 — Take screenshots

For each public route, take a full-page screenshot:

```bash
mkdir -p .sandbox/screenshots
npx playwright screenshot --wait-for-timeout=3000 --full-page http://localhost:3000 .sandbox/screenshots/home.png
npx playwright screenshot --wait-for-timeout=3000 --full-page http://localhost:3000/login .sandbox/screenshots/login.png
```

For any other public routes found in Step 3, screenshot them too using the same pattern:
```bash
npx playwright screenshot --wait-for-timeout=3000 --full-page http://localhost:3000/{route} .sandbox/screenshots/{route-name}.png
```

---

## Step 5 — Read and analyze screenshots

Read each screenshot file using your vision capability. For each screenshot, note:
- Does the page render without a blank white screen or error overlay?
- Are the main UI elements visible (nav, headings, forms)?
- Are there any visible console error banners or "Something went wrong" messages?
- Does the layout look intentional or broken?

---

## Step 6 — Post combined report

Post a comment on the issue:

```
Sandbox test report:

Unit tests: {passed}/{total} passed, {failed} failed
{If failures: list the failing test names}

Visual inspection:
- / (home): {what you saw}
- /login: {what you saw}
- /{other routes}: {what you saw}

Overall: {PASS if tests pass and UI renders correctly | FAIL with reason}

{If PASS: "Ready for human review checkpoint."}
{If FAIL: "Issues found — fixing before checkpoint."}
```
