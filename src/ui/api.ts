import type { Change } from "@/core/changes";
import type { Plan } from "@/core/plan";
import type { Narrative, Turn } from "@/ai/contracts";
import type { Profile } from "@/core/types";

export interface PlanResponse {
  plan: Plan;
  notice?: string;
}

export interface NarrateResponse {
  narrative: Narrative | null;
  ai: string | null;
}

export interface ChatResponse {
  reply: string;
  changes: { change: Change; text: string }[];
}

export class ApiError extends Error {
  override name = "ApiError";
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong.");
  return data as T;
}

export const fetchPlan = (profile: Profile, signal?: AbortSignal) =>
  post<PlanResponse>("/api/plan", { profile }, signal);

export const fetchNarrative = (profile: Profile, signal?: AbortSignal) =>
  post<NarrateResponse>("/api/narrate", { profile }, signal);

export const sendChat = (profile: Profile, history: Turn[], signal?: AbortSignal) =>
  post<ChatResponse>("/api/chat", { profile, history }, signal);
