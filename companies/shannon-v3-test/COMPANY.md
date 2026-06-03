---
name: Shannon V3 Test Factory (v3 Roundtable)
description: >
  Four-agent roundtable factory that takes feature ideas for Shannon V3 Test
  and ships them as tested software. Spec stage uses debate-driven validation
  (CEO → PM ↔ SWE Lead, optional UI/UX) before advancing to design / implementation.
slug: shannon-v3-test
schema: agentcompanies/v1
version: 0.3.0
license: MIT
goals:
  - Accept feature ideas and ship them as working software
  - Validate PM briefs against technical constraints via SWE Lead before execution
  - Track progress via Paperclip pipeline_stage field
  - Dispatch workers for high-volume coding, design, and test tasks
---

Shannon V3 Test Factory (v3 Roundtable) is a four-agent debate pipeline. The CEO frames a `[TASK]`, the PM produces a versioned `[PM BRIEF v<n>]`, the SWE Lead validates with `[CONFIRMED]` or `[CONCERNS]`, an optional UI/UX round produces `[UI/UX SPEC]`, and the SWE Lead emits a final `[LGTM]` to advance the pipeline. Worker dispatch happens after `[LGTM]` exactly as in v2.
