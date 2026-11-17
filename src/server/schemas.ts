import { z } from "zod";
import { TurnSchema } from "@/ai/contracts";
import { ProfileSchema } from "@/core/types";

export const PlanRequest = z.object({ profile: ProfileSchema });

export const ChatRequest = z.object({
  profile: ProfileSchema,
  history: z.array(TurnSchema).min(1).max(12),
});
