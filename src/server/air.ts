import { z } from "zod";
import { findLocality } from "@/core/localities";
import { sampleDay } from "@/core/sample";
import { DaySchema, type Day } from "@/core/types";
import { createMemo } from "./memo";

const Hourly = z.object({
  hourly: z.object({
    pm2_5: z.array(z.number().nullable()).length(24),
    pm10: z.array(z.number().nullable()).length(24),
  }),
});

type Fetcher = typeof fetch;

/** Today's date in Delhi, whatever timezone the server runs in. */
export function todayInDelhi(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Fills the odd missing hour from its neighbours so one gap doesn't discard a whole live day. */
function fillGaps(values: (number | null)[]): number[] | null {
  if (values.every((v) => v === null)) return null;
  const known = (x: number | null | undefined): x is number => typeof x === "number";
  return values.map((v, i) => {
    if (v !== null) return v;
    const before = values.slice(0, i).reverse().find(known);
    const after = values.slice(i + 1).find(known);
    if (before !== undefined && after !== undefined) return (before + after) / 2;
    return before ?? after ?? 0;
  });
}

const cache = createMemo<Day>({ ttlMs: 15 * 60_000, max: 100 });

/**
 * Hourly PM2.5 and PM10 for today at a locality, from Open-Meteo's CAMS-based air quality model
 * (no key, CC BY 4.0). Returns null when the service can't be reached or answers oddly.
 */
export async function liveDay(
  localityId: string,
  date: string,
  fetcher: Fetcher = fetch,
): Promise<Day | null> {
  const place = findLocality(localityId);
  if (!place) return null;
  const key = `${place.id}|${date}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${place.lat}&longitude=${place.lon}&hourly=pm2_5,pm10` +
    `&timezone=Asia%2FKolkata&start_date=${date}&end_date=${date}`;
  try {
    const res = await fetcher(url, { signal: AbortSignal.timeout(6_000) });
    if (!res.ok) return null;
    const parsed = Hourly.safeParse(await res.json());
    if (!parsed.success) return null;
    const pm25 = fillGaps(parsed.data.hourly.pm2_5);
    const pm10 = fillGaps(parsed.data.hourly.pm10);
    if (!pm25 || !pm10) return null;
    const day = DaySchema.safeParse({ date, pm25, pm10, source: "live" });
    if (!day.success) return null;
    cache.set(key, day.data);
    return day.data;
  } catch {
    return null;
  }
}

/** Live data when available; otherwise a clearly labelled typical winter day. */
export async function dayFor(localityId: string, date: string, fetcher?: Fetcher): Promise<Day> {
  return (await liveDay(localityId, date, fetcher)) ?? sampleDay(date);
}
