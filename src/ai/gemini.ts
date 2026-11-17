import { GoogleGenAI, ThinkingLevel, type GenerateContentParameters } from "@google/genai";
import { AiUnavailable, parseJsonText, type Engine, type Source } from "./contracts";

/** Fast and reliable on the free tier; 3.5 Flash covers overload or quota on the lite model. */
export const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];

interface GeminiResult {
  text?: string;
  functionCalls?: { name?: string; args?: Record<string, unknown> }[];
  candidates?: {
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
}
export type Generate = (params: GenerateContentParameters) => Promise<GeminiResult>;

const ATTEMPT_MS = 25_000;
const BUDGET_MS = 55_000;
/** Failures another model may not share: retired model, timeout, quota, overload. */
const TRY_NEXT = new Set([404, 408, 429, 500, 502, 503, 504]);

function worthRetrying(error: unknown): boolean {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return true;
  }
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && TRY_NEXT.has(status);
}

/** Cited pages from a grounded answer: http(s) only, no duplicates. */
function citations(res: GeminiResult): Source[] {
  const seen = new Set<string>();
  return (res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []).flatMap(({ web }) => {
    if (!web?.uri || !/^https?:\/\//.test(web.uri) || seen.has(web.uri)) return [];
    seen.add(web.uri);
    return [{ url: web.uri, title: web.title || new URL(web.uri).hostname }];
  });
}

/** Gemini backend: tries each model in turn within a fixed time budget. */
export function geminiEngine(generate: Generate, models: string[]): Engine {
  async function run(params: Omit<GenerateContentParameters, "model">): Promise<GeminiResult> {
    const started = Date.now();
    for (const model of models) {
      const left = BUDGET_MS - (Date.now() - started);
      if (left < 5_000) break;
      try {
        return await generate({
          model,
          ...params,
          config: {
            // Planning needs little deliberation; low thinking keeps answers fast.
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            ...params.config,
            abortSignal: AbortSignal.timeout(Math.min(ATTEMPT_MS, left)),
          },
        });
      } catch (error) {
        if (!worthRetrying(error)) break;
      }
    }
    throw new AiUnavailable("Gemini isn't responding right now. Please try again shortly.");
  }

  return {
    name: "gemini",
    async json({ system, prompt, schema, temperature }) {
      const res = await run({
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          temperature,
        },
      });
      return parseJsonText(res.text);
    },
    async tools({ system, history, tools, temperature }) {
      const res = await run({
        contents: history.map((t) => ({
          role: t.role === "assistant" ? "model" : "user",
          parts: [{ text: t.text }],
        })),
        config: {
          systemInstruction: system,
          tools: [
            {
              functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description,
                parametersJsonSchema: t.parameters,
              })),
            },
          ],
          temperature,
        },
      });
      return {
        text: res.text ?? "",
        calls: (res.functionCalls ?? []).map((c) => ({ name: c.name, args: c.args })),
      };
    },
    async grounded({ prompt }) {
      const res = await run({
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], temperature: 0.9 },
      });
      return { text: res.text ?? "", sources: citations(res) };
    },
  };
}

/** Splits GEMINI_API_KEYS (comma-separated) or the single GEMINI_API_KEY into a clean list. */
export function keysFromEnv(env: Record<string, string | undefined>): string[] {
  const raw = env.GEMINI_API_KEYS || env.GEMINI_API_KEY || "";
  return [
    ...new Set(
      raw
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * Spreads calls across several keys and moves to the next key when one is out of quota, so a few
 * free-tier keys behave like one larger allowance.
 */
export function rotating(generates: Generate[]): Generate {
  let next = 0;
  return async (params) => {
    const start = next++ % generates.length;
    let last: unknown;
    for (let i = 0; i < generates.length; i++) {
      const generate = generates[(start + i) % generates.length] as Generate;
      try {
        return await generate(params);
      } catch (error) {
        last = error;
        if ((error as { status?: unknown } | null)?.status !== 429) throw error;
      }
    }
    throw last;
  };
}

export function geminiFromEnv(env: Record<string, string | undefined>): Engine {
  const generates = keysFromEnv(env).map((apiKey): Generate => {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 2 } },
    });
    return (params) => ai.models.generateContent(params);
  });
  const models = env.GEMINI_MODELS?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return geminiEngine(rotating(generates), models?.length ? models : DEFAULT_MODELS);
}
