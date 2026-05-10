import type { PipelineStage } from "@paperclipai/shared";

// Roundtable Debate Flow (MAD Asimetris) — Step 12 of Paperclip Shannon Phase 2.
//
// Storage decision (12.1): Discussion Board lives as the comment thread itself.
// No new column. Routing scans comments for tagged signals.

export type DebateSignalTag =
  | "TASK"
  | "NEEDS_DESIGN"
  | "PM_BRIEF"
  | "CONFIRMED"
  | "CONCERNS"
  | "DECISION"
  | "UIUX_SPEC"
  | "LGTM";

export type DebateSignal = {
  tag: DebateSignalTag;
  version?: number;
  payload?: string;
  needsDesign?: boolean;
  enumeratedCount?: number;
};

const RE_TASK = /^\s*\[TASK(?::\s*([^\]]*))?\]\s*$/m;
const RE_NEEDS_DESIGN = /^\s*\[NEEDS_DESIGN:\s*(yes|no)\s*\]\s*$/im;
const RE_PM_BRIEF = /^\s*\[PM BRIEF v(\d+)\]\s*$/m;
const RE_CONFIRMED = /^\s*\[CONFIRMED\]\s*$/m;
const RE_CONCERNS = /^\s*\[CONCERNS\]\s*$/m;
const RE_DECISION = /^\s*\[DECISION(?::\s*([^\]]*))?\]\s*$/m;
const RE_UIUX_SPEC = /^\s*\[UI\/UX SPEC\]\s*$/m;
const RE_LGTM = /^\s*\[LGTM\]\s*$/m;

const RE_ENUMERATED = /^\s*\d+\.\s+\S/gm;

function countEnumeratedAfter(body: string, fromIndex: number): number {
  const after = body.slice(fromIndex);
  const matches = after.match(RE_ENUMERATED);
  return matches ? matches.length : 0;
}

export function parseDebateSignals(body: string): DebateSignal[] {
  if (typeof body !== "string" || body.length === 0) return [];
  const signals: DebateSignal[] = [];

  const taskMatch = RE_TASK.exec(body);
  if (taskMatch) {
    signals.push({ tag: "TASK", payload: taskMatch[1]?.trim() || undefined });
  }

  const ndMatch = RE_NEEDS_DESIGN.exec(body);
  if (ndMatch) {
    signals.push({ tag: "NEEDS_DESIGN", needsDesign: ndMatch[1]!.toLowerCase() === "yes" });
  }

  const pmMatch = RE_PM_BRIEF.exec(body);
  if (pmMatch) {
    signals.push({ tag: "PM_BRIEF", version: Number(pmMatch[1]) });
  }

  const confMatch = RE_CONFIRMED.exec(body);
  if (confMatch && confMatch.index !== undefined) {
    signals.push({
      tag: "CONFIRMED",
      enumeratedCount: countEnumeratedAfter(body, confMatch.index + confMatch[0].length),
    });
  }

  const concMatch = RE_CONCERNS.exec(body);
  if (concMatch && concMatch.index !== undefined) {
    signals.push({
      tag: "CONCERNS",
      enumeratedCount: countEnumeratedAfter(body, concMatch.index + concMatch[0].length),
    });
  }

  const decMatch = RE_DECISION.exec(body);
  if (decMatch) {
    signals.push({ tag: "DECISION", payload: decMatch[1]?.trim() || undefined });
  }

  if (RE_UIUX_SPEC.test(body)) {
    signals.push({ tag: "UIUX_SPEC" });
  }

  if (RE_LGTM.test(body)) {
    signals.push({ tag: "LGTM" });
  }

  return signals;
}

// Sycophancy guard: SWE Lead [CONFIRMED]/[CONCERNS] must enumerate ≥2 items.
// Returns null if valid, or an error string for HTTP 400.
export function validateSweConcerns(signals: DebateSignal[]): string | null {
  const sweSignal = signals.find((s) => s.tag === "CONFIRMED" || s.tag === "CONCERNS");
  if (!sweSignal) return null;
  if ((sweSignal.enumeratedCount ?? 0) < 2) {
    return `SWE Lead [${sweSignal.tag === "CONFIRMED" ? "CONFIRMED" : "CONCERNS"}] requires ≥2 enumerated lines (e.g. "1. ..." / "2. ...")`;
  }
  return null;
}

