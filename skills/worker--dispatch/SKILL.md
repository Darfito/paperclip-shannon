---
name: worker--dispatch
description: >
  Dispatch one or more lightweight workers in parallel and collect their output.
  Uses claude -p (subscription mode) by default — no API key required, no variable
  billing. Set USE_API_KEY=true to fall back to WORKER_API_KEY + Anthropic SDK for
  batches >5 workers. After collecting output, a single subscription cost event is
  reported to Paperclip per dispatch batch.
---

# worker--dispatch

Dispatch parallel workers for coding, design, or testing tasks. Workers are single-turn `claude -p` subprocess calls — cheap, focused, and stateless. The SWE Lead orchestrates them and reviews their output.

---

## When to use

- Implementing one component or module per worker (Code Worker)
- Generating CSS/Tailwind/tokens from a design spec (Design Worker)
- Writing unit or integration tests for a specific module (Test Worker)

**Do not use for:**
- Tasks that require reading files from disk (have the SWE Lead read the file and include it in the prompt)
- Tasks requiring tool calls or web search
- Tasks needing multi-turn clarification (resolve ambiguity before dispatching)

---

## Pre-dispatch checklist

Before dispatching any workers, the SWE Lead must have:

- [ ] Read the PM spec and UI/UX design spec from the issue comment thread
- [ ] Produced an architecture plan (`architecture--new-feature`) listing exactly which components/modules/tests to create
- [ ] Resolved all ambiguities — workers must not ask questions

---

## Dispatch script

Workers run via `claude -p` (Claude Code print mode) — no API key required, uses the subscription credentials already on the server (`claude login` as the `paperclip` user). Concurrency is capped at 5 to stay well within the safe range (empirically verified stable up to 15 on this VPS as of 2026-05-04).

Write and execute the following Python script (adjust `TASKS` for your specific dispatch batch):

