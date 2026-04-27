---
name: foundation--discover
description: >
  Document the project's product context by completing foundation docs. Run
  after foundation:init to fill in product-mission.md, tech-standards.md,
  auth-model.md, and design-os/product-vision.md. If product context is
  already in the issue description, derive it from there. If key information
  is missing, post a clarifying comment on the issue and wait for a reply.
  Output: completed product-mission.md + updated foundation docs.
---

# foundation--discover

Document the project's product context through structured discovery. Completes the foundation docs that init created as stubs.

**Preconditions:**
- `.claude/project-config.json` must exist (run `/foundation:init` first)
- `product-mission.md` stub exists with architectural choices filled in

---

## Step 1 — Read config and existing docs

Read `.claude/project-config.json` and `.claude/docs/foundation/product-mission.md`.

Note the project name, multi-tenant setting, auth model, and regulated status. Do NOT ask the user about these — they are already decided.

Also read:
- `.claude/docs/foundation/principles.md`
- `.claude/docs/foundation/tech-standards.md`
- `.claude/docs/foundation/compliance-standards.md`

---

## Step 2 — Derive product context from issue

Read the issue title, description, and any existing comments to infer:

- What the project does (one sentence)
- Who the primary users are
- The 3–5 key use cases
- What is explicitly out of scope
- External integrations (Stripe, SendGrid, Slack, etc.)
- Target environments (AKS / OCP / vanilla Kubernetes)

If any of these cannot be determined from available context, post a single clarifying comment on the issue listing all missing items, and wait for the board operator to reply before continuing.

---

## Step 3 — Check for standards deviations

Compare the project context against the baseline standards docs read in Step 1.

Note any standards that clearly do not apply to this project (e.g. multi-tenancy standards for a single-tenant project). Record deviations with justification in `tech-standards.md`.

---

## Step 4 — Check for design assets

Check if any design assets are referenced in the issue or in `docs/designs/`:
- Figma link → note for `design--import` to process
- Image mockup → note the path for `design--import`
- Neither → note that UI will be spec'd from scratch

---

## Step 5 — Write foundation docs

Complete all sections still marked "_To be completed_":

**`.claude/docs/foundation/product-mission.md`**
- One-line description, status → "Active development"
- Primary and secondary users
- Problem statement
- Key use cases (3–5 concrete actions)
- Out of scope
- Integrations

**`.claude/docs/foundation/tech-standards.md`**
- Confirm auth decision path for this project
- Record any deviations from defaults (with justification)

**`.claude/docs/foundation/auth-model.md`**
- Confirm the auth path for this specific project

**`.claude/docs/design-os/product-vision.md`**
- Product summary
- User personas
- Core user journeys
- Feature areas (map to `src/features/` domains)

**`.claude/project-config.json`**
- Set `status` to `"active"`

Do not overwrite the **Name** or **Technical Context** fields already set by init.

---

## Step 6 — Post completion comment

After writing all files, post a comment on the issue:

> "Foundation documented. Files updated: [list]. Next step: run `foundation--plan` to plan features and create the backlog."
