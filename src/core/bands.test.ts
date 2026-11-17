import { describe, expect, it } from "vitest";
import type { Action } from "./actions";
import { actionHour, bandAt, buildBands } from "./bands";
import { buildPlan } from "./plan";
import { sampleDay } from "./sample";
import { DEFAULT_PROFILE } from "./types";

const plan = buildPlan(DEFAULT_PROFILE, sampleDay("2026-11-17", 220));
const bands = buildBands(plan);

describe("buildBands", () => {
  it("cuts the day into eight three-hour bands that cover every hour once", () => {
    expect(bands).toHaveLength(8);
    expect(bands.map((b) => b.startHour)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
    for (let hour = 0; hour < 24; hour++) {
      expect(bands.filter((b) => hour >= b.startHour && hour < b.endHour)).toHaveLength(1);
    }
  });

  it("calls the night bands Sleep and the band with the cleanest hour Best", () => {
    expect(bands[0]?.kind).toBe("sleep");
    expect(bands[1]?.kind).toBe("sleep");
    expect(bands[7]?.kind).toBe("sleep");
    expect(bandAt(bands, plan.cleanestHour)?.kind).toBe("best");
  });

  it("marks a dirty band that holds one of the worst hours as Stay in", () => {
    const worstDaytime = plan.worstHours.find((h) => h >= 6 && h < 21);
    if (worstDaytime === undefined) return;
    const band = bandAt(bands, worstDaytime);
    if (band?.kind !== "best") expect(band?.kind).toBe("stay_in");
  });

  it("never calls a clean day's hours Stay in", () => {
    const clean = buildPlan(DEFAULT_PROFILE, sampleDay("2026-11-17", 20));
    expect(buildBands(clean).some((b) => b.kind === "stay_in")).toBe(false);
  });

  it("reports the average AQI of each band", () => {
    for (const band of bands) {
      const hours = plan.hourly.filter((h) => h.hour >= band.startHour && h.hour < band.endHour);
      const avg = hours.reduce((a, h) => a + h.aqi, 0) / hours.length;
      expect(band.aqi).toBe(Math.round(avg));
    }
  });
});

describe("actionHour", () => {
  const make = (id: Action["id"], when: string | number): Action => ({
    id,
    group: "indoor",
    cost: "free",
    impactPct: 5,
    co2Kg: null,
    params: { when },
  });
  it("returns the hour for timed actions only", () => {
    expect(actionHour(make("windows", 12))).toBe(12);
    expect(actionHour(make("exercise", 9))).toBe(9);
    expect(actionHour(make("windows", "closed"))).toBeNull();
    expect(actionHour(make("mask", 8))).toBeNull();
  });
});