```python
#!/usr/bin/env python3
"""Worker dispatch — fan-out claude -p workers and collect results."""
import asyncio, os, time, json
import urllib.request

PAPERCLIP_API_URL  = os.environ["PAPERCLIP_API_URL"]
PAPERCLIP_API_KEY  = os.environ["PAPERCLIP_API_KEY"]
PAPERCLIP_AGENT_ID = os.environ["PAPERCLIP_AGENT_ID"]
PAPERCLIP_COMPANY_ID = os.environ["PAPERCLIP_COMPANY_ID"]
PAPERCLIP_TASK_ID  = os.environ.get("PAPERCLIP_TASK_ID", "")
USE_API_KEY        = os.environ.get("USE_API_KEY", "").lower() == "true"
WORKER_API_KEY     = os.environ.get("WORKER_API_KEY", "")

CONCURRENCY_CAP = 5  # verified safe up to 15 on VPS; cap at 5 for production safety

# ── Configure tasks ────────────────────────────────────────────────────────────
# Each task: { "id": str, "type": "code"|"design"|"test", "prompt": str }
TASKS = [
    {
        "id": "component-header",
        "type": "code",
        "prompt": """You are a Code Worker. Write a complete TypeScript React component.

SPEC:
<paste component spec from architecture plan>

Rules:
- Return ONLY the file content, no explanation
- Use the project's existing imports and conventions
- No placeholder comments like "// TODO"
- File: src/components/Header.tsx"""
    },
    # Add more tasks here
]

# ── Rate-limit detection ───────────────────────────────────────────────────────
RATE_LIMIT_PATTERNS = [
    "rate limit", "rate_limit", "too many requests",
    "overloaded", "529", "quota exceeded",
]

def is_rate_limited(stderr: str) -> bool:
    s = stderr.lower()
    return any(p in s for p in RATE_LIMIT_PATTERNS)

# ── Worker implementations ─────────────────────────────────────────────────────

sem = asyncio.Semaphore(CONCURRENCY_CAP)

async def run_worker_subscription(task: dict) -> dict:
    """Run one worker via claude -p (subscription mode)."""
    async with sem:
        start = time.time()
        proc = await asyncio.create_subprocess_exec(
            "claude", "-p", task["prompt"],
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        except asyncio.TimeoutError:
            proc.kill()
            return {"id": task["id"], "type": task["type"], "output": "",
                    "exit_code": -1, "elapsed_sec": 120, "rate_limited": False,
                    "error": "TIMEOUT after 120s"}
        elapsed = round(time.time() - start, 2)
        err_text = stderr.decode().strip()
        rate_limited = is_rate_limited(err_text)
        return {
            "id": task["id"],
            "type": task["type"],
            "output": stdout.decode().strip(),
            "exit_code": proc.returncode,
            "elapsed_sec": elapsed,
            "rate_limited": rate_limited,
            "error": err_text if proc.returncode != 0 else "",
        }

async def run_worker_api(task: dict) -> dict:
    """Run one worker via Anthropic SDK (API key fallback mode)."""
    import anthropic
    async with sem:
        client = anthropic.AsyncAnthropic(api_key=WORKER_API_KEY)
        MODEL = "claude-sonnet-4-6"
        INPUT_COST  = 3.00 / 1_000_000
        OUTPUT_COST = 15.00 / 1_000_000
        start = time.time()
        response = await client.messages.create(
            model=MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": task["prompt"]}],
        )
        elapsed = round(time.time() - start, 2)
        usage = response.usage
        cost_cents = int(round(
            (usage.input_tokens * INPUT_COST + usage.output_tokens * OUTPUT_COST) * 100
        ))
        return {
            "id": task["id"],
            "type": task["type"],
            "output": response.content[0].text,
            "exit_code": 0,
            "elapsed_sec": elapsed,
            "rate_limited": False,
            "error": "",
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
            "cost_cents": cost_cents,
        }

# ── Cost reporting ─────────────────────────────────────────────────────────────

def report_batch_cost(n_workers: int, mode: str, total_cost_cents: int = 0):
    """POST one cost event for the entire dispatch batch."""
    payload = json.dumps({
        "agentId":     PAPERCLIP_AGENT_ID,
        "issueId":     PAPERCLIP_TASK_ID or None,
        "provider":    "anthropic",
        "biller":      "subscription" if mode == "subscription" else "worker",
        "billingType": "subscription_included" if mode == "subscription" else "metered_api",
        "model":       "claude -p",
        "inputTokens": 0,
        "outputTokens": 0,
        "costCents":   total_cost_cents,
        "occurredAt":  time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "metadata":    {"workers": n_workers, "mode": mode},
    }).encode()
    req = urllib.request.Request(
        f"{PAPERCLIP_API_URL}/api/companies/{PAPERCLIP_COMPANY_ID}/cost-events",
        data=payload,
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {PAPERCLIP_API_KEY}"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"[warn] batch cost report failed: {e}")

# ── Main ───────────────────────────────────────────────────────────────────────

async def main():
    mode = "api_key" if USE_API_KEY else "subscription"
    run_worker = run_worker_api if USE_API_KEY else run_worker_subscription

    if USE_API_KEY and not WORKER_API_KEY:
        print("[error] USE_API_KEY=true but WORKER_API_KEY is not set. Aborting.")
        return

    print(f"Dispatching {len(TASKS)} workers in parallel (mode={mode}, cap={CONCURRENCY_CAP})...")
    results = await asyncio.gather(*[run_worker(t) for t in TASKS], return_exceptions=True)

    # Handle any unexpected exceptions from asyncio.gather
    processed = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            processed.append({"id": TASKS[i]["id"], "type": TASKS[i]["type"],
                              "output": "", "exit_code": -1, "elapsed_sec": 0,
                              "rate_limited": False, "error": str(r)})
        else:
            processed.append(r)
    results = processed

    # Check for rate limit hits
    rate_limited = [r for r in results if r.get("rate_limited")]
    if rate_limited:
        print(f"\n[RATE LIMIT HIT] {len(rate_limited)} workers were rate-limited.")
        print("Post a comment on this ticket: 'WORKERS RATE LIMITED — subscription window exhausted.")
        print("Retry after ~60 minutes (Max plan rolling window). Set USE_API_KEY=true to bypass with WORKER_API_KEY.'")

    # Report batch cost
    if USE_API_KEY:
        total_cost = sum(r.get("cost_cents", 0) for r in results)
        report_batch_cost(len(TASKS), "api_key", total_cost)
    else:
        report_batch_cost(len(TASKS), "subscription", 0)

    # Summary
    failed = [r for r in results if r["exit_code"] != 0]
    print(f"\n=== DISPATCH SUMMARY ===")
    print(f"Mode: {mode} | Workers: {len(results)} | Failed: {len(failed)}/{len(results)}")

    print("\n=== WORKER OUTPUTS ===")
    for r in results:
        status = "OK" if r["exit_code"] == 0 else ("RATE_LIMITED" if r.get("rate_limited") else "FAILED")
        print(f"\n--- [{r['id']}] ({r['type']}, {r['elapsed_sec']}s, {status}) ---")
        if r["output"]:
            print(r["output"])
        if r["error"]:
            print(f"[error] {r['error']}")
        print(f"--- END [{r['id']}] ---")

asyncio.run(main())
```

