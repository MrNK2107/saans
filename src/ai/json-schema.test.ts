import { describe, expect, it } from "vitest";
import { z } from "zod";
import { NarrativeSchema } from "./contracts";
import { forModel } from "./json-schema";

const keys = (schema: unknown): Set<string> => {
  const found = new Set<string>();
  JSON.stringify(schema, (key, value) => (found.add(key), value));
  return found;
};

describe("forModel", () => {
  it("drops keywords Gemini rejects, including array-length bounds", () => {
    const schema = forModel(
      z.object({
        tags: z
          .array(z.string().regex(/^[a-z]+$/))
          .min(1)
          .max(5),
        day: z.iso.date(),
        n: z.number().positive(),
      }),
    );
    for (const k of [
      "$schema",
      "pattern",
      "format",
      "additionalProperties",
      "exclusiveMinimum",
      "minItems",
      "maxItems",
    ]) {
      expect(keys(schema).has(k)).toBe(false);
    }
  });

  it("keeps the structure the model needs", () => {
    const schema = forModel(NarrativeSchema) as {
      required: string[];
      properties: Record<string, { type: string }>;
    };
    expect(schema.required).toEqual(expect.arrayContaining(["headline", "summary", "priorities"]));
    expect(schema.properties.priorities?.type).toBe("array");
    expect(keys(schema).has("enum")).toBe(true);
  });
});
