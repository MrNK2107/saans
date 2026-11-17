import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dayFor, liveDay, todayInDelhi } from "@/server/air";
import { DEFAULT_PROFILE } from "@/core/types";
import { POST as chat } from "./chat/route";
import { GET as health } from "./health/route";
import { POST as narrate } from "./narrate/route";
import { POST as plan } from "./plan/route";

const hours = (v: number | null) => Array.from({ length: 24 }, () => v);
const openMeteo = (pm25: (number | null)[], pm10: (number | null)[]) =>
  new Response(JSON.stringify({ hourly: { pm2_5: pm25, pm10 } }), { status: 200 });

const post = (body: unknown, ip = "1.1.1.1", type = "application/json") =>
  new Request("http://x/api", {
    method: "POST",
    headers: { "content-type": type, "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER", "mock");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("air data", () => {
  it("parses a live day and fills a missing hour from its neighbours", async () => {
    const pm = hours(100);
    pm[5] = null;
    pm[4] = 80;
    pm[6] = 120;
    const day = await liveDay("rohini", "2026-11-17", async () => openMeteo(pm, hours(150)));
    expect(day?.source).toBe("live");
    expect(day?.pm25[5]).toBe(100);
  });

  it("returns nothing for an unknown place, a failed call, or odd data", async () => {
    expect(await liveDay("atlantis", "2026-11-17")).toBeNull();
    expect(
      await liveDay("saket", "2026-11-18", async () => new Response("no", { status: 500 })),
    ).toBeNull();
    expect(
      await liveDay("saket", "2026-11-19", async () => new Response("{}", { status: 200 })),
    ).toBeNull();
    expect(
      await liveDay("saket", "2026-11-20", async () => openMeteo(hours(null), hours(null))),
    ).toBeNull();
    expect(
      await liveDay("saket", "2026-11-21", async () => {
        throw new Error("offline");
      }),
    ).toBeNull();
  });

  it("falls back to a labelled sample day", async () => {
    const day = await dayFor(
      "dwarka",
      "2026-11-22",
      async () => new Response("no", { status: 503 }),
    );
    expect(day.source).toBe("sample");
  });

  it("can be forced to the typical day for offline use", async () => {
    vi.stubEnv("AIR_SOURCE", "sample");
    const never = vi.fn();
    expect((await dayFor("saket", "2026-11-23", never)).source).toBe("sample");
    expect(never).not.toHaveBeenCalled();
  });

  it("reads today's date in Delhi, not the server's zone", () => {
    expect(todayInDelhi(new Date("2026-11-17T20:00:00Z"))).toBe("2026-11-18");
  });
});

describe("/api/plan", () => {
  it("returns the computed plan without waiting for any model", async () => {
    vi.stubGlobal("fetch", async () => openMeteo(hours(210), hours(380)));
    const res = await plan(post({ profile: { ...DEFAULT_PROFILE, locality: "okhla" } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.plan.source).toBe("live");
    expect(body.plan.actions.length).toBeGreaterThan(0);
    expect(body.narrative).toBeUndefined();
  });

  it("still answers, with a notice, when live data is down", async () => {
    vi.stubGlobal("fetch", async () => new Response("no", { status: 500 }));
    const body = await (
      await plan(post({ profile: { ...DEFAULT_PROFILE, locality: "ito" } }, "2.2.2.2"))
    ).json();
    expect(body.plan.source).toBe("sample");
    expect(body.notice).toMatch(/typical winter day/);
  });

  it("rejects wrong content types, bad JSON, invalid profiles and oversized bodies", async () => {
    expect((await plan(post("x", "4.4.4.4", "text/plain"))).status).toBe(415);
    expect((await plan(post("{oops", "4.4.4.4"))).status).toBe(400);
    const bad = await plan(post({ profile: { ...DEFAULT_PROFILE, locality: "" } }, "4.4.4.4"));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toContain("profile.locality");
    expect((await plan(post({ pad: "x".repeat(70_000) }, "4.4.4.4"))).status).toBe(413);
  });

  it("rate limits a noisy client", async () => {
    vi.stubGlobal("fetch", async () => new Response("no", { status: 500 }));
    let last = 200;
    for (let i = 0; i < 22; i++)
      last = (await plan(post({ profile: DEFAULT_PROFILE }, "9.9.9.9"))).status;
    expect(last).toBe(429);
  });
});

describe("/api/narrate", () => {
  it("puts the computed plan into words and remembers the answer", async () => {
    vi.stubGlobal("fetch", async () => new Response("no", { status: 500 }));
    const first = await (await narrate(post({ profile: DEFAULT_PROFILE }, "8.8.8.8"))).json();
    expect(first.ai).toBe("mock");
    expect(first.narrative.headline).toBeTruthy();
    expect(first.narrative.priorities.length).toBeGreaterThan(0);
    const again = await (await narrate(post({ profile: DEFAULT_PROFILE }, "8.8.8.8"))).json();
    expect(again).toEqual(first);
  });

  it("answers with no narrative when no AI is configured", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEYS", "");
    vi.stubEnv("OLLAMA_URL", "");
    const res = await narrate(post({ profile: DEFAULT_PROFILE }, "8.8.4.4"));
    expect(await res.json()).toEqual({ narrative: null, ai: null });
  });

  it("reports an unavailable model plainly", async () => {
    vi.stubEnv("AI_PROVIDER", "ollama");
    vi.stubEnv("OLLAMA_URL", "http://localhost:1");
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    const res = await narrate(
      post({ profile: { ...DEFAULT_PROFILE, locality: "saket" } }, "8.8.1.1"),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Ollama/);
  });

  it("validates its input and rate limits", async () => {
    expect((await narrate(post({ nope: 1 }, "8.8.2.2"))).status).toBe(400);
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OLLAMA_URL", "");
    let last = 200;
    for (let i = 0; i < 10; i++)
      last = (await narrate(post({ profile: DEFAULT_PROFILE }, "8.8.3.3"))).status;
    expect(last).toBe(429);
  });
});

describe("/api/chat", () => {
  const history = [{ role: "user", text: "Should I buy a purifier?" }];

  it("returns a reply and proposed changes in plain words", async () => {
    vi.stubGlobal("fetch", async () => new Response("no", { status: 500 }));
    const res = await chat(post({ profile: DEFAULT_PROFILE, history }, "5.5.5.5"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.changes[0].change).toEqual({ op: "set_purifier", level: "good" });
    expect(body.changes[0].text).toMatch(/purifier/i);
  });

  it("says so when no AI is set up", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEYS", "");
    vi.stubEnv("OLLAMA_URL", "");
    const res = await chat(post({ profile: DEFAULT_PROFILE, history }, "6.6.6.6"));
    expect(res.status).toBe(503);
  });

  it("validates the conversation", async () => {
    expect((await chat(post({ profile: DEFAULT_PROFILE, history: [] }, "7.7.7.7"))).status).toBe(
      400,
    );
    const long = [{ role: "user", text: "x".repeat(2000) }];
    expect((await chat(post({ profile: DEFAULT_PROFILE, history: long }, "7.7.7.7"))).status).toBe(
      400,
    );
  });
});

describe("/api/health", () => {
  it("reports liveness only", async () => {
    expect(await health().json()).toEqual({ ok: true });
  });
});