// Limit on the total number of debate round-trips before we force a human checkpoint.
export const MAX_DEBATE_ROUND_TRIPS = 5;
// Number of PM revisions allowed before escalation to CEO if SWE still has concerns.
export const MAX_PM_REVISIONS_BEFORE_CEO = 2;

export type DebateAgentRole = "ceo" | "pm" | "swe_lead" | "uiux";

export type DebateAgentRef = {
  id: string;
  name: string;
  role: string;
  title?: string | null;
  status: string;
};

function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Identify CEO/PM/SWE Lead/UI-UX from the company's agent roster using
// case-insensitive name matching that tolerates separators ("UI/UX Lead", "ui-ux", etc.).
// Falls back to `agent.role` if name match doesn't apply.
export function classifyDebateAgent(agent: DebateAgentRef): DebateAgentRole | null {
  if (agent.status === "terminated") return null;
  const n = normalize(agent.name);
  const r = normalize(agent.role);
  const t = normalize(agent.title);
  const all = `${n} ${r} ${t}`;

  if (n === "ceo" || /\bceo\b/.test(all) || all.includes("chiefexecutive")) return "ceo";
  if (n === "pm" || /\bpm\b/.test(all) || all.includes("productmanager")) return "pm";
  if (
    all.includes("swelead") ||
    all.includes("softwareengineeringlead") ||
    all.includes("engineeringlead")
  ) {
    return "swe_lead";
  }
  if (
    all.includes("uiux") ||
    all.includes("uxlead") ||
    all.includes("uilead") ||
    all.includes("designer")
  ) {
    return "uiux";
  }
  return null;
}

export function buildAgentRoleMap(
  agents: DebateAgentRef[],
): Record<DebateAgentRole, DebateAgentRef | null> {
  const map: Record<DebateAgentRole, DebateAgentRef | null> = {
    ceo: null,
    pm: null,
    swe_lead: null,
    uiux: null,
  };
  for (const agent of agents) {
    const role = classifyDebateAgent(agent);
    if (role && !map[role]) map[role] = agent;
  }
  return map;
}

export type CommentLike = {
  id: string;
  body: string;
  createdAt: Date | string;
  // Either of these field names is accepted (Paperclip's comment table uses authorAgentId).
  agentId?: string | null;
  authorAgentId?: string | null;
};

export type DebateState = {
  signals: Array<{ commentId: string; agentId: string | null; signal: DebateSignal }>;
  pmRevisionCount: number;
  needsDesign: boolean | null;
  hasUiUxSpec: boolean;
  hasLgtm: boolean;
  roundTripCount: number;
  latest: { commentId: string; agentId: string | null; signal: DebateSignal } | null;
};

const ROUND_TRIP_TAGS: ReadonlySet<DebateSignalTag> = new Set([
  "PM_BRIEF",
  "CONFIRMED",
  "CONCERNS",
  "LGTM",
]);

// Reconstructs the current Discussion Board state by scanning all comments
// in chronological order and parsing tagged signals.
export function deriveDebateState(commentsAsc: CommentLike[]): DebateState {
  const flat: DebateState["signals"] = [];
  let pmRevisionCount = 0;
  let needsDesign: boolean | null = null;
  let hasUiUxSpec = false;
  let hasLgtm = false;
  let roundTripCount = 0;

  for (const c of commentsAsc) {
    const sigs = parseDebateSignals(c.body);
    const agentId = c.authorAgentId ?? c.agentId ?? null;
    for (const s of sigs) {
      flat.push({ commentId: c.id, agentId, signal: s });
      if (s.tag === "PM_BRIEF" && typeof s.version === "number") {
        pmRevisionCount = Math.max(pmRevisionCount, s.version);
      }
      if (s.tag === "NEEDS_DESIGN" && typeof s.needsDesign === "boolean") {
        needsDesign = s.needsDesign;
      }
      if (s.tag === "UIUX_SPEC") hasUiUxSpec = true;
      if (s.tag === "LGTM") hasLgtm = true;
      if (ROUND_TRIP_TAGS.has(s.tag)) roundTripCount += 1;
    }
  }

  // Pick the "latest" routing-relevant signal (skip NEEDS_DESIGN — it is a meta flag).
  const latest = [...flat].reverse().find((entry) => entry.signal.tag !== "NEEDS_DESIGN") ?? null;

  return {
    signals: flat,
    pmRevisionCount,
    needsDesign,
    hasUiUxSpec,
    hasLgtm,
    roundTripCount,
    latest,
  };
}

