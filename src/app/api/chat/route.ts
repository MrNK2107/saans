import { AiUnavailable, pickProvider } from "@/ai/provider";
import { applyChange, describeChange } from "@/core/changes";
import { buildPlan } from "@/core/plan";
import { dayFor, todayInDelhi } from "@/server/air";
import { fail, readBody, reply, tooMany } from "@/server/guard";
import { ChatRequest } from "@/server/schemas";
import { createThrottle, ipOf } from "@/server/throttle";

export const maxDuration = 60;

const throttle = createThrottle({ limit: 20, windowMs: 60_000 });

/**
 * Answers a question about the household's air. Any change the assistant proposes is checked against
 * the real profile and returned in plain words; nothing is applied until the person approves it.
 */
export async function POST(req: Request) {
  const allowed = throttle.hit(ipOf(req));
  if (!allowed.ok) return tooMany(allowed.retryAfter);

  const body = await readBody(req, ChatRequest);
  if (!body.ok) return body.res;
  const { profile, history } = body.data;

  const ai = pickProvider();
  if (!ai) return fail(503, "The assistant isn't set up here. The plan above still works.");

  const plan = buildPlan(profile, await dayFor(profile.locality, todayInDelhi()));
  try {
    const { reply: text, changes } = await ai.converse(profile, plan, history);
    const valid = changes.filter((c) => applyChange(profile, c) !== null);
    return reply({
      reply: text,
      changes: valid.map((change) => ({ change, text: describeChange(change, profile.language) })),
    });
  } catch (error) {
    if (error instanceof AiUnavailable) return fail(503, error.message);
    return fail(502, "The assistant hit a problem. Please try again.");
  }
}
