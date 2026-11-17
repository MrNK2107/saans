#!/usr/bin/env node
// Copies Gemini keys from ~/.secrets/gemini.keys (one line, comma-separated) into .env.local, which is
// git-ignored. Never prints a key. Usage: node scripts/load-keys.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const source = join(homedir(), ".secrets", "gemini.keys");
const target = join(process.cwd(), ".env.local");

if (!existsSync(source)) {
  console.error(`No key file at ${source}. Put your keys there, comma-separated, on one line.`);
  process.exit(1);
}

const keys = [
  ...new Set(
    readFileSync(source, "utf8")
      .split(/[,\r\n]+/)
      .map((k) => k.trim())
      .filter(Boolean),
  ),
];
if (keys.length === 0) {
  console.error("The key file is empty.");
  process.exit(1);
}

const kept = existsSync(target)
  ? readFileSync(target, "utf8")
      .split(/\r?\n/)
      .filter(
        (line) => line && !line.startsWith("GEMINI_API_KEYS=") && !line.startsWith("AI_PROVIDER="),
      )
  : [];
writeFileSync(
  target,
  [...kept, "AI_PROVIDER=gemini", `GEMINI_API_KEYS=${keys.join(",")}`, ""].join("\n"),
);
console.log(`Wrote ${keys.length} Gemini key(s) to .env.local`);
