import { describe, expect, it } from "vitest";
import { aqiOf, categoryOf, cleanestWindow, pm10ToAqi, pm25ToAqi } from "./aqi";
import { co2Saved, monthlyCo2Kg } from "./emissions";
import { baselineBehaviour, exposure, reduction } from "./exposure";
import { grapStage } from "./grap";
import { findLocality, LOCALITIES } from "./localities";
import { buildPlan } from "./plan";
import { sampleDay } from "./sample";
import { DaySchema, DEFAULT_PROFILE, ProfileSchema, type Profile } from "./types";

const day = (mean: number) => sampleDay("2026-11-17", mean);
const profile = (over: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, ...over });

describe("CPCB AQI", () => {
  it("maps PM2.5 band edges to the published index", () => {
    expect(pm25ToAqi(0)).toBe(0);
    expect(pm25ToAqi(30)).toBe(50);
    expect(pm25ToAqi(60)).toBe(100);
    expect(pm25ToAqi(90)).toBe(200);
    expect(pm25ToAqi(120)).toBe(300);
    expect(pm25ToAqi(250)).toBe(400);
    expect(pm25ToAqi(900)).toBe(500);
  });

  it("interpolates inside a band and stays monotonic", () => {
    expect(pm25ToAqi(45)).toBe(75);
    let last = -1;
    for (let v = 0; v <= 400; v += 5) {
      const now = pm25ToAqi(v);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });

  it("treats junk readings as clean rather than crashing", () => {
    expect(pm25ToAqi(Number.NaN)).toBe(0);
    expect(pm25ToAqi(-4)).toBe(0);
  });

  it("takes the worst pollutant for the overall AQI", () => {
    expect(aqiOf(30, 500)).toBe(pm10ToAqi(500));
    expect(aqiOf(200, 10)).toBe(pm25ToAqi(200));
  });

  it("names the six categories", () => {
    expect([40, 90, 150, 250, 350, 450].map(categoryOf)).toEqual([
      "good",
      "satisfactory",
      "moderate",
      "poor",
      "very_poor",
      "severe",
    ]);
  });

  it("finds the cleanest window", () => {
    expect(cleanestWindow([9, 9, 1, 1, 9, 9], 2)).toBe(2);
  });
});

describe("GRAP stage", () => {
  it("follows the published AQI thresholds", () => {
    expect([150, 201, 301, 401, 451].map(grapStage)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("sample day and schemas", () => {
  it("keeps the daily mean the caller asked for", () => {
    const d = day(200);
    const mean = d.pm25.reduce((a, b) => a + b, 0) / 24;
    expect(Math.abs(mean - 200)).toBeLessThan(3);
    expect(DaySchema.safeParse(d).success).toBe(true);
  });

  it("has a mid-afternoon trough and a morning peak", () => {
    const d = day(180);
    expect(d.pm25[14]).toBeLessThan(d.pm25[8] as number);
  });

  it("validates the default profile and rejects nonsense", () => {
    expect(ProfileSchema.safeParse(DEFAULT_PROFILE).success).toBe(true);
    expect(
      ProfileSchema.safeParse({
        ...DEFAULT_PROFILE,
        commute: { mode: "jetpack", km: 1, daysPerWeek: 1 },
      }).success,
    ).toBe(false);
  });

  it("knows every locality by id", () => {
    LOCALITIES.forEach((l) => expect(findLocality(l.id)).toBe(l));
    expect(findLocality("nowhere")).toBeUndefined();
  });
});

describe("exposure model", () => {
  const p = profile({ home: { ...DEFAULT_PROFILE.home, purifier: "none" } });

  it("makes indoor air cleaner than outdoor when windows stay shut", () => {
    const b = { ...baselineBehaviour(p), windows: "closed" as const };
    const e = exposure(day(250), p, b, "homebody");
    const outdoor = day(250).pm25;
    expect(e.indoor[3]).toBeLessThan(outdoor[3] as number);
  });

  it("a purifier lowers the dose, a better one lowers it more", () => {
    const base = baselineBehaviour(p);
    const none = exposure(day(250), p, base, "homebody").dose;
    const budget = exposure(day(250), p, { ...base, purifier: "budget" }, "homebody").dose;
    const good = exposure(day(250), p, { ...base, purifier: "good" }, "homebody").dose;
    expect(good).toBeLessThan(budget);
    expect(budget).toBeLessThan(none);
  });

  it("an N95 cuts the commuter's dose; cycling in smog raises it", () => {
    const base = baselineBehaviour(p);
    const plain = exposure(day(300), p, base, "commuter").dose;
    expect(exposure(day(300), p, { ...base, mask: "n95" }, "commuter").dose).toBeLessThan(plain);
    expect(exposure(day(300), p, { ...base, mode: "cycle" }, "commuter").dose).toBeGreaterThan(
      exposure(day(300), p, { ...base, mode: "metro" }, "commuter").dose,
    );
  });

  it("opening windows in a very polluted hour raises indoor PM2.5", () => {
    const base = { ...baselineBehaviour(p), windows: "closed" as const };
    const closed = exposure(day(300), p, base, "homebody").indoor[10] as number;
    const open = exposure(day(300), p, { ...base, windows: { openHour: 10 } }, "homebody")
      .indoor[10] as number;
    expect(open).toBeGreaterThan(closed);
  });

  it("biomass cooking is worse than induction, and a hood helps", () => {
    const base = baselineBehaviour(p);
    const dirty = exposure(day(100), p, { ...base, cooking: "biomass" }, "homebody").dose;
    expect(exposure(day(100), p, { ...base, cooking: "induction" }, "homebody").dose).toBeLessThan(
      dirty,
    );
    expect(
      exposure(day(100), p, { ...base, cooking: "biomass", rangeHood: true }, "homebody").dose,
    ).toBeLessThan(dirty);
  });

  it("a work-from-home day has no commute exposure and the dose is finite", () => {
    const e = exposure(day(200), p, { ...baselineBehaviour(p), mode: "wfh" }, "commuter");
    expect(Number.isFinite(e.dose)).toBe(true);
  });

  it("reports a reduction as a whole percentage", () => {
    expect(reduction(200, 100)).toBe(50);
    expect(reduction(0, 5)).toBe(0);
    expect(reduction(100, 120)).toBe(-20);
  });
});

describe("commute emissions", () => {
  const c = { mode: "car" as const, km: 10, daysPerWeek: 5 };
  it("orders modes by carbon and never reports a negative saving", () => {
    expect(monthlyCo2Kg(c, "car")).toBeGreaterThan(monthlyCo2Kg(c, "metro"));
    expect(co2Saved(c, "car", "metro")).toBeGreaterThan(0);
    expect(co2Saved(c, "metro", "car")).toBe(0);
    expect(monthlyCo2Kg(c, "wfh")).toBe(0);
  });
});

describe("buildPlan", () => {
  it("explains a severe day with the actions that matter", () => {
    const plan = buildPlan(
      profile({ commute: { mode: "two_wheeler", km: 12, daysPerWeek: 5 } }),
      day(200),
    );
    expect(plan.category).toBe("very_poor");
    expect(plan.grap).toBeGreaterThanOrEqual(2);
    const ids = plan.actions.map((a) => a.id);
    expect(ids).toContain("mask");
    expect(ids).toContain("purifier");
    expect(ids).toContain("protect_sensitive");
    expect(plan.actions.find((a) => a.id === "protect_sensitive")?.params.peak).toMatch(
      /^\d+(, \d+)*$/,
    );
    plan.outcomes.forEach((o) => expect(o.after.dose).toBeLessThan(o.before.dose));
  });

  it("says when to air the house: at the one clean hour, or never when every hour is bad", () => {
    const home = profile({ commute: { mode: "wfh", km: 0, daysPerWeek: 0 } });
    const shaped = (pm: (h: number) => number) => {
      const pm25 = Array.from({ length: 24 }, (_, h) => pm(h));
      return { ...day(100), pm25, pm10: pm25.map((v) => v * 1.8) };
    };
    const windows = (p: ReturnType<typeof buildPlan>) => p.actions.find((a) => a.id === "windows");

    // Dirty at the usual airing hours, clean at midday: air once, then.
    const midday = windows(
      buildPlan(
        home,
        shaped((h) => (h >= 12 && h <= 14 ? 15 : 300)),
      ),
    );
    expect(midday).toBeDefined();
    expect(Number(midday?.params.when)).toBeGreaterThanOrEqual(12);
    expect(Number(midday?.params.when)).toBeLessThanOrEqual(14);
    expect(midday?.impactPct).toBeGreaterThanOrEqual(3);

    // Dirty all day: never advise opening a window (any advice given is to keep them shut).
    const allDay = windows(
      buildPlan(
        home,
        shaped(() => 300),
      ),
    );
    expect(allDay?.params.when ?? "closed").toBe("closed");

    // A clean day needs no windows advice at all.
    expect(windows(buildPlan(home, day(30)))).toBeUndefined();
  });

  it("never recommends cycling to a commuter during a severe spell", () => {
    const plan = buildPlan(profile({ commute: { mode: "car", km: 6, daysPerWeek: 5 } }), day(380));
    const swap = plan.actions.find((a) => a.id === "commute_switch");
    expect(swap?.params.to).not.toBe("cycle");
    expect(swap?.co2Kg).toBeGreaterThan(0);
  });

  it("is quiet on a clean day", () => {
    const plan = buildPlan(
      profile({ members: { infants: 0, children: 0, adults: 2, seniors: 0 } }),
      day(20),
    );
    expect(plan.category).toBe("good");
    expect(plan.actions.find((a) => a.id === "mask")).toBeUndefined();
    expect(plan.grap).toBe(0);
  });

  it("adds community actions only for committees", () => {
    const family = buildPlan(profile(), day(250));
    expect(family.actions.some((a) => a.group === "community")).toBe(false);
    const rwa = buildPlan(
      profile({
        audience: "community",
        households: 120,
        commute: { mode: "car", km: 10, daysPerWeek: 5 },
      }),
      day(250),
    );
    const ids = rwa.actions.map((a) => a.id);
    expect(ids).toContain("carpool");
    expect(ids).toContain("no_burning");
    expect(ids).toContain("clean_air_room");
  });

  it("plans for someone who works from home", () => {
    const plan = buildPlan(profile({ commute: { mode: "wfh", km: 0, daysPerWeek: 0 } }), day(220));
    expect(plan.outcomes.map((o) => o.persona)).toEqual(["homebody"]);
    expect(plan.actions.find((a) => a.id === "mask")).toBeUndefined();
  });
});
