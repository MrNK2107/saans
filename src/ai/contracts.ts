import { z } from "zod";
import { ACTION_IDS } from "@/core/actions";
import { ChangeSchema, type Change } from "@/core/changes";
import type { Plan } from "@/core/plan";
import type { Profile } from "@/core/types";

export const TurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(1500),
});
export type Turn = z.infer<typeof TurnSchema>;

export interface Source {
  url: string;
  title: string;
}

/** What the model adds on top of the computed plan: a human headline, and why each action fits this home. */
export const NarrativeSchema = z.object({
  headline: z.string().trim().min(1).max(140),
  summary: z.string().trim().min(1).max(600),
  priorities: z
    .array(z.object({ id: z.enum(ACTION_IDS), reason: z.string().trim().min(1).max(240) }))
    .max(6),
});
export type Narrative = z.infer<typeof NarrativeSchema>;

export type ProviderName = "gemini" | "ollama" | "mock";

/** What the app asks of an AI model, whichever model it is. */
export interface AiProvider {
  name: ProviderName;
  narrate(profile: Profile, plan: Plan): Promise<Narrative>;
  converse(
    profile: Profile,
    plan: Plan,
    history: Turn[],
  ): Promise<{ reply: string; changes: Change[] }>;
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface RawCall {
  name?: string;
  args?: unknown;
}

/** The few primitive calls each model backend implements; everything else is shared. */
export interface Engine {
  name: Exclude<ProviderName, "mock">;
  json(req: {
    system: string;
    prompt: string;
    schema: Record<string, unknown>;
    temperature: number;
  }): Promise<unknown>;
  tools(req: {
    system: string;
    history: Turn[];
    tools: ToolDeclaration[];
    temperature: number;
  }): Promise<{ text: string; calls: RawCall[] }>;
  /** Web-grounded generation, when the backend supports it. */
  grounded?(req: { prompt: string }): Promise<{ text: string; sources: Source[] }>;
}

/** No model could answer. The message is safe to show to the person. */
export class AiUnavailable extends Error {
  override name = "AiUnavailable";
}

export function parseJsonText(text: string | undefined): unknown {
  try {
    return JSON.parse(text ?? "");
  } catch {
    throw new AiUnavailable("The assistant sent back something unreadable. Please try again.");
  }
}

export { ChangeSchema };
