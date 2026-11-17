import type { Day, Mode, Profile } from "./types";

/**
 * A transparent, deterministic model of how much PM2.5 a person breathes in a day.
 *
 * Indoors it is a one-zone mass balance (the standard first-order model used in indoor air
 * research): outdoor air leaks in, particles settle, a purifier removes them, cooking adds them.
 * Every constant is an indicative planning value, not a measurement, and is listed here so the
 * README can state the assumptions plainly.
 */

export type Place = "home" | "away" | "commute" | "outdoor";
export type MaskLevel = "none" | "cloth" | "n95";
export type PersonaId = "commuter" | "homebody";

/** Air volume of the rooms people actually share (m³). */
export const HOME_VOLUME = { small: 35, medium: 55, large: 80 } as const;
/** Air changes per hour from outside: a leaky Indian flat with windows shut, and with them open. */
export const ACH = { closed: 0.8, open: 4 } as const;
/** Share of outdoor PM2.5 that survives the walls and window gaps. */
export const PENETRATION = 0.8;
/** Particle settling, per hour. */
export const DEPOSITION = 0.25;
/** Clean-air delivery rate for particles (m³/h) by purifier class. */
export const CADR = { none: 0, budget: 120, good: 300 } as const;
/** PM2.5 released while cooking (µg per hour of cooking, whole kitchen). */
export const COOKING_EMISSION = {
  lpg: 10_000,
  png: 8_000,
  induction: 1_000,
  biomass: 80_000,
} as const;
/** Share of cooking particles that reach the shared rooms, and what a range hood removes. */
export const COOKING_SHARE = 0.6;
export const HOOD_CAPTURE = 0.5;
export const COOKING_HOURS: readonly number[] = [7, 8, 19, 20];
/** The usual airing habit: windows open in the morning and late afternoon. */
export const HABIT_OPEN: readonly number[] = [7, 8, 9, 16, 17];

/** Fraction of outdoor PM2.5 reaching a person while indoors away from home (office, school). */
export const AWAY_FACTOR = 0.6;
/** In-vehicle and in-station factors against the roadside level. */
export const COMMUTE_FACTOR: Record<Mode, number> = {
  car: 0.6,
  two_wheeler: 1,
  auto: 1,
  bus: 0.8,
  metro: 0.5,
  e_rickshaw: 1,
  walk: 1,
  cycle: 1,
  wfh: 0,
};
/** Typical door-to-door speed in city traffic (km/h). */
export const SPEED: Record<Mode, number> = {
  car: 18,
  two_wheeler: 22,
  auto: 17,
  bus: 14,
  metro: 30,
  e_rickshaw: 15,
  walk: 4.5,
  cycle: 12,
  wfh: 1,
};
/** Breathing rate (m³/h) by activity. Walking and cycling make people breathe two to three times more. */
const BREATHING: Record<Place, number> = { home: 0.6, away: 0.7, commute: 0.8, outdoor: 2.5 };
const COMMUTE_BREATHING: Partial<Record<Mode, number>> = { walk: 1.6, cycle: 2.5 };
/** Share of particles that still reach the lungs through each mask. */
export const MASK_PENETRATION: Record<MaskLevel, number> = { none: 1, cloth: 0.7, n95: 0.25 };

export type Windows = "habit" | "closed" | { openHour: number };

export interface Behaviour {
  mode: Mode;
  mask: MaskLevel;
  windows: Windows;
  purifier: keyof typeof CADR;
  /** Run the purifier only while someone is home (true) or all day (false). */
  purifierWhenHome: boolean;
  cooking: keyof typeof COOKING_EMISSION;
  rangeHood: boolean;
  /** Hour of the daily outdoor workout, or null for none. */
  exerciseHour: number | null;
}

export interface Exposure {
  /** Total PM2.5 inhaled over the day (µg). */
  dose: number;
  /** Mean concentration breathed, weighted by how much air is inhaled (µg/m³). */
  meanConc: number;
  /** Hour of the day with the highest inhaled dose. */
  peakHour: number;
  /** Indoor concentration at home, hourly (µg/m³). */
  indoor: number[];
}

const hours = (n: number) => Array.from({ length: n }, (_, i) => i);

