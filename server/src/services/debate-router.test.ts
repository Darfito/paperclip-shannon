import { describe, expect, it } from "vitest";
import {
  buildAgentRoleMap,
  classifyDebateAgent,
  decideDebateAction,
  deriveDebateState,
  MAX_DEBATE_ROUND_TRIPS,
  parseDebateSignals,
  validateSweConcerns,
  type DebateAgentRef,
  type CommentLike,
} from "./debate-router.js";

const ceo: DebateAgentRef = { id: "ceo-id", name: "CEO", role: "general", title: "Chief Executive Officer", status: "idle" };
const pm: DebateAgentRef = { id: "pm-id", name: "PM", role: "general", title: "Product Manager", status: "idle" };
const swe: DebateAgentRef = { id: "swe-id", name: "SWE Lead", role: "general", title: "Software Engineering Lead", status: "idle" };
const uiux: DebateAgentRef = { id: "uiux-id", name: "UI/UX Lead", role: "general", title: "UI/UX Lead (Light Agent)", status: "idle" };
const roles = buildAgentRoleMap([ceo, pm, swe, uiux]);

function comment(id: string, agentId: string | null, body: string, createdAtSec = 0): CommentLike {
  return { id, authorAgentId: agentId, body, createdAt: new Date(createdAtSec * 1000) };
}

describe("classifyDebateAgent", () => {
  it("identifies CEO/PM/SWE Lead/UI-UX from name + title", () => {
    expect(classifyDebateAgent(ceo)).toBe("ceo");
    expect(classifyDebateAgent(pm)).toBe("pm");
    expect(classifyDebateAgent(swe)).toBe("swe_lead");
    expect(classifyDebateAgent(uiux)).toBe("uiux");
  });

  it("returns null for terminated agents", () => {
    expect(classifyDebateAgent({ ...swe, status: "terminated" })).toBe(null);
  });

  it("returns null for unrelated agents", () => {
    expect(
      classifyDebateAgent({ id: "x", name: "QA Bot", role: "general", title: null, status: "idle" }),
    ).toBe(null);
  });
});

describe("parseDebateSignals", () => {
  it("parses CEO TASK + NEEDS_DESIGN block", () => {
    const body = `[TASK: build login screen]
We need a login screen with OAuth.

[NEEDS_DESIGN: yes]`;
    const sigs = parseDebateSignals(body);
    expect(sigs).toContainEqual({ tag: "TASK", payload: "build login screen" });
    expect(sigs).toContainEqual({ tag: "NEEDS_DESIGN", needsDesign: true });
  });

  it("parses PM brief version", () => {
    const sigs = parseDebateSignals("[PM BRIEF v3]\nstuff");
    expect(sigs).toContainEqual({ tag: "PM_BRIEF", version: 3 });
  });

  it("counts enumerated items after CONFIRMED/CONCERNS", () => {
    const ok = parseDebateSignals("[CONFIRMED]\n1. one\n2. two");
    expect(ok.find((s) => s.tag === "CONFIRMED")?.enumeratedCount).toBe(2);

    const bad = parseDebateSignals("[CONCERNS]\n1. only one");
    expect(bad.find((s) => s.tag === "CONCERNS")?.enumeratedCount).toBe(1);
  });

  it("parses LGTM, UI/UX SPEC, DECISION", () => {
    expect(parseDebateSignals("[LGTM]\nshipping").map((s) => s.tag)).toEqual(["LGTM"]);
    expect(parseDebateSignals("[UI/UX SPEC]\n...")[0]?.tag).toBe("UIUX_SPEC");
    const dec = parseDebateSignals("[DECISION: ship anyway]\nbecause Y");
    expect(dec[0]).toEqual({ tag: "DECISION", payload: "ship anyway" });
  });

  it("returns empty for plain comments", () => {
    expect(parseDebateSignals("just a regular comment with no tags")).toEqual([]);
  });
});

