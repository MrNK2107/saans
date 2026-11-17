import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE } from "@/core/types";
import { fromRecord, toRecord } from "./cloud";
import { hasSavedProfile, loadProfile, onProfileSaved, saveProfile } from "./local";

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
};

describe("local store", () => {
  it("round-trips a profile", () => {
    const s = memory();
    saveProfile({ ...DEFAULT_PROFILE, language: "hi" }, s);
    expect(loadProfile(s).language).toBe("hi");
    expect(hasSavedProfile(s)).toBe(true);
  });

  it("ignores tampered, malformed or missing data", () => {
    const s = memory();
    expect(loadProfile(s)).toEqual(DEFAULT_PROFILE);
    s.setItem("saans.profile.v1", "{not json");
    expect(loadProfile(s)).toEqual(DEFAULT_PROFILE);
    s.setItem("saans.profile.v1", JSON.stringify({ ...DEFAULT_PROFILE, locality: 5 }));
    expect(loadProfile(s)).toEqual(DEFAULT_PROFILE);
    expect(hasSavedProfile(memory())).toBe(false);
  });

  it("survives storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(loadProfile(broken)).toEqual(DEFAULT_PROFILE);
    expect(hasSavedProfile(broken)).toBe(false);
    expect(() => saveProfile(DEFAULT_PROFILE, broken)).not.toThrow();
  });

  it("tells listeners when a profile is saved", () => {
    const listener = vi.fn();
    const off = onProfileSaved(listener);
    saveProfile(DEFAULT_PROFILE, memory());
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    saveProfile(DEFAULT_PROFILE, memory());
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("cloud records", () => {
  it("wraps a profile for Firestore and reads it back", () => {
    const record = toRecord("u1", DEFAULT_PROFILE, new Date("2026-11-17T00:00:00Z"));
    expect(record.ownerId).toBe("u1");
    expect(record.updatedAt).toBe("2026-11-17T00:00:00.000Z");
    expect(fromRecord(record)).toEqual(DEFAULT_PROFILE);
  });

  it("rejects a record whose data does not validate", () => {
    expect(fromRecord({ data: { audience: "x" } })).toBeNull();
    expect(fromRecord(null)).toBeNull();
  });
});
