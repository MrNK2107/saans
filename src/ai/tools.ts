import { z } from "zod";
import { ChangeSchema, type Change } from "@/core/changes";
import { COOKING, MODES, PURIFIERS } from "@/core/types";
import { forModel } from "./json-schema";
import type { RawCall, ToolDeclaration } from "./contracts";

const TOOL_SCHEMAS = {
  set_commute_mode: {
    description: "Change how the household commutes (car, metro, bus, work from home...).",
    schema: z.object({ mode: z.enum(MODES) }),
  },
  set_purifier: {
    description: "Change the air purifier the household uses at home.",
    schema: z.object({ level: z.enum(PURIFIERS) }),
  },
  set_cooking: {
    description: "Change the main cooking fuel.",
    schema: z.object({ fuel: z.enum(COOKING) }),
  },
  set_range_hood: {
    description: "Say whether a hood or exhaust fan is used while cooking.",
    schema: z.object({ value: z.boolean() }),
  },
  set_outdoor_exercise: {
    description: "Say whether the household exercises outdoors.",
    schema: z.object({ value: z.boolean() }),
  },
  set_locality: {
    description:
      "Move the plan to another Delhi-NCR area, by its id (e.g. dwarka, noida, anand-vihar).",
    schema: z.object({ id: z.string() }),
  },
} as const;

export const TOOLS: ToolDeclaration[] = Object.entries(TOOL_SCHEMAS).map(([name, t]) => ({
  name,
  description: t.description,
  parameters: forModel(t.schema),
}));

/** Keeps only calls the model made correctly: known tool, valid arguments, at most four. */
export function parseCalls(calls: RawCall[]): Change[] {
  const out: Change[] = [];
  for (const call of calls) {
    if (!call.name || !(call.name in TOOL_SCHEMAS)) continue;
    const args = typeof call.args === "object" && call.args !== null ? call.args : {};
    const parsed = ChangeSchema.safeParse({ op: call.name, ...args });
    if (parsed.success) out.push(parsed.data);
    if (out.length === 4) break;
  }
  return out;
}
