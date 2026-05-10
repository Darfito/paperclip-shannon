---
name: foundation--sprint-plan
description: >
  Read urs/index.json, compute complexity points per FR using a deterministic formula,
  cluster FRs by section/persona, pack clusters into sprints, and emit a sprint timeline.
  Sprint 0 is always a walking skeleton seeded with auth/registration FRs first.
  Outputs urs/clusters.json and urs/sprint-plan.md. PM runs this after foundation--urs.
---

# foundation--sprint-plan

Generate a sprint plan from the compiled URS. Deterministic output — same input always produces the same sprint assignments.

**Preconditions:**
- `urs/index.json` must exist (run `foundation--urs` first)
- `urs/applies-to.json` must exist

---

## Step 1 — Read inputs

Read:
- `urs/index.json` — full requirements list
- `urs/applies-to.json` — cross-cutting constraint map

Extract only FRs (where `class == "FR"`) from `requirements`. NFRs/URs/VRs are constraints, not sprint work items.

---

## Step 2 — Compute complexity points per FR

For each FR, compute:

```
points = (tables_touched × 2)
       + min(applies_to_count, 10)   ← wildcard NFRs excluded from this count
       + risk_zone_points             ← Z1 (risk_zone=1) → 3 pts, Z2 → 2 pts, Z3 → 1 pt
       + dep_count                    ← count of other FR IDs mentioned in this FR's text
```

**tables_touched**: estimate by scanning the FR text for data-model keywords — each distinct noun that implies a DB table (e.g., "user", "session", "record", "submission", "report") counts as 1 table. Minimum 1.

**applies_to_count**: count how many NFR/UR/VR entries in `applies-to.json` have this FR's ID in their `applies_to` list (exclude wildcards from this count). Cap at 10.

**risk_zone_points**: `risk_zone == 1` → 3 pts, `risk_zone == 2` → 2 pts, `risk_zone == 3` → 1 pt.

**dep_count**: count other FR IDs (pattern `FR-\d+`) mentioned in the FR's `text` field.

---

## Step 3 — Auto-shrink sprint budget if needed

Default sprint budget: **13 points**.

Total complexity = sum of all FR points.

If `total_complexity < 2 × 13` (i.e., < 26 points): auto-shrink budget to `ceil(total_complexity / 2)`.

---

## Step 4 — Cluster FRs by theme

Group FRs into thematic clusters based on keyword similarity in their `title` and `text`. Suggested clustering rules:
- Auth / identity cluster: FRs whose text contains "login", "register", "auth", "password", "session", "account"
- Data management cluster: FRs whose text contains "create", "edit", "delete", "update", "manage", "CRUD"
- Reporting cluster: FRs whose text contains "report", "export", "summary", "dashboard", "chart"
- Integration cluster: FRs whose text contains "API", "webhook", "sync", "import", "export"
- Everything else: "General" cluster

Each FR belongs to exactly one cluster (use the first matching cluster in the order above).

---

## Step 5 — Sprint 0 selection (deterministic)

Sprint 0 is the walking skeleton. Select its seed FR using this priority order:

1. First FR whose text contains "auth", "login", or "register" (case-insensitive)
2. First FR whose text contains "case", "submission", "application", "record"
3. Fallback: first Zone-1 (risk_zone=1, i.e., rank C) FR alphabetically by ID

Sprint 0 content = the seed FR + any additional FRs from the same cluster that fit within the sprint budget (seed FR's points already counted).

If the seed FR alone exceeds the budget, Sprint 0 = just the seed FR (oversized sprint is allowed only for the seed).

---

## Step 6 — Bin-pack remaining FRs into sprints

After Sprint 0, process remaining FRs cluster-by-cluster. Within each cluster, sort by ID (FR-01, FR-02, ...) to keep order deterministic.

**Bin-packing algorithm (operate on FRs, not clusters):**
1. Start a new sprint (current_points = 0)
2. For each FR (in cluster order, then by ID):
   a. If current_points + fr.points <= budget: add FR to current sprint
   b. Else: close current sprint, start Sprint N+1, add FR to new sprint
3. A cluster may span multiple sprints — no "keep cluster together" rule

---

## Step 7 — Write urs/clusters.json

```json
{
  "clusters": [
    {
      "name": "Auth / Identity",
      "fr_ids": ["FR-01", "FR-02"]
    },
    {
      "name": "Data Management",
      "fr_ids": ["FR-03", "FR-04", "FR-05"]
    }
  ]
}
```

---

## Step 8 — Write urs/sprint-plan.md

```markdown
# Sprint Plan

Generated: {today's date}
Total FRs: {n}  |  Total points: {total}  |  Sprint budget: {budget}  |  Sprints: {count}

---

## Sprint 0 — Walking Skeleton

| FR | Title | Points | Zone |
|---|---|---|---|
| FR-01 | {title} | {points} | Z{risk_zone} |

---

## Sprint 1

| FR | Title | Points | Zone |
|---|---|---|---|
| FR-03 | {title} | {points} | Z{risk_zone} |
| FR-04 | {title} | {points} | Z{risk_zone} |

---

## Sprint 2

...
```

---

## Step 9 — Post summary comment

Post a comment on the issue:

```
Sprint plan generated.

Summary:
- Total FRs: {n} across {sprint_count} sprints
- Sprint budget: {budget} points ({"auto-shrunk from 13" if shrunk, else "default"})
- Sprint 0 (Walking Skeleton): {fr_ids joined by ", "} — {total_s0_points} pts

Sprint 0 FRs will be created as Paperclip issues next.
Run urs--create-issues to create Sprint 0 tickets.
```
