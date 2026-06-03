---
name: Shannon Software Factory 5
description: >
  Four-agent factory that takes a URS document or product brief and ships it as
  tested software. CEO structures the URS, PM compiles it and creates Sprint 0
  FR tickets automatically, then each FR goes through the v3 roundtable debate
  (CEO → PM ↔ SWE Lead, optional UI/UX) before implementation. Identical to
  Shannon Software Factory 4 — re-bundled as a fresh import for a clean issue
  and project list.
slug: shannon-software-factory-5
schema: agentcompanies/v1
version: 0.5.0
license: MIT
goals:
  - Accept a URS or product brief and auto-create FR tickets for Sprint 0
  - Validate PM briefs against technical constraints via SWE Lead before execution
  - Track progress via Paperclip pipeline_stage field
  - Dispatch workers for high-volume coding, design, and test tasks
---

Shannon Software Factory 5 starts from a published URS. CEO structures the URS (or skips if pre-structured), posts `[TASK]` for PM, and the debate router hands off automatically. PM compiles the URS, generates a sprint plan, and creates Sprint 0 FR issues in Paperclip — one per functional requirement. Each FR issue then goes through the roundtable spec flow (PM brief ↔ SWE Lead validation) and full implementation pipeline.

This package is a 1:1 re-bundle of the live Shannon Software Factory 4 (company `6110089e…`) as of 2026-05-12 — including the PM Oversight (recurring) section on CEO and the SOUL.md identity files for all four agents. The only differences from v4 are the company name, slug, and version. Re-import to start with a clean issues/projects list.
