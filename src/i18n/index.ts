import type { Lang } from "@/core/types";
import { en, type Key } from "./en";
import { hi } from "./hi";

export type { Key };

const DICTIONARIES = { en, hi } as const;

/** Looks a string up and fills {placeholders}. Falls back to English, then to the key itself. */
export function translate(
  lang: Lang,
  key: Key,
  params: Record<string, string | number> = {},
): string {
  const text: string = DICTIONARIES[lang][key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export type T = (key: Key, params?: Record<string, string | number>) => string;

export const translator =
  (lang: Lang): T =>
  (key, params) =>
    translate(lang, key, params);
