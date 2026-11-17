import { cleanestWindow } from "./aqi";
import { co2Saved, monthlyCo2Kg } from "./emissions";
import { baselineBehaviour, exposure, reduction, type Behaviour, type PersonaId } from "./exposure";
import type { Day, Mode, Profile } from "./types";

export const ACTION_IDS = [
  "purifier",
  "windows",
  "mask",
  "exercise",
  "hood",
  "cooking_fuel",
  "commute_switch",
  "protect_sensitive",
  "school_run",
  "clean_air_room",
  "carpool",
  "no_burning",
] as const;
export type ActionId = (typeof ACTION_IDS)[number];
export type Group = "indoor" | "routine" | "commute" | "community";
export type Cost = "free" | "low" | "medium";

export interface Action {
  id: ActionId;
  group: Group;
  cost: Cost;
  /** Percentage by which this action lowers the PM2.5 the person inhales in a day, when it can be measured. */
  impactPct: number | null;
  /** Kilograms of CO2 saved per month, when it applies. */
  co2Kg: number | null;
  /** Values the written advice fills in (hours, modes, counts). */
  params: Record<string, string | number>;
}

export interface Context {
  profile: Profile;
  day: Day;
  personas: PersonaId[];
  /** Persona that sees the largest benefit from home-based changes. */
  home: PersonaId;
  /** Persona used for outings and exercise. */
  mover: PersonaId;
  meanAqi: number;
  sensitive: boolean;
}

const MIN_GAIN = 3;
const OPEN_MODES: readonly Mode[] = ["two_wheeler", "auto", "e_rickshaw", "bus", "walk", "cycle"];

const dose = (c: Context, b: Behaviour, persona: PersonaId) =>
  exposure(c.day, c.profile, b, persona).dose;

/** Evaluates one behaviour change against today's habits for one persona. */
function gain(c: Context, change: Partial<Behaviour>, persona: PersonaId): number {
  const base = baselineBehaviour(c.profile);
  return reduction(dose(c, base, persona), dose(c, { ...base, ...change }, persona));
}

/** Hour of the cheapest daytime slot to open windows or exercise, by lowest outdoor PM2.5. */
function bestHour(c: Context, width = 1): number {
  const daytime = c.day.pm25.slice(9, 18);
  return 9 + cleanestWindow(daytime, width);
}

export function windowsAction(c: Context): Action | null {
  const base = baselineBehaviour(c.profile);
  const options: { windows: Behaviour["windows"]; label: string | number }[] = [
    { windows: "closed", label: "closed" },
    ...[10, 11, 12, 13, 14, 15, 16].map((h) => ({ windows: { openHour: h }, label: h })),
  ];
  let best = options[0];
  let bestDose = Infinity;
  for (const o of options) {
    const d = dose(c, { ...base, windows: o.windows }, c.home);
    if (d < bestDose) {
      bestDose = d;
      best = o;
    }
  }
  const pct = reduction(dose(c, base, c.home), bestDose);
  if (!best || pct < MIN_GAIN) return null;
  return {
    id: "windows",
    group: "indoor",
    cost: "free",
    impactPct: pct,
    co2Kg: null,
    params: { when: best.label },
  };
}

export function purifierAction(c: Context): Action | null {
  if (c.profile.home.purifier === "good") return null;
  const pct = gain(c, { purifier: "good" }, c.home);
  if (pct < MIN_GAIN) return null;
  return {
    id: "purifier",
    group: "indoor",
    cost: "medium",
    impactPct: pct,
    co2Kg: null,
    params: { owned: c.profile.home.purifier },
  };
}

export function maskAction(c: Context): Action | null {
  const { mode } = c.profile.commute;
  if (!c.personas.includes("commuter") || mode === "wfh" || c.meanAqi <= 100) return null;
  const pct = gain(c, { mask: "n95" }, "commuter");
  if (pct < MIN_GAIN) return null;
  return {
    id: "mask",
    group: "routine",
    cost: "low",
    impactPct: pct,
    co2Kg: null,
    params: { open: OPEN_MODES.includes(mode) ? 1 : 0 },
  };
}

export function exerciseAction(c: Context): Action | null {
  if (!c.profile.lifestyle.outdoorExercise) return null;
  const hour = bestHour(c);
  const options: { exerciseHour: number | null; label: string | number }[] = [
    { exerciseHour: hour, label: hour },
    { exerciseHour: null, label: "indoors" },
  ];
  const base = baselineBehaviour(c.profile);
  const before = dose(c, base, c.mover);
  const scored = options.map((o) => ({
    o,
    d: dose(c, { ...base, exerciseHour: o.exerciseHour }, c.mover),
  }));
  scored.sort((a, b) => a.d - b.d);
  const top = scored[0];
  if (!top) return null;
  const pct = reduction(before, top.d);
  if (pct < MIN_GAIN) return null;
  return {
    id: "exercise",
    group: "routine",
    cost: "free",
    impactPct: pct,
    co2Kg: null,
    params: { when: top.o.label },
  };
}

