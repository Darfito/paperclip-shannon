---
name: foundation--inject-standards
description: >
  Load the project standards most relevant to the current task into context.
  Use at the start of any work session before running other skills — especially
  before architecture, implementation, or review tasks. Reads standards-index.yml
  and loads the 3–5 most relevant docs from .claude/docs/ based on the current
  issue context. Does not modify any files.
---

# foundation--inject-standards

Load relevant project standards into context before starting work. This ensures every action taken in the current session is grounded in the project's specific standards, not Claude's general knowledge.

**Preconditions:**
- `.claude/project-config.json` must exist in the agent's `cwd`
- `.claude/docs/standards-index.yml` must exist

---

## Process

### Step 1 — Read config and current issue

Read `.claude/project-config.json` and `.claude/docs/standards-index.yml`.

Infer the current task from the issue title, description, and pipeline stage (available from `PAPERCLIP_TASK_ID` context). If no issue context is available, read all standard docs.

### Step 2 — Match and load standards

Using `standards-index.yml`, identify the 3–5 most relevant standard IDs for the current task. Read the files listed under those IDs.

Also check:
- If the task references a specific feature: read `.claude/docs/specs/{feature-name}.md` if it exists
- If the task touches the UI: read `.claude/docs/design-os/screens/{feature-name}.md` if it exists

### Step 3 — Confirm and proceed

Post a brief comment on the issue:
> "Standards loaded: [list of loaded docs]. Proceeding with task."

Then continue with the assigned work.

---

## When to use

Run this at the start of every work session before other skills:
- Before `architecture--new-feature` — loads schema + rpc + api-contracts standards
- Before `implementation--new-feature` — loads implementation + design standards
- Before `architecture--review` or `implementation--review` — loads review checklists
- Before any task in an unfamiliar feature area
