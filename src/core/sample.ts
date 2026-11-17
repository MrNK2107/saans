import type { Day } from "./types";

/**
 * Shape of a typical Delhi winter day: pollution builds overnight under the inversion, peaks in the
 * morning and late evening, and falls to a trough in the mid-afternoon once the air mixes upward.
 */
const SHAPE = [
  1.15, 1.15, 1.2, 1.2, 1.2, 1.2, 1.25, 1.3, 1.3, 1.2, 1.05, 0.9, 0.8, 0.7, 0.65, 0.65, 0.7, 0.85,
  1.0, 1.15, 1.25, 1.3, 1.25, 1.2,
];
const MEAN_SHAPE = SHAPE.reduce((a, b) => a + b, 0) / SHAPE.length;

/** A labelled stand-in day, used only when live data cannot be reached. `meanPm25` is the day's mean. */
export function sampleDay(date: string, meanPm25 = 180): Day {
  const pm25 = SHAPE.map((s) => Math.round((meanPm25 * s) / MEAN_SHAPE));
  return { date, pm25, pm10: pm25.map((v) => Math.round(v * 1.8)), source: "sample" };
}
