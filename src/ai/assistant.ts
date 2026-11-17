import type { Plan } from "@/core/plan";
import type { Profile } from "@/core/types";
import {
  AiUnavailable,
  NarrativeSchema,
  type AiProvider,
  type Engine,
  type Narrative,
  type Turn,
} from "./contracts";
import { forModel } from "./json-schema";
import { CONVERSE_SYSTEM, NARRATE_SYSTEM, converseContext, narratePrompt } from "./prompts";
import { TOOLS, parseCalls } from "./tools";

const NARRATIVE_JSON = forModel(NarrativeSchema);

/** Keeps the model's ordering but only for actions that exist in the computed plan, once each. */
export function cleanNarrative(raw: Narrative, plan: Plan): Narrative {
  const known = new Set(plan.actions.map((a) => a.id));
  const seen = new Set<string>();
  const priorities = raw.priorities.filter((p) => {
    if (!known.has(p.id) || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  return { ...raw, priorities: priorities.slice(0, 5) };
}

/** Builds the app's AI provider from any backend that implements the small Engine contract. */
export function createAssistant(engine: Engine): AiProvider {
  return {
    name: engine.name,
    async narrate(profile: Profile, plan: Plan) {
      const raw = await engine.json({
        system: NARRATE_SYSTEM,
        prompt: narratePrompt(profile, plan),
        schema: NARRATIVE_JSON,
        temperature: 0.4,
      });
      const parsed = NarrativeSchema.safeParse(raw);
      if (!parsed.success)
        throw new AiUnavailable("The assistant's answer didn't look right. Please try again.");
      return cleanNarrative(parsed.data, plan);
    },
    async converse(profile: Profile, plan: Plan, history: Turn[]) {
      // The household and today's facts ride along as the first turn, fenced as data.
      const turns: Turn[] = [{ role: "user", text: converseContext(profile, plan) }, ...history];
      const res = await engine.tools({
        system: CONVERSE_SYSTEM,
        history: turns,
        tools: TOOLS,
        temperature: 0.5,
      });
      const changes = parseCalls(res.calls);
      const reply = res.text.trim() || (changes.length ? "Here is what I would change." : "");
      if (!reply)
        throw new AiUnavailable("The assistant had no answer. Please try asking another way.");
      return { reply, changes };
    },
  };
}
