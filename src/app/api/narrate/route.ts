import { AiUnavailable, pickProvider, type Narrative } from "@/ai/provider";
import { buildPlan } from "@/core/plan";
import { dayFor, todayInDelhi } from "@/server/air";
import { fail, readBody, reply, tooMany } from "@/server/guard";
import { createMemo } from "@/server/memo";
import { PlanRequest } from "@/server/schemas";
import { createThrottle, ipOf } from "@/server/throttle";

export const maxDuration = 60;

const throttle = createThrottle({ limit: 8, windowMs: 60_000 });
const narratives = createMemo<{ narrative: Narrative; ai: string }>({
  ttlMs: 20 * 60_000,
  max: 300,
});

/**
 * Asks the model to put today's computed plan into words for this household. The model never sees
 * anything it could recalculate: only the finished facts. With no model, the answer is an empty 204.
 */
export async function POST(req: Request) {
  const allowed = throttle.hit(ipOf(req));
  if (!allowed.ok) return tooMany(allowed.retryAfter);

  const body = await readBody(req, PlanRequest);
  if (!body.ok) return body.res;
  const { profile } = body.data;

  const ai = pickProvider();
  if (!ai) return reply({ narrative: null, ai: null });

  const date = todayInDelhi();
  const plan = buildPlan(profile, await dayFor(profile.locality, date));
  const key = `${date}|${plan.source}|${JSON.stringify(profile)}`;
  const hit = narratives.get(key);
  if (hit) return reply(hit);

  try {
    const fresh = { narrative: await ai.narrate(profile, plan), ai: ai.name };
    narratives.set(key, fresh);
    return reply(fresh);
  } catch (error) {
    if (error instanceof AiUnavailable) return fail(503, error.message);
    return fail(502, "The assistant hit a problem. Please try again.");
  }
}
