---
name: urs--create-issues
description: >
  Read urs/sprint-plan.md and urs/index.json, then create one Paperclip issue per
  FR in Sprint 0 via the Paperclip API. Sets pipeline_stage=spec and assignee to
  the PM agent (yourself). Posts a summary comment on the kickoff issue and marks it
  shipped. Shannon-specific — no ai-software-factory equivalent. PM runs this after
  foundation--sprint-plan.
---

# urs--create-issues

Create one Paperclip issue per Sprint 0 FR and hand each off to PM (yourself) for spec work. This is the bridge between the URS world and the Paperclip ticket world.

**Preconditions:**
- `urs/sprint-plan.md` must exist (run `foundation--sprint-plan` first)
- `urs/index.json` must exist
- Env vars available: `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_AGENT_ID`, `PAPERCLIP_TASK_ID`, `PAPERCLIP_RUN_ID`

---

## Step 1 — Read Sprint 0 FR list

Read `urs/sprint-plan.md`. Find the `## Sprint 0` section. Extract all FR IDs listed (pattern: `| FR-\d+ |`).

---

## Step 2 — Read FR details from index

Read `urs/index.json`. For each Sprint 0 FR ID, extract:
- `id` — e.g., "FR-01"
- `title` — short title
- `text` — full requirement text

---

## Step 3 — Create one issue per FR

For each Sprint 0 FR, call:

```
POST {PAPERCLIP_API_URL}/api/companies/{PAPERCLIP_COMPANY_ID}/issues
Authorization: Bearer {PAPERCLIP_API_KEY}
X-Paperclip-Run-Id: {PAPERCLIP_RUN_ID}
Content-Type: application/json

{
  "title": "{id} — {title}",
  "description": "{text}\n\n---\n@spec: {id}\nRun: foundation--shape-spec --from-urs {id}",
  "pipelineStage": "spec",
  "assigneeAgentId": "{PAPERCLIP_AGENT_ID}"
}
```

**Error handling:**
- If the API call fails (non-2xx): log the error and the FR ID, continue with remaining FRs
- Do NOT abort on first failure — create as many issues as possible and report all failures at the end

**Track results:**
- `created`: list of `{ fr_id, issue_id, issue_title }` for successful creations
- `failed`: list of `{ fr_id, error }` for failures

---

## Step 4 — Mark kickoff issue shipped

Update the kickoff issue pipeline stage:

```
PATCH {PAPERCLIP_API_URL}/api/issues/{PAPERCLIP_TASK_ID}
Authorization: Bearer {PAPERCLIP_API_KEY}
X-Paperclip-Run-Id: {PAPERCLIP_RUN_ID}
Content-Type: application/json

{
  "pipelineStage": "shipped"
}
```

---

## Step 5 — Post summary comment on kickoff issue

Post a comment on `PAPERCLIP_TASK_ID`:

```
Sprint 0 tickets created.

Created ({n}/{total} Sprint 0 FRs):
- FR-01 — {title}: issue #{identifier}
- FR-02 — {title}: issue #{identifier}
...

{If any failures:}
⚠️ Failed to create issues for: FR-03, FR-04 — see logs above.

Each issue is assigned to PM with pipeline_stage=spec.
The debate router (Step 13 auto-wakeup) will trigger spec work on each issue automatically.
Kickoff issue marked shipped.
```

Use `POST {PAPERCLIP_API_URL}/api/issues/{PAPERCLIP_TASK_ID}/comments` for the comment.

---

## Notes

- The `description` field includes `@spec: FR-XX` for URS traceability and `Run: foundation--shape-spec --from-urs FR-XX` so PM knows exactly what to do when the issue wakes up.
- Because `assigneeAgentId` is set to the PM's own agent ID and `pipelineStage` is `spec`, the debate router's auto-wakeup (Step 13) will fire immediately for each new issue — the PM agent will receive a `[System — Pipeline]` comment and wake up to run `foundation--shape-spec --from-urs FR-XX`.
- If `PAPERCLIP_API_URL` is not available, check for `PAPERCLIP_BASE_URL` as a fallback, then `http://localhost:3100` as a last resort.
