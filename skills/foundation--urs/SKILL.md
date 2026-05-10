---
name: foundation--urs
description: >
  Compile urs/main.md into machine-readable URS artifacts consumed by all downstream
  skills. Outputs urs/index.json (full FR/NFR/UR/VR list with risk zones), urs/applies-to.json
  (cross-cutting constraint map), and urs/main.tex (LaTeX formal artifact). Also updates
  .claude/docs/project-state.md with a backlog row per FR. PM runs this after CEO posts [TASK]
  on a URS-first kickoff issue.
---

# foundation--urs

Compile `urs/main.md` into the machine-readable artifacts that `foundation--sprint-plan`, `foundation--shape-spec --from-urs`, and `urs--create-issues` depend on.

**Preconditions:**
- `urs/main.md` must exist and contain at least one FR table row
- You are the PM, assigned to a URS-first kickoff issue

---

## Step 1 — Read urs/main.md

Read the full `urs/main.md`. Parse:

**Project metadata** (from YAML front-matter):
- `project`, `code`, `version`, `status`, `date`

**Functional Requirements** (from the FR table — columns: URS ID | Type | Requirement | Rank):
- Extract every row; skip the header row and any separator row
- For each FR row: `id`, `type` (always "Functional"), `rank` (C/I/D), `title` (first 8 words of Requirement column), `text` (full Requirement text)

**Non-Functional Requirements** (from NFR/UR/VR tables — any table with a Type column containing "Non-Functional", "User Requirement", or "Verification"):
- Extract rows similarly: `id`, `type`, `title`, `text`, `applies_to` (parse comma-separated IDs from Applies To column; if value is `*` or empty, use `["*"]`)

**Glossary:** extract term-definition pairs.

---

## Step 2 — Compute risk zones

For each FR, assign a risk zone based on Rank:
- Rank `C` → `risk_zone: 1` (highest risk if missing — core)
- Rank `I` → `risk_zone: 2`
- Rank `D` → `risk_zone: 3` (lowest risk)

For each NFR/UR/VR, compute `tables_touched` by scanning the FR table for column keywords matching the NFR text (e.g., "auth", "user", "session"). Use 1 as default if uncertain.

---

## Step 3 — Validate

Enforce these invariants before writing:

- All `id` values are unique across the entire document (FR-01, NFR-01, etc. can share prefix but full IDs must differ)
- Every FR has `id`, `rank`, `title`, `text`
- Every rank is one of `C`, `I`, `D`

Warn (do not abort) if:
- Any NFR/UR/VR has `applies_to: ["*"]` — wildcard means no specific FRs were mentioned
- Fewer than 3 FRs found — unusually small URS

---

## Step 4 — Write urs/index.json

```json
{
  "project": {
    "name": "{project name}",
    "code": "{code}",
    "version": "{version}",
    "status": "{status}"
  },
  "requirements": [
    {
      "id": "FR-01",
      "class": "FR",
      "type": "Functional",
      "rank": "C",
      "title": "{first-8-words title}",
      "text": "{full requirement text}",
      "section_anchor": "functional-requirements",
      "risk_zone": 1
    }
  ],
  "user_matrix": [
    { "role": "{role name}", "description": "{role description}" }
  ],
  "roles": ["{role name}"],
  "glossary": [
    { "term": "{term}", "definition": "{definition}" }
  ]
}
```

Include ALL requirements (FRs + NFRs + URs + VRs) in the `requirements` array, with the correct `class` field (`"FR"`, `"NFR"`, `"UR"`, `"VR"`).

---

## Step 5 — Write urs/applies-to.json

This maps each NFR/UR/VR to the FRs it applies to:

```json
{
  "NFR-01": {
    "type": "NFR",
    "title": "{title}",
    "applies_to": ["FR-01", "FR-03"],
    "is_wildcard": false
  },
  "NFR-02": {
    "type": "NFR",
    "title": "{title}",
    "applies_to": ["*"],
    "is_wildcard": true
  }
}
```

For wildcard entries (`applies_to: ["*"]`), set `is_wildcard: true`.

---

## Step 6 — Write urs/main.tex

Emit a LaTeX document wrapping the URS content. Use this template:

```latex
\documentclass[12pt,a4paper]{article}
\usepackage{longtable,booktabs,hyperref}
\title{{Project Name} — User Requirements Specification v{version}}
\date{{date}}
\begin{document}
\maketitle
\section{Functional Requirements}
\begin{longtable}{llp{9cm}l}
\toprule
URS ID & Type & Requirement & Rank \\
\midrule
{one row per FR: FR-01 & Functional & {text} & C \\}
\bottomrule
\end{longtable}
\section{Non-Functional Requirements}
\begin{longtable}{llp{8cm}l}
\toprule
URS ID & Type & Requirement & Applies To \\
\midrule
{one row per NFR}
\bottomrule
\end{longtable}
\end{document}
```

Escape special LaTeX characters in requirement text: `&` → `\&`, `%` → `\%`, `_` → `\_`, `#` → `\#`.

---

## Step 7 — Update .claude/docs/project-state.md

Read `.claude/docs/project-state.md`. If it does not exist, create it:

```markdown
# Project State

Last updated: {today's date} — initialized by foundation--urs

## URS Backlog

| FR ID | URS Ref | Risk Zone | Maturity | Last Updated |
|---|---|---|---|---|
| FR-01 | {section_anchor}#{fr-01} | Z1 | spec | {today} |
```

For each FR in `urs/index.json`, add or update a row. **Do not duplicate requirement text** — use IDs and links only.

If a `## Backlog` section already exists (from `foundation--plan`), add a new `## URS Backlog` section below it.

---

## Step 8 — Post summary comment

Post a comment on the issue:

```
URS compiled from urs/main.md.

Outputs written:
- urs/index.json — {total_fr_count} FRs ({c_count} Core, {i_count} Important, {d_count} Desirable)
- urs/applies-to.json — {nfr_count} cross-cutting constraints ({wildcard_count} wildcards)
- urs/main.tex — LaTeX artifact
- .claude/docs/project-state.md — URS backlog updated

{warnings if any: "⚠️ NFR-02 uses wildcard applies_to — no specific FRs mentioned"}

Next: run foundation--sprint-plan to generate sprint-plan.md.
```
