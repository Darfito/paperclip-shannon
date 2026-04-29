---
name: design--import
description: >
  Import a design into the factory. Accepts three sources: a Figma frame
  (via Figma MCP), an image mockup file, or a manual description from the
  issue context. Extracts layout, components, states, and design tokens.
  Writes .claude/docs/design-os/screens/{feature-name}.md and optionally
  updates design-system.md if new tokens are found.
---

# design--import

Import a design and generate a screen spec. The screen spec becomes the source of truth for what a feature should look like — read by `implementation--new-feature` and by workers when building UI components.

**Preconditions:**
- `.claude/project-config.json` must exist

---

## Step 1 — Identify source

Check the current issue for:
- A Figma link → use Figma MCP to read the frame
- A path to an image file in `docs/designs/` → read the image
- Neither → derive the design from the issue description and any attached context

**If Figma link:**
- Use Figma MCP to extract: layout structure, component names, color values, spacing, typography
- Proceed to Step 3

**If image file:**
- Read the image
- Extract: layout structure, visible UI elements, apparent component types
- Note what cannot be determined from the image (exact spacing, colors)
- Proceed to Step 3

**If no design assets:**
- Proceed to Step 2 (derive from issue context)

---

## Step 2 — Derive design from issue context

Read the issue description and any comments for UI requirements:
- Page/screen name and route
- Main layout structure
- Interactive elements (buttons, forms, modals)
- Screen states (loading, empty, error, success)
- Data displayed and its source

If the issue does not contain enough detail, post a clarifying comment listing the missing information and wait for a reply.

---

## Step 3 — Extract design system tokens

If the source contains color, typography, or spacing information:
- Map colors to CSS custom property names following `.claude/docs/design-os/design-system.md`
- Identify font choices and sizes
- Note any Shadcn component variants that appear

If new tokens are found that are not yet in `design-system.md`, add them. Do not overwrite existing decisions.

---

## Step 4 — Generate screen spec

Read `.claude/docs/design-os/screens/_template.md`. Generate a screen spec for this feature:
- Layout description (ASCII sketch or prose)
- Shadcn components for each UI element
- All states (loading, empty, error, success)
- Interactions
- Data requirements

---

## Step 5 — Write files and post comment

Write `.claude/docs/design-os/screens/{feature-name}.md`.

If `design-system.md` was updated, write it too.

Post a comment on the issue:

> "Screen spec written to `.claude/docs/design-os/screens/{feature-name}.md`.
>
> Next step:
> - If this is the first design import: run `design--system` to document full design tokens
> - Otherwise: run `foundation--shape-spec` to spec the feature using this design"