export function baselineBehaviour(p: Profile): Behaviour {
  return {
    mode: p.commute.mode,
    mask: "none",
    windows: "habit",
    purifier: p.home.purifier,
    purifierWhenHome: true,
    cooking: p.home.cooking,
    rangeHood: p.home.rangeHood,
    exerciseHour: p.lifestyle.outdoorExercise ? 6 : null,
  };
}

function isOpen(w: Windows, hour: number): boolean {
  if (w === "closed") return false;
  if (w === "habit") return HABIT_OPEN.includes(hour);
  return hour === w.openHour;
}

/** Hourly indoor PM2.5 for the shared rooms, solved exactly per hour and spun up over two days. */
export function indoorSeries(
  day: Day,
  p: Profile,
  b: Behaviour,
  personaAtHome: boolean[],
): number[] {
  const volume = HOME_VOLUME[p.home.size];
  const cooking =
    COOKING_EMISSION[b.cooking] * COOKING_SHARE * (b.rangeHood ? 1 - HOOD_CAPTURE : 1);
  let c = (day.pm25[0] ?? 0) * 0.5;
  const out: number[] = [];
  for (let step = 0; step < 48; step++) {
    const h = step % 24;
    const outdoor = day.pm25[h] ?? 0;
    const ach = isOpen(b.windows, h) ? ACH.open : ACH.closed;
    const cadr = !b.purifierWhenHome || personaAtHome[h] ? CADR[b.purifier] : 0;
    const source = COOKING_HOURS.includes(h) ? cooking : 0;
    const lambda = ach + DEPOSITION + cadr / volume;
    const steady = (PENETRATION * ach * outdoor + source / volume) / lambda;
    c = steady + (c - steady) * Math.exp(-lambda);
    if (step >= 24) out.push(c);
  }
  return out;
}

/** Fractions of each hour spent in each place for one weekday. */
function timeline(p: Profile, persona: PersonaId, b: Behaviour): Record<Place, number>[] {
  const slots = hours(24).map(() => ({ home: 1, away: 0, commute: 0, outdoor: 0 }));
  const move = (from: number, to: number, place: Place) => {
    for (let h = Math.floor(from); h < Math.ceil(to) && h < 24; h++) {
      if (h < 0) continue;
      const overlap = Math.min(to, h + 1) - Math.max(from, h);
      if (overlap <= 0) continue;
      const slot = slots[h];
      if (!slot) continue;
      const take = Math.min(overlap, slot.home);
      slot.home -= take;
      slot[place] += take;
    }
  };
  if (persona === "commuter" && b.mode !== "wfh") {
    const trip = Math.min(1.5, p.commute.km / SPEED[b.mode]);
    move(8 - trip, 8, "commute");
    move(8, 17, "away");
    move(17, 17 + trip, "commute");
  }
  if (b.exerciseHour !== null) move(b.exerciseHour, b.exerciseHour + 1, "outdoor");
  return slots;
}

export function exposure(day: Day, p: Profile, b: Behaviour, persona: PersonaId): Exposure {
  const slots = timeline(p, persona, b);
  const atHome = slots.map((s) => s.home > 0.5);
  const indoor = indoorSeries(day, p, b, atHome);
  const commuteRate = COMMUTE_BREATHING[b.mode] ?? BREATHING.commute;
  const masked = MASK_PENETRATION[b.mask];
  let dose = 0;
  let air = 0;
  let peakHour = 0;
  let peak = -1;
  slots.forEach((s, h) => {
    const outdoor = day.pm25[h] ?? 0;
    const parts: [number, number, number][] = [
      [s.home, BREATHING.home, indoor[h] ?? 0],
      [s.away, BREATHING.away, outdoor * AWAY_FACTOR],
      [s.commute, commuteRate, outdoor * COMMUTE_FACTOR[b.mode] * masked],
      [s.outdoor, BREATHING.outdoor, outdoor * masked],
    ];
    let hourDose = 0;
    for (const [fraction, rate, conc] of parts) {
      hourDose += fraction * rate * conc;
      air += fraction * rate;
    }
    dose += hourDose;
    if (hourDose > peak) {
      peak = hourDose;
      peakHour = h;
    }
  });
  return { dose, meanConc: air > 0 ? dose / air : 0, peakHour, indoor };
}

/** Whole-number percentage by which `after` is lower than `before` (negative when it is higher). */
export function reduction(before: number, after: number): number {
  return before > 0 ? Math.round(((before - after) / before) * 100) : 0;
}
