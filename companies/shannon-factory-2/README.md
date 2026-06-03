# Shannon Factory 2

Four-agent AI Software Factory pipeline. Takes feature ideas and ships them as tested Next.js applications via structured pipeline stages.

## Pipeline stages

| Stage | Agent | What happens |
|---|---|---|
| `spec` | PM | Foundation setup (first time) + feature spec |
| `design` | UI/UX Lead | Design spec — components, layout, tokens |
| `implementation` | SWE Lead | Worker dispatch — code, design, tests |
| `sandboxed` | SWE Lead | Sandbox up → test → human checkpoint |
| `tested` | Board | Human review |
| `shipped` | — | Done |

## Org chart

- **CEO** — receives feature ideas, creates brief, hands to PM
  - **PM** — foundation setup (first use) + spec shaping
    - **UI/UX Lead** — design spec
      - **SWE Lead** — implementation, workers, sandbox, checkpoint

## Skills

| Agent | Skills |
|---|---|
| CEO | paperclip |
| PM | paperclip, foundation--inject-standards, foundation--discover, foundation--plan, foundation--shape-spec, foundation--validate, foundation--status |
| UI/UX Lead | paperclip, foundation--inject-standards, design--import, design--system |
| SWE Lead | paperclip, foundation--inject-standards, architecture--new-feature, architecture--review, implementation--new-feature, implementation--review, data-fetching--review, worker--dispatch, sandbox--up, sandbox--down, sandbox--test, sandbox--status |

## Import

```bash
pnpm paperclipai company import companies/shannon-factory-2/
```

After import, grant your user access at:
`http://<your-vps>:3100/instance/settings/access`
