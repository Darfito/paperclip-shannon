---
name: design--system
description: >
  Document or update the design system for this project. Sets the visual
  language — colors, typography, spacing, Shadcn component decisions — that
  all feature implementations will follow. Can derive tokens from an existing
  Figma file, from globals.css / tailwind.config.ts, or from design context
  in the issue. Writes .claude/docs/design-os/design-system.md.
---

# design--system

Document the project's design system. Run once per project early on; re-run when the design system is updated.

**Preconditions:**
- `.claude/project-config.json` must exist

Read before starting:
- `.claude/project-config.json` — project context
- `.claude/docs/design-os/design-system.md` — existing decisions (if any)
- `.claude/docs/foundation/tech-standards.md` — confirms Tailwind 4 + Shadcn

---

## Step 1 — Identify source

Check in this order:
1. **Figma link in issue** → use Figma MCP to extract color styles, text styles, and component variants
2. **Existing implementation** → scan `globals.css` and `tailwind.config.ts` for token definitions
3. **Issue description** → derive tokens from any design context provided

If a `design-system.md` already exists with content, treat it as the baseline and only add or update entries, never overwrite existing decisions.

---

## Step 2 — Colors

Document the color palette:
- Primary action color (buttons, links, focus rings)
- Secondary / neutral color
- Accent color (if any)
- Destructive (red / danger)
- Background and foreground
- Muted (secondary text, placeholders)
- Border color

Map each to HSL values for Tailwind CSS custom properties.

---

## Step 3 — Typography

Document:
- Font family (Google Font, system font, or custom)
- Scale: heading sizes (h1–h4), body size, caption size

---

## Step 4 — Shadcn component decisions

For each commonly used Shadcn component, document the project's variant choices and any composition patterns to standardise:

Focus on: Button, Card, Table, Dialog, Form, Badge, Sheet, Tabs.

---

## Step 5 — Write and post comment

Write the complete `.claude/docs/design-os/design-system.md`.

Post a comment on the issue:

> "Design system documented at `.claude/docs/design-os/design-system.md`. Next step: run `foundation--shape-spec` to spec the first (or next) feature."
