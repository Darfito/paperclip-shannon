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

Workers run via `claude -p` (Claude Code print mode) — no API key required, uses the subscription credentials already configured on the server. Each worker is a one-shot subprocess call run in parallel.

Write and execute the following Python script (adjust `TASKS` for your specific dispatch batch):

```python
#!/usr/bin/env python3
"""Worker dispatch — fan-out claude -p workers and collect results."""
import asyncio, os, time

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

async def run_worker(task: dict) -> dict:
    """Run one worker via claude -p and return its output."""
    start = time.time()
    proc = await asyncio.create_subprocess_exec(
        "claude", "-p", task["prompt"],
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    elapsed = round(time.time() - start, 2)
    output = stdout.decode().strip()
    if proc.returncode != 0:
        output = f"[ERROR] Worker failed:\n{stderr.decode().strip()}"
    return {
        "id": task["id"],
        "type": task["type"],
        "output": output,
        "elapsed_sec": elapsed,
        "exit_code": proc.returncode,
    }

async def main():
    print(f"Dispatching {len(TASKS)} workers in parallel via claude -p...")
    results = await asyncio.gather(*[run_worker(t) for t in TASKS])

    failed = [r for r in results if r["exit_code"] != 0]
    print(f"\n=== DISPATCH SUMMARY ===")
    print(f"Workers: {len(results)} | Failed: {len(failed)}")

    print("\n=== WORKER OUTPUTS ===")
    for r in results:
        status = "OK" if r["exit_code"] == 0 else "FAILED"
        print(f"\n--- [{r['id']}] ({r['type']}, {r['elapsed_sec']}s, {status}) ---")
        print(r["output"])
        print(f"--- END [{r['id']}] ---")

asyncio.run(main())
```

Run with:
```bash
python3 /tmp/worker_dispatch.py
```

> **If you have an Anthropic API key:** Set `WORKER_API_KEY=sk-ant-...` as a secret on the SWE Lead agent and switch the script to use `anthropic.AsyncAnthropic(api_key=os.environ["WORKER_API_KEY"]).messages.create(...)` instead of `claude -p`. This enables Haiku (cheaper, faster) and token cost reporting to the Paperclip dashboard.

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

With subscription mode (`claude -p`), token counts are not available so cost reporting to Paperclip is skipped. The dispatch summary prints worker count and elapsed time instead.

If you switch to API key mode, re-add cost reporting: POST one event per worker to `/api/companies/{companyId}/cost-events` with `biller: "worker"` and `billingType: "worker_dispatch"`. Cost reporting failures are non-fatal — log and continue.
