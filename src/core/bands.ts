import type { Action } from "./actions";
import type { HourlyPoint } from "./plan";
import { CATEGORIES, type Category } from "./types";

/** What a household should do in a three-hour stretch of the day. */
export type BandKind = "stay_in" | "careful" | "best" | "sleep";

export interface Band {
  /** 0 to 7. */
  index: number;
  startHour: number;
  endHour: number;
  kind: BandKind;
  aqi: number;
  category: Category;
}

export const BAND_HOURS = 3;
const POOR = CATEGORIES.indexOf("poor");

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

interface DayShape {
  hourly: readonly HourlyPoint[];
  cleanestHour: number;
  worstHours: readonly number[];
}

/**
 * Cuts the day into eight bands and names each one. The names are relative to the day, so even on a
 * severe day the cleanest stretch is called "Best" and the dirtiest "Stay in"; the AQI under each band
 * keeps that honest. Rest hours (night) are always "Sleep".
 */
export function buildBands(day: DayShape): Band[] {
  const count = 24 / BAND_HOURS;
  const dayMean = mean(day.hourly.map((h) => h.aqi));
  return Array.from({ length: count }, (_, index) => {
    const startHour = index * BAND_HOURS;
    const endHour = startHour + BAND_HOURS;
    const hours = day.hourly.filter((h) => h.hour >= startHour && h.hour < endHour);
    const aqi = Math.round(mean(hours.map((h) => h.aqi)));
    const category = hours.length
      ? (hours.reduce((worst, h) =>
          CATEGORIES.indexOf(h.category) > CATEGORIES.indexOf(worst.category) ? h : worst,
        ).category as Category)
      : "good";
    const within = (hour: number) => hour >= startHour && hour < endHour;
    const night = startHour < 6 || startHour >= 21;

    let kind: BandKind;
    if (night) kind = "sleep";
    else if (within(day.cleanestHour)) kind = "best";
    else if (
      CATEGORIES.indexOf(category) >= POOR &&
      (day.worstHours.some(within) || aqi >= dayMean * 1.05)
    )
      kind = "stay_in";
    else kind = "careful";

    return { index, startHour, endHour, kind, aqi, category };
  });
}

/** The band containing an hour of the day (0 to 23). */
export const bandAt = (bands: readonly Band[], hour: number): Band | undefined =>
  bands.find((b) => hour >= b.startHour && hour < b.endHour);

/** The hour a recommended action is tied to, when it has one (opening windows, exercising). */
export function actionHour(action: Action): number | null {
  if (action.id !== "windows" && action.id !== "exercise") return null;
  const when = action.params.when;
  return typeof when === "number" ? when : null;
}
