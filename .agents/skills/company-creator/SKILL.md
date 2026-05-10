---
name: company-creator
description: >
  Create a Shannon AI Software Factory company package. Use when a user wants
  to set up a new factory company — a four-agent pipeline (CEO → PM → UI/UX
  Lead → SWE Lead) with worker dispatch for implementation tasks. Triggers on:
  "create a company", "make me a company", "set up a factory company", "create
  Shannon company", "bootstrap factory", "new factory project", or when the user
  wants to set up the AI Software Factory pipeline for a project. Do NOT use for
  importing an existing company package (use the CLI import command instead) or
  for modifying a company that is already running in Paperclip.
---

# Company Creator

Create a Shannon AI Software Factory company package conforming to the Agent Companies specification (`agentcompanies/v1`).

The company structure is fixed: **CEO → PM → UI/UX Lead → SWE Lead**, with Code/Design/Test Workers dispatched by the SWE Lead. This is the standard architecture for this Paperclip fork. Do not offer alternatives.

Spec references:

- Normative spec: `docs/companies/companies-spec.md`
- Quick reference: [references/companies-spec.md](references/companies-spec.md)
- Shannon v2 template (sequential): [references/shannon-company.md](references/shannon-company.md)
- Shannon v3 template (roundtable / debate): [references/shannon-v3-company.md](references/shannon-v3-company.md)
- Shannon v4 template (URS-first + roundtable): [references/shannon-v4-company.md](references/shannon-v4-company.md)

### Template variants

| Variant | Spec stage flow | URS-first lane | When to use |
|---|---|---|---|
| **v2** (default) | Linear `CEO → PM → UI/UX → SWE` via `NEXT_COMMAND:` | No | Stable, well-tested. Use when the PM brief is unlikely to need technical pushback. |
| **v3** (roundtable) | Tagged-signal debate: `CEO → PM ↔ SWE Lead`, optional UI/UX | No | Use when SWE Lead should validate PM briefs before execution. Requires debate-router server code (Steps 12+13). |
| **v4** (URS-first) | Same as v3 debate + auto-wakeup | Yes — CEO ingests URS, PM auto-creates Sprint 0 FR tickets | Use when starting from a written URS or product brief that should auto-generate FR issues. Requires Steps 12+13 + 5 URS skills. |

All variants are interchangeable at the company level — swap by re-importing with a different template.

---

## Process

### Step 1: Gather context (use AskUserQuestion)

Ask the user **four** things in one round:

1. **Template variant** — `v2` (sequential, default), `v3` (roundtable / debate), or `v4` (URS-first + roundtable). Explain the trade-off only if the user asks.
2. **Project name** — what is this factory company building? (e.g. "XLSMART Package Advisor", "Santoso Protocol")
3. **Project path** — absolute path to the project directory on the server (will be set as `cwd` for each agent, e.g. `/home/santoso/gunawan-agents/my-project`)
4. **Output directory** — where to write the company package (default: `companies/<project-slug>/`, `companies/<project-slug>-v3/` for v3, `companies/<project-slug>-v4/` for v4)

Do not ask about agents, skills, workflow, or company structure — those are pre-defined per variant.

### Step 2: Read the template

Read the template file matching the chosen variant:

- v2 → [references/shannon-company.md](references/shannon-company.md)
- v3 → [references/shannon-v3-company.md](references/shannon-v3-company.md)
- v4 → [references/shannon-v4-company.md](references/shannon-v4-company.md)

This is the canonical package template. Generate all files from it, substituting:

- Company `name` and `slug` with the project name
- `cwd` in `.paperclip.yaml` with the project path from Step 1
- README with the project name and description

Do not deviate from the template structure. Do not add or remove agents. Do not change skill assignments.

### Step 3: Write README.md

Every company package gets a README. Include:

- Company name and what it builds
- Pipeline stages table (spec → design → implementation → sandboxed → tested → shipped)
- Org chart as a markdown list
- Skills table (from the template)
- Getting started: `paperclipai company import --from <output-dir>`
- After import: set `cwd` per agent if not already set in `.paperclip.yaml`

### Step 4: Write all files and summarize

Write the full package to the output directory. Then give a brief summary:

- Company name and project path
- Output directory
- Agent roster with roles
- Reminder to install factory skills before agents can run

---

## Package structure

```
<output-dir>/
├── COMPANY.md
├── agents/
│   ├── ceo/AGENTS.md
│   ├── pm/AGENTS.md
│   ├── designer/AGENTS.md
│   └── swe-lead/AGENTS.md
├── .paperclip.yaml
└── README.md
```