export type DebateRouterDecision = {
  reassignAgentId?: string;
  advanceToStage?: PipelineStage;
  triggerHumanCheckpoint?: { reason: string; latestTag?: DebateSignalTag };
  reason: string;
  latestTag?: DebateSignalTag;
  // Shannon Step 13: system comment body to post as wakeup trigger for the newly assigned agent.
  // Undefined means no system comment (e.g. LGTM advance — SWE Lead stays on the issue).
  systemComment?: string;
};

// Routing logic. Given the current Discussion Board state plus the company's
// debate-relevant agents, decide what should happen next. Returns null if no
// action needed (e.g., no signals yet, or routing is already settled).
export function decideDebateAction(
  state: DebateState,
  roles: Record<DebateAgentRole, DebateAgentRef | null>,
  opts?: { maxRoundTrips?: number; maxPmRevisions?: number },
): DebateRouterDecision | null {
  const maxRoundTrips = opts?.maxRoundTrips ?? MAX_DEBATE_ROUND_TRIPS;
  const maxPmRevisions = opts?.maxPmRevisions ?? MAX_PM_REVISIONS_BEFORE_CEO;
  const latest = state.latest;
  if (!latest) return null;

  // Hard upper bound (12.7): force human checkpoint regardless of signal.
  if (state.roundTripCount >= maxRoundTrips && !state.hasLgtm) {
    return {
      triggerHumanCheckpoint: {
        reason: `debate_round_trip_cap_${maxRoundTrips}`,
        latestTag: latest.signal.tag,
      },
      reason: "round_trip_cap_reached",
      latestTag: latest.signal.tag,
    };
  }

  switch (latest.signal.tag) {
    case "TASK": {
      if (!roles.pm) return null;
      return {
        reassignAgentId: roles.pm.id,
        reason: "task_handoff_to_pm",
        latestTag: "TASK",
        systemComment:
          `[System — Pipeline]\n` +
          `CEO has framed this task. ${roles.pm.name}, you are now assigned.\n\n` +
          `Read the [TASK] above, then post [PM BRIEF v1] with:\n` +
          `  Stories, Scope (in/out), Dependencies, Estimate, Open questions for SWE.`,
      };
    }
    case "PM_BRIEF": {
      if (!roles.swe_lead) return null;
      const briefVersion = state.pmRevisionCount;
      return {
        reassignAgentId: roles.swe_lead.id,
        reason: "pm_brief_handoff_to_swe",
        latestTag: "PM_BRIEF",
        systemComment:
          `[System — Pipeline]\n` +
          `PM has posted [PM BRIEF v${briefVersion}]. ${roles.swe_lead.name}, it is your turn to review.\n\n` +
          `Read CEO's [TASK] and [PM BRIEF v${briefVersion}] above, then post:\n` +
          `  - [CONFIRMED] + ≥2 verification questions (if technically sound)\n` +
          `  - [CONCERNS] + ≥2 enumerated concerns (if there are technical issues)`,
      };
    }
    case "CONCERNS": {
      // Escalate to CEO if PM has already revised maxPmRevisions times and SWE still has concerns.
      if (state.pmRevisionCount >= maxPmRevisions) {
        if (!roles.ceo) return null;
        return {
          reassignAgentId: roles.ceo.id,
          reason: "concerns_escalation_to_ceo",
          latestTag: "CONCERNS",
          systemComment:
            `[System — Pipeline]\n` +
            `The PM ↔ SWE Lead debate has reached the ${maxPmRevisions}-revision limit without consensus. ` +
            `${roles.ceo.name}, your decision is needed.\n\n` +
            `Read the full [PM BRIEF] and [CONCERNS] thread above, then post [DECISION: <resolution>].\n` +
            `If you need clarification from the human, use request_confirmation.`,
        };
      }
      if (!roles.pm) return null;
      const nextRevision = state.pmRevisionCount + 1;
      return {
        reassignAgentId: roles.pm.id,
        reason: "concerns_handoff_to_pm",
        latestTag: "CONCERNS",
        systemComment:
          `[System — Pipeline]\n` +
          `SWE Lead has technical concerns. ${roles.pm.name}, this is revision ${nextRevision} of ${maxPmRevisions}.\n\n` +
          `Read [CONCERNS] above and post [PM BRIEF v${nextRevision}] addressing each concern.`,
      };
    }
    case "CONFIRMED": {
      if (state.needsDesign === true && !state.hasUiUxSpec && roles.uiux) {
        return {
          reassignAgentId: roles.uiux.id,
          reason: "confirmed_handoff_to_uiux",
          latestTag: "CONFIRMED",
          systemComment:
            `[System — Pipeline]\n` +
            `Spec confirmed. ${roles.uiux.name}, you are assigned because this issue requires design scope.\n\n` +
            `Read CEO's [TASK] and the final [PM BRIEF] above, then post [UI/UX SPEC] with:\n` +
            `  Component inventory, layout notes, interaction notes.`,
        };
      }
      // No design needed (or design already in) → SWE Lead emits [LGTM] next.
      if (!roles.swe_lead) return null;
      return {
        reassignAgentId: roles.swe_lead.id,
        reason: "confirmed_handoff_to_swe_for_lgtm",
        latestTag: "CONFIRMED",
        systemComment:
          `[System — Pipeline]\n` +
          `Spec confirmed. No design scope needed. ${roles.swe_lead.name}, post [LGTM] to advance the pipeline to implementation.\n\n` +
          `Ensure the spec is complete and there are no blocking open questions before posting [LGTM].`,
      };
    }
    case "UIUX_SPEC": {
      if (!roles.swe_lead) return null;
      return {
        reassignAgentId: roles.swe_lead.id,
        reason: "uiux_spec_handoff_to_swe",
        latestTag: "UIUX_SPEC",
        systemComment:
          `[System — Pipeline]\n` +
          `UI/UX Lead has posted [UI/UX SPEC]. ${roles.swe_lead.name}, review it above.\n\n` +
          `Post [LGTM] if the spec is ready to advance to implementation.`,
      };
    }
    case "DECISION": {
      // CEO has resolved a deadlock. Hand back to PM to revise or to SWE to confirm,
      // depending on whether the brief still needs another revision. Default: PM.
      if (!roles.pm) return null;
      const decisionRevision = state.pmRevisionCount + 1;
      return {
        reassignAgentId: roles.pm.id,
        reason: "decision_handoff_to_pm",
        latestTag: "DECISION",
        systemComment:
          `[System — Pipeline]\n` +
          `CEO has issued a [DECISION]. ${roles.pm.name}, incorporate the resolution into the brief.\n\n` +
          `Read [DECISION] above and post [PM BRIEF v${decisionRevision}] that addresses the CEO's resolution.`,
      };
    }
    case "LGTM": {
      // Spec stage complete. Advance pipeline. No system comment — SWE Lead stays on the issue.
      const nextStage: PipelineStage =
        state.needsDesign === true ? "design" : "implementation";
      if (!roles.swe_lead) return null;
      return {
        advanceToStage: nextStage,
        reassignAgentId: roles.swe_lead.id,
        reason: `lgtm_advance_to_${nextStage}`,
        latestTag: "LGTM",
      };
    }
    default:
      return null;
  }
}