describe("validateSweConcerns", () => {
  it("rejects [CONFIRMED] without ≥2 enumerated items", () => {
    const sigs = parseDebateSignals("[CONFIRMED]\n1. only one");
    expect(validateSweConcerns(sigs)).toMatch(/≥2 enumerated/);
  });

  it("accepts [CONFIRMED] with ≥2 enumerated items", () => {
    const sigs = parseDebateSignals("[CONFIRMED]\n1. one\n2. two");
    expect(validateSweConcerns(sigs)).toBeNull();
  });

  it("accepts comments with no SWE signals", () => {
    expect(validateSweConcerns(parseDebateSignals("[TASK: foo]"))).toBeNull();
  });
});

describe("decideDebateAction", () => {
  it("routes [TASK] from CEO to PM", () => {
    const state = deriveDebateState([comment("c1", ceo.id, "[TASK: build it]\n[NEEDS_DESIGN: no]")]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.reassignAgentId).toBe(pm.id);
    expect(decision?.latestTag).toBe("TASK");
  });

  it("routes [PM BRIEF v1] to SWE Lead", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\nstories: ..."),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.reassignAgentId).toBe(swe.id);
  });

  it("routes [CONCERNS] to PM for revision", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\nstories: ..."),
      comment("c3", swe.id, "[CONCERNS]\n1. one\n2. two"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.reassignAgentId).toBe(pm.id);
    expect(decision?.latestTag).toBe("CONCERNS");
  });

  it("escalates to CEO after 2 PM revisions with persistent concerns", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONCERNS]\n1. a\n2. b"),
      comment("c4", pm.id, "[PM BRIEF v2]\n..."),
      comment("c5", swe.id, "[CONCERNS]\n1. still bad\n2. still"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.reassignAgentId).toBe(ceo.id);
    expect(decision?.reason).toMatch(/escalation_to_ceo/);
  });

  it("routes [CONFIRMED] to UI/UX when NEEDS_DESIGN: yes and no SPEC yet", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: yes]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONFIRMED]\n1. a\n2. b"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.reassignAgentId).toBe(uiux.id);
  });

  it("routes [CONFIRMED] back to SWE for [LGTM] when NEEDS_DESIGN: no", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONFIRMED]\n1. a\n2. b"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.reassignAgentId).toBe(swe.id);
    expect(decision?.reason).toMatch(/lgtm/);
  });

  it("routes [UI/UX SPEC] back to SWE for [LGTM]", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: yes]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONFIRMED]\n1. a\n2. b"),
      comment("c4", uiux.id, "[UI/UX SPEC]\n..."),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.reassignAgentId).toBe(swe.id);
  });

  it("advances to design on [LGTM] when NEEDS_DESIGN: yes", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: yes]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONFIRMED]\n1. a\n2. b"),
      comment("c4", uiux.id, "[UI/UX SPEC]\n..."),
      comment("c5", swe.id, "[LGTM]\nshipping"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.advanceToStage).toBe("design");
    expect(decision?.reassignAgentId).toBe(swe.id);
  });

  it("advances to implementation on [LGTM] when NEEDS_DESIGN: no", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONFIRMED]\n1. a\n2. b"),
      comment("c4", swe.id, "[LGTM]\nshipping"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.advanceToStage).toBe("implementation");
  });

  it("triggers human checkpoint when round-trip cap is reached", () => {
    const turns: CommentLike[] = [
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
    ];
    // Build enough PM/SWE round-trips to hit the cap.
    for (let i = 1; i <= MAX_DEBATE_ROUND_TRIPS + 1; i++) {
      turns.push(comment(`pm-${i}`, pm.id, `[PM BRIEF v${i}]\n...`));
      turns.push(comment(`swe-${i}`, swe.id, `[CONCERNS]\n1. x\n2. y`));
    }
    const state = deriveDebateState(turns);
    const decision = decideDebateAction(state, roles);
    expect(decision?.triggerHumanCheckpoint).toBeTruthy();
  });

  it("returns null when there are no signals yet", () => {
    const state = deriveDebateState([comment("c0", null, "hello")]);
    expect(decideDebateAction(state, roles)).toBeNull();
  });
});

