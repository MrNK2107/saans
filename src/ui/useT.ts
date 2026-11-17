"use client";

import { useMemo } from "react";
import { translator, type T } from "@/i18n";
import type { Lang } from "@/core/types";
import { useProfile } from "@/store/local";

/** The active language and a translate function, following the saved household's language. */
export function useT(): { lang: Lang; t: T } {
  const [profile] = useProfile();
  const lang = profile.language;
  return { lang, t: useMemo(() => translator(lang), [lang]) };
}
