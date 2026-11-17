import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKIP = new Set([
  "node_modules",
  ".next",
  "coverage",
  "test-results",
  "playwright-report",
  ".git",
]);

function filesUnder(...roots: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(path.replace(/\\/g, "/"));
    }
  };
  roots.forEach((r) => existsSync(r) && walk(r));
  return out;
}

const read = (path: string) => readFileSync(path, "utf8");
const source = filesUnder("src").filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("/quality/"));
const production = source.filter((f) => !/\.test\.tsx?$/.test(f));

describe("repository hygiene", () => {
  it("ships the documents a reviewer expects", () => {
    for (const doc of [
      "README.md",
      "LICENSE",
      "SECURITY.md",
      "CONTRIBUTING.md",
      "PRODUCT.md",
      ".env.example",
      ".editorconfig",
      "vercel.json",
      "firestore.rules",
      "docs/ARCHITECTURE.md",
      "docs/ACCESSIBILITY.md",
      "docs/TESTING.md",
      "docs/MODEL.md",
      "docs/DEPLOYMENT.md",
      ".github/workflows/ci.yml",
    ]) {
      expect(existsSync(doc), `missing ${doc}`).toBe(true);
    }
  });

  it("has no any, ts-ignore or ts-nocheck in source", () => {
    for (const file of source) {
      const text = read(file);
      const code = text
        .split("\n")
        .filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//"))
        .join("\n");
      expect(code, file).not.toMatch(/:\s*any\b|as any\b|<any>/);
      expect(text, file).not.toMatch(/@ts-ignore|@ts-nocheck/);
    }
  });

  it("leaves no console output, eval or debugger in production code", () => {
    for (const file of production) {
      const text = read(file);
      expect(text, file).not.toMatch(/console\.(log|debug|info|warn|error)\(/);
      expect(text, file).not.toMatch(/\beval\(|new Function\(|\bdebugger\b/);
    }
  });

  it("keeps every source file readable in length", () => {
    for (const file of production) {
      expect(read(file).split("\n").length, file).toBeLessThanOrEqual(400);
    }
  });

  it("uses no inline styles or dangerouslySetInnerHTML, which the strict CSP would block", () => {
    for (const file of production.filter((f) => f.endsWith(".tsx"))) {
      const text = read(file);
      expect(text, file).not.toMatch(/\bstyle=\{/);
      expect(text, file).not.toMatch(/dangerouslySetInnerHTML/);
    }
  });

  it("reads API keys only on the server", () => {
    for (const file of production) {
      const uses = /GEMINI_API_KEY/.test(read(file));
      if (uses)
        expect(file, "key read outside the server/ai layers").toMatch(
          /src\/(ai|app\/api|server)\//,
        );
      if (file.endsWith(".tsx"))
        expect(read(file), file).not.toMatch(/process\.env\.(?!NEXT_PUBLIC_)/);
    }
  });

  it("commits no secrets or env files", () => {
    const all = filesUnder(".", "src", "docs", "scripts", "e2e", "rules").filter(
      (f) => !f.includes("package-lock.json"),
    );
    const envFiles = all.filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".env.example"));
    const tracked = process.env.CI ? envFiles : []; // a local, git-ignored .env.local is expected
    expect(tracked).toEqual([]);
    for (const file of all.filter((f) => /\.(ts|tsx|mjs|md|json|yml|css)$/.test(f))) {
      expect(read(file), file).not.toMatch(/AIza[0-9A-Za-z_-]{30,}/);
    }
    expect(read(".gitignore")).toMatch(/\.env\*/);
  });

  it("keeps the repository small enough to submit", () => {
    const bytes = filesUnder("src", "docs", "e2e", "rules", "scripts").reduce(
      (sum, f) => sum + statSync(f).size,
      0,
    );
    expect(bytes).toBeLessThan(2_000_000);
  });
});
