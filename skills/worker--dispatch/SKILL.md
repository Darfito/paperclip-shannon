---
name: worker--dispatch
description: >
  Dispatch one or more lightweight worker API calls in parallel and collect
  their output. Use when the SWE Lead needs to fan out coding, design, or
  testing tasks to Haiku workers. Each worker is a single
  anthropic.messages.create() call — not a full Claude Code session. After
  collecting output, report the aggregated token costs to Paperclip. Do NOT
  use for tasks that require file system access, tool calls, or multi-turn
  conversation — those belong in full agent sessions.
---

# worker--dispatch

Dispatch parallel Haiku workers for coding, design, or testing tasks. Workers are single-turn `messages.create()` calls — cheap, focused, and stateless. The SWE Lead orchestrates them and reviews their output.

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

Workers call the Anthropic API directly using `WORKER_API_KEY` — a separate key from the orchestrator's `claude login` credentials so Claude Code does not pick it up as agent auth. Set `WORKER_API_KEY=sk-ant-...` as an environment variable on the SWE Lead agent in Paperclip UI → Agent → Configuration → Environment variables.

Write and execute the following Python script (adjust `TASKS` for your specific dispatch batch):

```python
#!/usr/bin/env python3
"""Worker dispatch — fan-out Sonnet workers and collect results."""
import asyncio, os, time, json
import anthropic

PAPERCLIP_API_URL = os.environ["PAPERCLIP_API_URL"]
PAPERCLIP_API_KEY = os.environ["PAPERCLIP_API_KEY"]
PAPERCLIP_AGENT_ID = os.environ["PAPERCLIP_AGENT_ID"]
PAPERCLIP_COMPANY_ID = os.environ["PAPERCLIP_COMPANY_ID"]
PAPERCLIP_TASK_ID = os.environ.get("PAPERCLIP_TASK_ID", "")
WORKER_API_KEY = os.environ["WORKER_API_KEY"]

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

MODEL = "claude-sonnet-4-6"
# Sonnet 4.6 pricing (per token)
INPUT_COST_PER_TOKEN  = 3.00 / 1_000_000   # $3.00 / MTok
OUTPUT_COST_PER_TOKEN = 15.00 / 1_000_000  # $15.00 / MTok

client = anthropic.AsyncAnthropic(api_key=WORKER_API_KEY)

async def run_worker(task: dict) -> dict:
    """Call one worker and return its output + usage."""
    start = time.time()
    response = await client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": task["prompt"]}],
    )
    elapsed = time.time() - start
    usage = response.usage
    return {
        "id": task["id"],
        "type": task["type"],
        "output": response.content[0].text,
        "input_tokens": usage.input_tokens,
        "output_tokens": usage.output_tokens,
        "cached_input_tokens": getattr(usage, "cache_read_input_tokens", 0),
        "elapsed_sec": round(elapsed, 2),
    }

async def report_cost(result: dict):
    """POST a single worker's token cost to Paperclip."""
    import urllib.request
    cost_cents = int(round(
        (result["input_tokens"] * INPUT_COST_PER_TOKEN +
         result["output_tokens"] * OUTPUT_COST_PER_TOKEN) * 100
    ))
    payload = json.dumps({
        "agentId":           PAPERCLIP_AGENT_ID,
        "issueId":           PAPERCLIP_TASK_ID,
        "provider":          "anthropic",
        "biller":            "worker",
        "billingType":       "worker_dispatch",
        "model":             MODEL,
        "inputTokens":       result["input_tokens"],
        "cachedInputTokens": result["cached_input_tokens"],
        "outputTokens":      result["output_tokens"],
        "costCents":         max(cost_cents, 0),
        "occurredAt":        time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }).encode()
    req = urllib.request.Request(
        f"{PAPERCLIP_API_URL}/api/companies/{PAPERCLIP_COMPANY_ID}/cost-events",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {PAPERCLIP_API_KEY}"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"[warn] cost report failed for {result['id']}: {e}")

async def main():
    print(f"Dispatching {len(TASKS)} workers in parallel...")
    results = await asyncio.gather(*[run_worker(t) for t in TASKS])

    await asyncio.gather(*[report_cost(r) for r in results], return_exceptions=True)

    total_in   = sum(r["input_tokens"]  for r in results)
    total_out  = sum(r["output_tokens"] for r in results)
    total_cost = sum(
        int(round((r["input_tokens"] * INPUT_COST_PER_TOKEN +
                   r["output_tokens"] * OUTPUT_COST_PER_TOKEN) * 100))
        for r in results
    )
    print(f"\n=== DISPATCH SUMMARY ===")
    print(f"Workers: {len(results)} | Tokens in: {total_in} | Tokens out: {total_out} | Cost: {total_cost}¢")

    print("\n=== WORKER OUTPUTS ===")
    for r in results:
        print(f"\n--- [{r['id']}] ({r['type']}, {r['elapsed_sec']}s) ---")
        print(r["output"])
        print(f"--- END [{r['id']}] ---")

asyncio.run(main())
```

Run with:
```bash
python3 /tmp/worker_dispatch.py
```

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

- `biller: "worker"` distinguishes worker costs from direct SWE Lead agent costs in the Paperclip dashboard.
- Report one cost event per worker call (not one aggregated event) so the board sees per-task cost breakdown.
- If `PAPERCLIP_TASK_ID` is not set, omit `issueId` from the payload.
- Cost reporting failures are non-fatal — log the warning and continue.
- `WORKER_API_KEY` is intentionally separate from `ANTHROPIC_API_KEY` — Claude Code ignores it so orchestrators stay on subscription auth.
