import { describe, expect, it } from "vitest";
import { ACTION_IDS, type Action } from "./actions";
import { CATEGORY_LABEL, GRAP_LABEL, describeAction, impactChips } from "./catalog";
import { applyChange, ChangeSchema, describeChange } from "./changes";
import { CATEGORIES, DEFAULT_PROFILE, LANGS, MODES, PURIFIERS, COOKING } from "./types";

const make = (id: Action["id"], over: Partial<Action> = {}): Action => ({
  id,
  group: "routine",
  cost: "free",
  impactPct: 12,
  co2Kg: 4.5,
  params: {
    when: 14,
    to: "metro",
    from: "car",
    peak: "7, 8, 21",
    n: 120,
    joined: 36,
    owned: "none",
  },
  ...over,
});

describe("advice catalog", () => {
  it("has real English and Hindi text for every action", () => {
    for (const id of ACTION_IDS) {
      for (const lang of LANGS) {
        const { title, body } = describeAction(make(id), lang);
        expect(title.length, `${id} ${lang} title`).toBeGreaterThan(8);
        expect(body.length, `${id} ${lang} body`).toBeGreaterThan(30);
        expect(`${title}${body}`).not.toMatch(/undefined|\[object|NaN/);
      }
    }
  });

  it("writes Hindi in Devanagari", () => {
    for (const id of ACTION_IDS) {
      expect(describeAction(make(id), "hi").title).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("covers both branches of the windows, exercise, fuel and mask advice", () => {
    expect(describeAction(make("windows", { params: { when: "closed" } }), "en").title).toMatch(
      /shut/,
    );
    expect(describeAction(make("windows", { params: { when: 13 } }), "en").title).toMatch(/13:00/);
    expect(describeAction(make("exercise", { params: { when: "indoors" } }), "en").title).toMatch(
      /indoors/,
    );
    expect(describeAction(make("exercise", { params: { when: 15 } }), "hi").title).toMatch(/15:00/);
    expect(describeAction(make("cooking_fuel", { params: { to: "lpg" } }), "en").title).toMatch(
      /LPG/,
    );
    expect(
      describeAction(make("cooking_fuel", { params: { to: "induction" } }), "hi").title,
    ).toMatch(/इंडक्शन/);
    expect(describeAction(make("mask", { params: { open: 1 } }), "en").body).toMatch(/open air/);
    expect(describeAction(make("mask", { params: { open: 0 } }), "hi").body).toMatch(/बंद/);
  });

  it("names travel modes in words, not ids", () => {
    const { title } = describeAction(make("commute_switch"), "en");
    expect(title).toBe("Travel by metro instead of car");
  });

  it("builds impact chips only from real numbers", () => {
    expect(impactChips(make("mask"), "en")).toEqual([
      "about 12% less PM2.5 breathed in a day",
      "4.5 kg less CO2 a month",
    ]);
    expect(impactChips(make("mask", { impactPct: null, co2Kg: null }), "en")).toEqual([]);
    expect(impactChips(make("mask", { impactPct: -3, co2Kg: 0 }), "hi")).toEqual([]);
    expect(impactChips(make("mask"), "hi")[0]).toMatch(/PM2.5/);
  });

  it("labels every category and GRAP stage in both languages", () => {
    for (const c of CATEGORIES) for (const l of LANGS) expect(CATEGORY_LABEL[c][l]).toBeTruthy();
    for (const stage of [0, 1, 2, 3, 4])
      for (const l of LANGS) expect(GRAP_LABEL[stage]?.[l]).toBeTruthy();
  });
});

describe("changes", () => {
  it("applies each allowed change and re-validates the profile", () => {
    const p = DEFAULT_PROFILE;
    expect(applyChange(p, { op: "set_purifier", level: "good" })?.home.purifier).toBe("good");
    expect(applyChange(p, { op: "set_cooking", fuel: "induction" })?.home.cooking).toBe(
      "induction",
    );
    expect(applyChange(p, { op: "set_range_hood", value: true })?.home.rangeHood).toBe(true);
    expect(
      applyChange(p, { op: "set_outdoor_exercise", value: false })?.lifestyle.outdoorExercise,
    ).toBe(false);
    expect(applyChange(p, { op: "set_locality", id: "dwarka" })?.locality).toBe("dwarka");
  });

  it("keeps the commute consistent when switching to or from working at home", () => {
    const wfh = applyChange(DEFAULT_PROFILE, { op: "set_commute_mode", mode: "wfh" });
    expect(wfh?.commute).toMatchObject({ mode: "wfh", daysPerWeek: 0 });
    const back = applyChange(wfh!, { op: "set_commute_mode", mode: "metro" });
    expect(back?.commute).toMatchObject({ mode: "metro", daysPerWeek: 5 });
  });

  it("refuses an unknown locality and never mutates the original", () => {
    expect(applyChange(DEFAULT_PROFILE, { op: "set_locality", id: "atlantis" })).toBeNull();
    applyChange(DEFAULT_PROFILE, { op: "set_purifier", level: "good" });
    expect(DEFAULT_PROFILE.home.purifier).toBe("none");
  });

  it("describes every change in both languages", () => {
    const changes = [
      ...MODES.map((mode) => ({ op: "set_commute_mode", mode }) as const),
      ...PURIFIERS.map((level) => ({ op: "set_purifier", level }) as const),
      ...COOKING.map((fuel) => ({ op: "set_cooking", fuel }) as const),
      { op: "set_range_hood", value: true } as const,
      { op: "set_range_hood", value: false } as const,
      { op: "set_outdoor_exercise", value: true } as const,
      { op: "set_outdoor_exercise", value: false } as const,
      { op: "set_locality", id: "saket" } as const,
      { op: "set_locality", id: "unknown-place" } as const,
    ];
    for (const change of changes) {
      expect(ChangeSchema.safeParse(change).success).toBe(true);
      for (const lang of LANGS) expect(describeChange(change, lang).length).toBeGreaterThan(5);
    }
    expect(describeChange({ op: "set_locality", id: "saket" }, "en")).toBe("Switch area to Saket");
  });

  it("rejects changes outside the allow-list", () => {
    expect(ChangeSchema.safeParse({ op: "delete_account" }).success).toBe(false);
    expect(ChangeSchema.safeParse({ op: "set_purifier", level: "huge" }).success).toBe(false);
  });
});