describe("decideDebateAction — systemComment (Step 13)", () => {
  it("TASK→PM includes systemComment mentioning PM name", () => {
    const state = deriveDebateState([comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]")]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.systemComment).toMatch(/\[System — Pipeline\]/);
    expect(decision?.systemComment).toMatch(pm.name);
    expect(decision?.systemComment).toMatch(/PM BRIEF v1/);
  });

  it("PM_BRIEF→SWE includes brief version and SWE name", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\nstories: ..."),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.systemComment).toMatch(/\[System — Pipeline\]/);
    expect(decision?.systemComment).toMatch(swe.name);
    expect(decision?.systemComment).toMatch(/v1/);
  });

  it("CONCERNS→PM includes revision number and PM name", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONCERNS]\n1. one\n2. two"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.systemComment).toMatch(/\[System — Pipeline\]/);
    expect(decision?.systemComment).toMatch(pm.name);
    expect(decision?.systemComment).toMatch(/revision 2/);
  });

  it("CONCERNS→CEO escalation includes CEO name and max revisions", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONCERNS]\n1. a\n2. b"),
      comment("c4", pm.id, "[PM BRIEF v2]\n..."),
      comment("c5", swe.id, "[CONCERNS]\n1. still bad\n2. still"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.systemComment).toMatch(/\[System — Pipeline\]/);
    expect(decision?.systemComment).toMatch(ceo.name);
    expect(decision?.systemComment).toMatch(/DECISION/);
  });

  it("CONFIRMED with NEEDS_DESIGN→UI/UX includes uiux name", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: yes]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONFIRMED]\n1. a\n2. b"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.systemComment).toMatch(/\[System — Pipeline\]/);
    expect(decision?.systemComment).toMatch(uiux.name);
    expect(decision?.systemComment).toMatch(/UI\/UX SPEC/);
  });

  it("CONFIRMED without NEEDS_DESIGN→SWE includes LGTM instruction", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONFIRMED]\n1. a\n2. b"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.systemComment).toMatch(/\[System — Pipeline\]/);
    expect(decision?.systemComment).toMatch(/LGTM/);
  });

  it("UIUX_SPEC→SWE includes SWE name and LGTM instruction", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: yes]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONFIRMED]\n1. a\n2. b"),
      comment("c4", uiux.id, "[UI/UX SPEC]\n..."),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.systemComment).toMatch(/\[System — Pipeline\]/);
    expect(decision?.systemComment).toMatch(swe.name);
    expect(decision?.systemComment).toMatch(/LGTM/);
  });

  it("DECISION→PM includes PM name and next brief version", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONCERNS]\n1. a\n2. b"),
      comment("c4", pm.id, "[PM BRIEF v2]\n..."),
      comment("c5", swe.id, "[CONCERNS]\n1. still\n2. bad"),
      comment("c6", ceo.id, "[DECISION: proceed with option A]"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.systemComment).toMatch(/\[System — Pipeline\]/);
    expect(decision?.systemComment).toMatch(pm.name);
    expect(decision?.systemComment).toMatch(/DECISION/);
  });

  it("LGTM has no systemComment — SWE Lead stays on issue", () => {
    const state = deriveDebateState([
      comment("c1", ceo.id, "[TASK: x]\n[NEEDS_DESIGN: no]"),
      comment("c2", pm.id, "[PM BRIEF v1]\n..."),
      comment("c3", swe.id, "[CONFIRMED]\n1. a\n2. b"),
      comment("c4", swe.id, "[LGTM]"),
    ]);
    const decision = decideDebateAction(state, roles);
    expect(decision?.systemComment).toBeUndefined();
  });
});
