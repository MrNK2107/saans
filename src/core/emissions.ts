import type { Mode, Profile } from "./types";

/**
 * Indicative CO2 per passenger-km at typical Delhi occupancy, in grams. The ranges in published
 * Indian studies are wide (ITF-OECD, TERI, India GHG Programme); these mid-range planning values
 * keep the ordering right: walking and cycling < metro and e-rickshaw < bus < auto < two-wheeler < car.
 */
export const CO2_G_PER_KM: Record<Mode, number> = {
  car: 140,
  two_wheeler: 45,
  auto: 70,
  bus: 35,
  metro: 20,
  e_rickshaw: 20,
  walk: 0,
  cycle: 0,
  wfh: 0,
};

/** Modes with no tailpipe on the street, so no local exhaust where people live and walk. */
export const TAILPIPE_FREE: readonly Mode[] = ["metro", "e_rickshaw", "walk", "cycle", "wfh"];

/** Working days in a month, used to turn a weekly routine into a monthly figure. */
const WEEKS_PER_MONTH = 4.3;

export function monthlyKm(commute: Profile["commute"], mode: Mode): number {
  return mode === "wfh" ? 0 : commute.km * 2 * commute.daysPerWeek * WEEKS_PER_MONTH;
}

/** Kilograms of CO2 per month for this commute by `mode`. */
export function monthlyCo2Kg(commute: Profile["commute"], mode: Mode): number {
  return (monthlyKm(commute, mode) * CO2_G_PER_KM[mode]) / 1000;
}

/** Monthly CO2 saved (kg, never negative) by switching from `from` to `to`. */
export function co2Saved(commute: Profile["commute"], from: Mode, to: Mode): number {
  return Math.max(
    0,
    Math.round((monthlyCo2Kg(commute, from) - monthlyCo2Kg(commute, to)) * 10) / 10,
  );
}