Run with:
```bash
python3 /tmp/worker_dispatch.py
```

---

## Fallback: API key mode

If you hit the subscription rate limit mid-pipeline, or need >5 truly parallel workers (raise the cap carefully), switch to API key mode:

1. Set `USE_API_KEY=true` on the SWE Lead agent (Paperclip UI → Agent → Configuration → Environment variables)
2. Set `WORKER_API_KEY=sk-ant-...` — **must be different from `ANTHROPIC_API_KEY`** so Claude Code doesn't pick it up as orchestrator auth
3. The dispatch script picks the API path automatically

API key mode uses `claude-sonnet-4-6` and reports per-batch token costs to the Paperclip dashboard.

---

## Worker prompt guidelines

**All worker types:**
- Include the full relevant spec inline (don't reference files — workers have no filesystem access)
- Specify the exact output format ("return ONLY the file content")
- Include the target file path so the SWE Lead knows where to write the output
- Do not ask workers to make decisions — resolve ambiguity before dispatch

**Code Worker prompt structure:**
```
You are a Code Worker. Write a complete [language] [component/function/module].

SPEC:
[paste relevant section from architecture plan + PM spec]

EXISTING CONVENTIONS:
[paste relevant imports, types, naming patterns from existing code]

Rules:
- Return ONLY the file content, no explanation
- File: [target path]
```

**Design Worker prompt structure:**
```
You are a Design Worker. Generate [CSS/Tailwind classes/design tokens] for [component].

DESIGN SPEC:
[paste relevant section from UI/UX design spec]

EXISTING TOKENS:
[paste current token values]

Rules:
- Return ONLY the stylesheet/token file content
- File: [target path]
```

**Test Worker prompt structure:**
```
You are a Test Worker. Write [unit/integration] tests for [module].

MODULE CODE:
[paste the module's source]

ACCEPTANCE CRITERIA:
[paste from PM spec]

Rules:
- Return ONLY the test file content
- Use [vitest/jest/pytest] — match the project's existing test framework
- File: [target path]
```

---

## After collecting output

1. Write each worker's output to the target file path.
2. Run `implementation--review` and `data-fetching--review` on the collected output.
3. Fix issues found in review — re-dispatch individual workers if a specific output needs rework.
4. Run `sandbox--up` then `sandbox--test`.

---

## Cost reporting notes

**Subscription mode (default):** Token counts are not available from `claude -p`, so one batch event with `biller: "subscription"` and `costCents: 0` is posted per dispatch. This records that a dispatch happened without a false per-token cost estimate.

**API key mode:** One event per batch with `biller: "worker"`, `billingType: "metered_api"`, and actual cost in cents. Failures are non-fatal — log and continue.

---

## Rate limit behaviour

If the subscription window is exhausted mid-pipeline:
- Affected workers exit with non-zero code and `rate_limited: true`
- The dispatch script prints a clear message with retry guidance
- Post a comment on the Paperclip ticket: `WORKERS RATE LIMITED — retry after ~60 minutes or set USE_API_KEY=true`
- Do not silently fail — operator must see the block

Max plan rolling window: ~60 minutes (verify current Anthropic policy on rate limit reset).
