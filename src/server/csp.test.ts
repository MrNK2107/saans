import { describe, expect, it } from "vitest";
import { buildPolicy } from "./csp";

describe("buildPolicy", () => {
  const prod = buildPolicy("abc", { dev: false });

  it("allows scripts only by nonce in production", () => {
    expect(prod).toContain("'nonce-abc'");
    expect(prod).toContain("'strict-dynamic'");
    expect(prod).not.toContain("unsafe-inline");
    expect(prod).not.toContain("unsafe-eval");
  });

  it("lets Firebase sign-in reach its Google endpoints and nothing broader", () => {
    const connect = prod.split("; ").find((d) => d.startsWith("connect-src")) ?? "";
    expect(connect).toContain("https://apis.google.com");
    expect(connect).toContain("https://*.googleapis.com");
    expect(connect).not.toContain("*.google.com");
    expect(connect).not.toMatch(/ \*( |$)/);
  });

  it("blocks framing and plugins", () => {
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("object-src 'none'");
  });

  it("relaxes eval only in development", () => {
    expect(buildPolicy("abc", { dev: true })).toContain("'unsafe-eval'");
  });

  it("allows the Firebase auth domain to be framed for sign-in", () => {
    expect(buildPolicy("n", { dev: false, authDomain: "x.firebaseapp.com" })).toContain(
      "https://x.firebaseapp.com",
    );
  });
});
