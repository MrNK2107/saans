import { buildPlan } from "@/core/plan";
import { dayFor, todayInDelhi } from "@/server/air";
import { readBody, reply, tooMany } from "@/server/guard";
import { PlanRequest } from "@/server/schemas";
import { createThrottle, ipOf } from "@/server/throttle";

const throttle = createThrottle({ limit: 20, windowMs: 60_000 });

/**
 * Builds today's plan from tested code only, so it arrives in well under a second. The AI's wording
 * is requested separately from /api/narrate and fills in when it is ready.
 */
export async function POST(req: Request) {
  const allowed = throttle.hit(ipOf(req));
  if (!allowed.ok) return tooMany(allowed.retryAfter);

  const body = await readBody(req, PlanRequest);
  if (!body.ok) return body.res;
  const { profile } = body.data;

  const plan = buildPlan(profile, await dayFor(profile.locality, todayInDelhi()));
  const notice =
    plan.source === "sample"
      ? "Live air data isn't reachable right now, so this uses a typical winter day."
      : undefined;
  return reply({ plan, notice });
}
