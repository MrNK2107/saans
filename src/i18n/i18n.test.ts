import { describe, expect, it } from "vitest";
import { en } from "./en";
import { hi } from "./hi";
import { translate, translator } from "./index";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  it("English and Hindi have exactly the same keys", () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  });

  it("keep the same placeholders in every string", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(hi[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it("never leave a Hindi string empty or identical to English by accident", () => {
    const sameOk = new Set(["air.pm25", "air.aqi", "air.unit"]);
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(hi[key].trim().length, key).toBeGreaterThan(0);
      if (!sameOk.has(key)) expect(hi[key], key).not.toBe(en[key]);
    }
  });

  it("write Hindi in Devanagari", () => {
    expect(hi["home.cta"]).toMatch(/[ऀ-ॿ]/);
  });
});

describe("translate", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(translate("en", "air.title", { area: "Dwarka" })).toBe("Air in Dwarka today");
    expect(translate("en", "air.title")).toBe("Air in {area} today");
    expect(translator("hi")("air.title", { area: "द्वारका" })).toBe("आज द्वारका की हवा");
  });
});
