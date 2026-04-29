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

## Step 6 — Start local Supabase

Set up and start the local Supabase stack via Docker. This gives the project a real local database with a real API URL and anon key — no Supabase cloud account needed.

**6a — Verify Docker is available**

```bash
docker ps
```

If this fails with a permission error, stop and post a comment on the issue:
> "⚠️ Docker is not accessible. Ask the server operator to run: `sudo usermod -aG docker paperclip` then restart the server. Cannot start local Supabase without Docker."

Do not continue past this point until Docker is accessible.

**6b — Install Supabase CLI**

```bash
npx supabase --version 2>/dev/null || npm install supabase --save-dev
```

**6c — Initialize Supabase if not already done**

Check if `supabase/config.toml` exists. If not:

```bash
npx supabase init
```

**6d — Start the local stack**

```bash
npx supabase start
```

This pulls Docker images on first run (may take a few minutes). Wait for it to complete. It outputs the local API URL, anon key, and service role key.

**6e — Write real credentials to `.env.local`**

Parse the output of `npx supabase status` and write to `.env.local`:

```bash
npx supabase status
```

Extract:
- `API URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to client)

Write `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<real anon key from status output>
SUPABASE_SERVICE_ROLE_KEY=<real service role key from status output>
```

Never use placeholder values. If `supabase start` failed, do not write the file — post the blocker comment instead.

---

## Step 7 — Post completion comment

After writing all files, post a comment on the issue:

> "Foundation documented. Local Supabase running at http://127.0.0.1:54321. Files updated: [list]. Next step: run `foundation--plan` to plan features and create the backlog."
