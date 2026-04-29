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
- Shannon template: [references/shannon-company.md](references/shannon-company.md)

---

## Process

### Step 1: Gather context (use AskUserQuestion)

Ask the user three things in one round:

1. **Project name** — what is this factory company building? (e.g. "XLSMART Package Advisor", "Santoso Protocol")
2. **Project path** — absolute path to the project directory on the server (will be set as `cwd` for each agent, e.g. `/home/santoso/gunawan-agents/my-project`)
3. **Output directory** — where to write the company package (default: `companies/<project-slug>/`)

Do not ask about agents, skills, workflow, or company structure — those are pre-defined.

### Step 2: Read the template

Read [references/shannon-company.md](references/shannon-company.md). This is the canonical package template. Generate all files from it, substituting:

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
