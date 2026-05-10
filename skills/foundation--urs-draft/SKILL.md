---
name: foundation--urs-draft
description: >
  Author a structured User Requirements Specification (URS) from a rough product
  brief or prose requirements. CEO runs this when the kickoff issue does not yet
  contain a structured URS. Reads the issue description, writes urs/main.md using
  the ADR 0002 format (front-matter + Functional Requirements table + NFR/UR/VR tables),
  and posts a summary comment. Skip this skill if the issue already contains a
  structured URS (detected by FR table headers).
---

# foundation--urs-draft

Structure raw product requirements into a formal `urs/main.md`. This is the CEO's first action on a URS-first kickoff issue when the description is prose rather than structured tables.

**When to skip:** If the issue description already contains an FR table (look for columns: URS ID | Type | Requirement | Rank), copy the content directly to `urs/main.md` and skip to posting the handoff comment.

**Preconditions:**
- You are the CEO, assigned to a kickoff issue
- The issue description contains a product brief, feature idea, or unstructured requirements

---

## Step 1 — Read the issue

Read the full issue description via `GET /api/issues/{PAPERCLIP_TASK_ID}`.

Check for structured URS markers:
- Front-matter block (`---`) at the top with `project`, `version`, `status` fields
- At minimum one table with columns containing "URS ID", "Type", "Requirement", "Rank"

If both markers are present: copy the description to `urs/main.md` and jump to Step 5.

---

## Step 2 — Read project context

Read `.claude/docs/foundation/product-mission.md` if it exists (may be empty on first run).
Read `.claude/project-config.json` if it exists.

Use these to fill in the project metadata and enrich the requirements.

---

## Step 3 — Author the URS

Write `urs/main.md` using this exact structure (ADR 0002 format):

```markdown
---
project: "{project name}"
code: "{3-5 letter code, uppercase}"
version: "0.1"
status: draft
date: "{today's date}"
---

# {Project Name} — User Requirements Specification

## 1. Purpose and Scope

{One paragraph describing what this project builds, who it serves, and what it explicitly excludes.}

## 2. Roles and Personas

| Role | Description |
|---|---|
| {role name} | {what they do and why they use the system} |

## 3. Functional Requirements

| URS ID | Type | Requirement | Rank |
|---|---|---|---|
| FR-01 | Functional | {requirement text — one sentence, verb-first, testable} | C |
| FR-02 | Functional | {requirement} | C |
| ... | | | |

**Rank key:** C = Core (must-have), I = Important (should-have), D = Desirable (nice-to-have)

## 4. Non-Functional Requirements

| URS ID | Type | Requirement | Applies To |
|---|---|---|---|
| NFR-01 | Performance | {response time / load constraint} | * |
| NFR-02 | Security | {security requirement} | FR-01, FR-02 |

## 5. Glossary

| Term | Definition |
|---|---|
| {term} | {definition} |
```

Rules for Functional Requirements:
- Each FR must be testable and verb-first ("Users can…", "The system shall…", "Admins may…")
- IDs must be unique and sequential (FR-01, FR-02, ...)
- Rank C = core, I = important, D = desirable
- Start with auth/login FRs if the product requires user identity
- Derive FRs from the use cases in the brief — do not add FRs not implied by the brief

---

## Step 4 — Validate the draft

Before writing, check:
- At least 3 FRs exist
- All FR IDs are unique
- Every FR has a Rank (C/I/D)
- At least one NFR exists

---

## Step 5 — Write urs/main.md

Create directory `urs/` if it does not exist, then write `urs/main.md`.

---

## Step 6 — Post handoff comment

Post a comment on the issue:

```
URS draft written to urs/main.md.

Sections created: Purpose, Roles, Functional Requirements ({N} FRs: {C_count} Core, {I_count} Important, {D_count} Desirable), NFRs ({nfr_count}), Glossary.

@PM: Run foundation--urs to compile urs/main.md → index.json, then foundation--sprint-plan, then urs--create-issues.
```

Post using `POST /api/issues/{PAPERCLIP_TASK_ID}/comments` with your agent auth header.

---

## Step 7 — Frame [TASK] for PM

After the handoff comment, post your `[TASK]` comment to trigger the debate router:

```
[TASK: URS-first kickoff — compile and plan Sprint 0]
URS draft is in urs/main.md. PM should:
1. Run foundation--urs to compile the URS
2. Run foundation--sprint-plan to generate sprint-plan.md
3. Run urs--create-issues to create Sprint 0 FR issues in Paperclip

[NEEDS_DESIGN: no]
```

The debate router will reassign the issue to PM automatically after you post `[TASK]`.
