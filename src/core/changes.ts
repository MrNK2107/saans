import { z } from "zod";
import { COOKING, MODES, PURIFIERS, ProfileSchema, type Lang, type Profile } from "./types";
import { findLocality } from "./localities";

/** The few things the assistant may propose to change about a household. Nothing else is allowed. */
export const ChangeSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_commute_mode"), mode: z.enum(MODES) }),
  z.object({ op: z.literal("set_purifier"), level: z.enum(PURIFIERS) }),
  z.object({ op: z.literal("set_cooking"), fuel: z.enum(COOKING) }),
  z.object({ op: z.literal("set_range_hood"), value: z.boolean() }),
  z.object({ op: z.literal("set_outdoor_exercise"), value: z.boolean() }),
  z.object({ op: z.literal("set_locality"), id: z.string().min(1).max(40) }),
]);
export type Change = z.infer<typeof ChangeSchema>;

/** Applies a change and re-validates the whole profile; returns null if it would be invalid. */
export function applyChange(profile: Profile, change: Change): Profile | null {
  const next: Profile = structuredClone(profile);
  switch (change.op) {
    case "set_commute_mode":
      next.commute.mode = change.mode;
      if (change.mode === "wfh") next.commute.daysPerWeek = 0;
      else if (next.commute.daysPerWeek === 0) next.commute.daysPerWeek = 5;
      break;
    case "set_purifier":
      next.home.purifier = change.level;
      break;
    case "set_cooking":
      next.home.cooking = change.fuel;
      break;
    case "set_range_hood":
      next.home.rangeHood = change.value;
      break;
    case "set_outdoor_exercise":
      next.lifestyle.outdoorExercise = change.value;
      break;
    case "set_locality":
      if (!findLocality(change.id)) return null;
      next.locality = change.id;
      break;
  }
  const parsed = ProfileSchema.safeParse(next);
  return parsed.success ? parsed.data : null;
}

const WORDS: Record<string, Record<Lang, string>> = {
  car: { en: "car", hi: "कार" },
  two_wheeler: { en: "two-wheeler", hi: "दोपहिया" },
  auto: { en: "auto-rickshaw", hi: "ऑटो" },
  bus: { en: "bus", hi: "बस" },
  metro: { en: "metro", hi: "मेट्रो" },
  e_rickshaw: { en: "e-rickshaw", hi: "ई-रिक्शा" },
  walk: { en: "walking", hi: "पैदल" },
  cycle: { en: "cycling", hi: "साइकिल" },
  wfh: { en: "working from home", hi: "घर से काम" },
  none: { en: "no purifier", hi: "कोई प्यूरीफायर नहीं" },
  budget: { en: "a budget purifier", hi: "सस्ता प्यूरीफायर" },
  good: { en: "a good HEPA purifier", hi: "अच्छा HEPA प्यूरीफायर" },
  lpg: { en: "LPG", hi: "एलपीजी" },
  png: { en: "piped gas", hi: "पाइप गैस" },
  induction: { en: "induction", hi: "इंडक्शन" },
  biomass: { en: "wood or cow-dung fuel", hi: "लकड़ी या उपले" },
};

const word = (key: string, lang: Lang) => WORDS[key]?.[lang] ?? key;

/** One plain sentence saying what the change does, shown before the person approves it. */
export function describeChange(change: Change, lang: Lang): string {
  const hi = lang === "hi";
  switch (change.op) {
    case "set_commute_mode":
      return hi
        ? `आने-जाने का साधन: ${word(change.mode, lang)}`
        : `Commute by ${word(change.mode, lang)}`;
    case "set_purifier":
      return hi ? `घर में ${word(change.level, lang)}` : `Use ${word(change.level, lang)} at home`;
    case "set_cooking":
      return hi
        ? `खाना पकाने का ईंधन: ${word(change.fuel, lang)}`
        : `Cook with ${word(change.fuel, lang)}`;
    case "set_range_hood":
      return change.value
        ? hi
          ? "खाना बनाते समय चिमनी या एग्ज़ॉस्ट चलाएँ"
          : "Run a hood or exhaust while cooking"
        : hi
          ? "रसोई में चिमनी नहीं"
          : "No hood in the kitchen";
    case "set_outdoor_exercise":
      return change.value
        ? hi
          ? "बाहर कसरत जारी रखें"
          : "Keep exercising outdoors"
        : hi
          ? "कसरत घर के अंदर करें"
          : "Exercise indoors instead";
    case "set_locality":
      return hi
        ? `इलाका बदलें: ${findLocality(change.id)?.name ?? change.id}`
        : `Switch area to ${findLocality(change.id)?.name ?? change.id}`;
  }
}
