import { z } from "zod";

export const LANGS = ["en", "hi"] as const;
export const AUDIENCES = ["family", "community"] as const;
export const MODES = [
  "car",
  "two_wheeler",
  "auto",
  "bus",
  "metro",
  "e_rickshaw",
  "walk",
  "cycle",
  "wfh",
] as const;
export const CONDITIONS = ["asthma", "copd", "heart", "pregnancy", "diabetes"] as const;
export const COOKING = ["lpg", "png", "induction", "biomass"] as const;
export const PURIFIERS = ["none", "budget", "good"] as const;
export const HOME_SIZES = ["small", "medium", "large"] as const;
export const SCHOOL_RUNS = ["none", "walk", "vehicle", "school_bus"] as const;

export type Lang = (typeof LANGS)[number];
export type Mode = (typeof MODES)[number];
export type Condition = (typeof CONDITIONS)[number];

/** Who is at home and how they live: everything the engine needs to personalise a day. */
export const ProfileSchema = z.object({
  audience: z.enum(AUDIENCES),
  language: z.enum(LANGS),
  locality: z.string().min(1).max(40),
  members: z.object({
    infants: z.number().int().min(0).max(6), // under 5
    children: z.number().int().min(0).max(10), // 5 to 17
    adults: z.number().int().min(0).max(12),
    seniors: z.number().int().min(0).max(6), // 60 and over
  }),
  conditions: z.array(z.enum(CONDITIONS)).max(CONDITIONS.length),
  commute: z.object({
    mode: z.enum(MODES),
    km: z.number().min(0).max(100), // one way
    daysPerWeek: z.number().int().min(0).max(7),
  }),
  home: z.object({
    size: z.enum(HOME_SIZES),
    cooking: z.enum(COOKING),
    purifier: z.enum(PURIFIERS),
    rangeHood: z.boolean(),
  }),
  lifestyle: z.object({
    outdoorExercise: z.boolean(),
    schoolRun: z.enum(SCHOOL_RUNS),
  }),
  /** For community plans: how many households the committee speaks for. */
  households: z.number().int().min(1).max(5000),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Hourly outdoor readings for one local day (index 0 is 00:00). Always 24 entries. */
export const DaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pm25: z.array(z.number().min(0).max(2000)).length(24),
  pm10: z.array(z.number().min(0).max(3000)).length(24),
  source: z.enum(["live", "sample"]),
});
export type Day = z.infer<typeof DaySchema>;

export const CATEGORIES = [
  "good",
  "satisfactory",
  "moderate",
  "poor",
  "very_poor",
  "severe",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Localized = { en: string; hi: string };

export const DEFAULT_PROFILE: Profile = {
  audience: "family",
  language: "en",
  locality: "anand-vihar",
  members: { infants: 0, children: 1, adults: 2, seniors: 1 },
  conditions: [],
  commute: { mode: "two_wheeler", km: 12, daysPerWeek: 5 },
  home: { size: "medium", cooking: "lpg", purifier: "none", rangeHood: false },
  lifestyle: { outdoorExercise: true, schoolRun: "vehicle" },
  households: 1,
};
