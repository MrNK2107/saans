import type { Category } from "./types";

/** [concentration low, high, index low, high] bands from the CPCB National AQI (µg/m³). */
type Band = readonly [number, number, number, number];

const PM25_BANDS: readonly Band[] = [
  [0, 30, 0, 50],
  [31, 60, 51, 100],
  [61, 90, 101, 200],
  [91, 120, 201, 300],
  [121, 250, 301, 400],
  [251, 380, 401, 500],
];

const PM10_BANDS: readonly Band[] = [
  [0, 50, 0, 50],
  [51, 100, 51, 100],
  [101, 250, 101, 200],
  [251, 350, 201, 300],
  [351, 430, 301, 400],
  [431, 510, 401, 500],
];

function subIndex(value: number, bands: readonly Band[]): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const last = bands[bands.length - 1] as Band;
  if (value >= last[1]) return last[3];
  // Values between two bands (e.g. 30.5) belong to the upper band's start.
  const band = bands.find(([, hi]) => value <= hi) ?? last;
  const [bLo, bHi, iLo, iHi] = band;
  const v = Math.max(value, bLo);
  return Math.round(((iHi - iLo) / (bHi - bLo)) * (v - bLo) + iLo);
}

export const pm25ToAqi = (pm25: number) => subIndex(pm25, PM25_BANDS);
export const pm10ToAqi = (pm10: number) => subIndex(pm10, PM10_BANDS);

/** The overall AQI is the worst of the pollutant sub-indices, as CPCB defines it. */
export function aqiOf(pm25: number, pm10: number): number {
  return Math.max(pm25ToAqi(pm25), pm10ToAqi(pm10));
}

export function categoryOf(aqi: number): Category {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "satisfactory";
  if (aqi <= 200) return "moderate";
  if (aqi <= 300) return "poor";
  if (aqi <= 400) return "very_poor";
  return "severe";
}

/** Category a PM2.5 concentration alone would fall into; used to explain changes in plain words. */
export const categoryOfPm25 = (pm25: number): Category => categoryOf(pm25ToAqi(pm25));

/** Starting hour of the `width` consecutive hours with the lowest mean. */
export function cleanestWindow(series: readonly number[], width: number): number {
  let best = 0;
  let bestMean = Infinity;
  for (let start = 0; start + width <= series.length; start++) {
    const mean = series.slice(start, start + width).reduce((a, b) => a + b, 0) / width;
    if (mean < bestMean) {
      bestMean = mean;
      best = start;
    }
  }
  return best;
}
