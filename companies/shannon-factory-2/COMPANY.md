---
name: Shannon Factory 2
description: >
  Four-agent pipeline factory that takes feature ideas and ships them as
  tested software via pipeline stages with worker dispatch and human review
  checkpoints.
slug: shannon-factory-2
schema: agentcompanies/v1
version: 0.1.0
license: MIT
goals:
  - Accept feature ideas and ship them as working software
  - Track progress via Paperclip pipeline_stage field
  - Dispatch workers for high-volume coding, design, and test tasks
---

Shannon Factory 2 is a four-agent orchestrator pipeline. The CEO receives feature ideas, the PM shapes the spec (running project foundation setup on first use), the UI/UX Lead produces the design spec, and the SWE Lead dispatches workers and gates shipment behind a human checkpoint.
