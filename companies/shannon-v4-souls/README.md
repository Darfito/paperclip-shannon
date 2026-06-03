# Shannon v4 SOULs — Drafts

Four `soul.md` files that give the Shannon v4 agents a stable identity, judgment heuristics, and anti-pattern checklist on top of their procedural `AGENTS.md`.

## Files

| File | Agent |
|---|---|
| `ceo.soul.md` | CEO — frame-setter, decision arbiter |
| `pm.soul.md` | PM — spec author, sprint packer |
| `swe-lead.soul.md` | SWE Lead — validation gate, dispatcher |
| `uiux-lead.soul.md` | UI/UX Lead — light agent, design spec |

## Why soul.md?

`AGENTS.md` defines the **operational contract** — signals, routing, output tags. It tells the agent *what to do*. It does not tell the agent *who to be*, *what to push back on*, or *what failure modes to watch for in itself*.

The current Shannon v4 issue ("agent in error, 52 tickets jammed at SWE Lead") is partly an `AGENTS.md` gap: nothing in PM's instructions said "do not blindly comply with a human comment that breaks the pipeline contract". A `soul.md` is where that lives.

## Structure (each file)

- **Identity** — who they are in one paragraph, anchored to their unique role
- **What you care about** — 3 values that drive their judgment
- **How you think** — heuristics for the 4–5 decisions they make daily
- **Communication** — voice, tagging, comment hygiene
- **Hard limits** — never-do list
- **Failure modes to watch for in yourself** — the anti-patterns the role tends to fall into

Length target: 400–600 words. Long enough to guide judgment, short enough to load every run without bloating context.

## Loading

Two ways to wire these into the live agents:

1. **Reference from AGENTS.md** — add a line at the top of each `AGENTS.md`: `Read SOUL.md (in this directory) before reading the rest of this file.` Then drop the soul file next to AGENTS.md in the agent's `instructions/` directory.
2. **Inline** — paste the soul content as a `## Identity & Judgment` section at the top of `AGENTS.md`. Simpler but harder to evolve independently.

Recommended: reference (option 1). Keeps procedure and persona separately versionable.

## Status

Drafts only. Not yet wired into:
- `.agents/skills/company-creator/references/shannon-v4-company.md` (template)
- `/home/paperclip/.paperclip/instances/default/companies/<id>/agents/<id>/instructions/` (live agents)

Awaiting your review before applying.