export function hoodAction(c: Context): Action | null {
  const { home } = c.profile;
  if (home.rangeHood || home.cooking === "induction") return null;
  const pct = gain(c, { rangeHood: true }, c.home);
  if (pct < MIN_GAIN) return null;
  return { id: "hood", group: "indoor", cost: "low", impactPct: pct, co2Kg: null, params: {} };
}

export function fuelAction(c: Context): Action | null {
  const { cooking } = c.profile.home;
  if (cooking === "induction" || cooking === "png") return null;
  const to = cooking === "biomass" ? "lpg" : "induction";
  const pct = gain(c, { cooking: to }, c.home);
  if (pct < MIN_GAIN) return null;
  return {
    id: "cooking_fuel",
    group: "indoor",
    cost: "medium",
    impactPct: pct,
    co2Kg: null,
    params: { to },
  };
}

/** The lowest-carbon way to make this trip that does not raise how much smog the traveller breathes. */
export function commuteAction(c: Context): Action | null {
  const { commute } = c.profile;
  if (!c.personas.includes("commuter") || commute.mode === "wfh" || commute.daysPerWeek === 0)
    return null;
  const base = baselineBehaviour(c.profile);
  const before = dose(c, base, "commuter");
  const candidates: Mode[] = ["metro", "bus", "e_rickshaw"];
  if (commute.km <= 3) candidates.push("walk");
  if (commute.km <= 8) candidates.push("cycle");
  let best: { mode: Mode; kg: number; pct: number } | null = null;
  for (const mode of candidates) {
    if (mode === commute.mode) continue;
    const kg = co2Saved(commute, commute.mode, mode);
    const pct = reduction(before, dose(c, { ...base, mode }, "commuter"));
    // A greener trip must not mean breathing noticeably more smog: that rules out cycling in a severe spell.
    if (kg <= 0 || pct < -5) continue;
    if (!best || kg > best.kg || (kg === best.kg && pct > best.pct)) best = { mode, kg, pct };
  }
  if (!best) return null;
  return {
    id: "commute_switch",
    group: "commute",
    cost: "low",
    impactPct: best.pct,
    co2Kg: best.kg,
    params: {
      from: commute.mode,
      to: best.mode,
      now: Math.round(monthlyCo2Kg(commute, commute.mode)),
    },
  };
}

export function communityActions(c: Context): Action[] {
  const { profile } = c;
  if (profile.audience !== "community") return [];
  const out: Action[] = [];
  const n = profile.households;
  const room = baselineBehaviour({
    ...profile,
    home: { ...profile.home, size: "large", purifier: "good" },
  });
  const before = dose(c, baselineBehaviour(profile), c.home);
  const pct = reduction(before, dose(c, room, c.home));
  if (profile.home.purifier !== "good" && pct >= MIN_GAIN) {
    out.push({
      id: "clean_air_room",
      group: "community",
      cost: "medium",
      impactPct: pct,
      co2Kg: null,
      params: { n },
    });
  }
  const mode = profile.commute.mode;
  if (mode === "car" || mode === "two_wheeler") {
    const monthly = monthlyCo2Kg(profile.commute, mode);
    // A shared car of three cuts each rider's share to a third; assume three in ten households join.
    const kg = Math.round(monthly * (1 - 1 / 3) * n * 0.3);
    if (kg > 0)
      out.push({
        id: "carpool",
        group: "community",
        cost: "free",
        impactPct: null,
        co2Kg: kg,
        params: { n, joined: Math.round(n * 0.3) },
      });
  }
  out.push({
    id: "no_burning",
    group: "community",
    cost: "free",
    impactPct: null,
    co2Kg: null,
    params: { n },
  });
  return out;
}

export function careActions(c: Context, peak: string): Action[] {
  const out: Action[] = [];
  if (c.sensitive && c.meanAqi > 100) {
    out.push({
      id: "protect_sensitive",
      group: "routine",
      cost: "free",
      impactPct: null,
      co2Kg: null,
      params: { peak },
    });
  }
  const { children, infants } = c.profile.members;
  if (
    (children > 0 || infants > 0) &&
    c.profile.lifestyle.schoolRun !== "none" &&
    c.meanAqi > 100
  ) {
    out.push({
      id: "school_run",
      group: "routine",
      cost: "free",
      impactPct: null,
      co2Kg: null,
      params: { run: c.profile.lifestyle.schoolRun },
    });
  }
  return out;
}
