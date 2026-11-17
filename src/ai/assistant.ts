import { z } from "zod";
import type { Change } from "@/core/changes";
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
import { CONVERSE_SYSTEM, NARRATE_SYSTEM, converseContext, fence, narratePrompt } from "./prompts";
import { TOOLS, parseCalls } from "./tools";

const NARRATIVE_JSON = forModel(NarrativeSchema);
const ReplySchema = z.object({ reply: z.string().trim().min(1).max(900) });
const REPLY_JSON = forModel(ReplySchema);
const DEFAULT_REPLY = "Here is what I would change.";

/**
 * Models often answer a "can you set this up?" question with a tool call and no words. This asks for
 * the written answer separately, so the person always gets advice and not only a button.
 */
async function writeReply(
  engine: Engine,
  profile: Profile,
  plan: Plan,
  history: Turn[],
  changes: Change[],
): Promise<string> {
  try {
    const raw = await engine.json({
      system: CONVERSE_SYSTEM,
      prompt:
        `${converseContext(profile, plan)}
${fence("conversation", history)}
` +
        `You are proposing these changes, which the person will approve: ${JSON.stringify(changes)}. ` +
        "Write the short reply that answers their question and says what the change would do. " +
        "Present it as a suggestion they can approve, never as something already done.",
      schema: REPLY_JSON,
      temperature: 0.5,
    });
    const parsed = ReplySchema.safeParse(raw);
    return parsed.success ? parsed.data.reply : DEFAULT_REPLY;
  } catch {
    return DEFAULT_REPLY;
  }
}

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
      const spoken = res.text.trim();
      const reply =
        spoken || (changes.length ? await writeReply(engine, profile, plan, history, changes) : "");
      if (!reply)
        throw new AiUnavailable("The assistant had no answer. Please try asking another way.");
      return { reply, changes };
    },
  };
}
