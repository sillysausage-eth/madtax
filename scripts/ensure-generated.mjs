#!/usr/bin/env node
/**
 * `predev` guard. Splits the bundle only when `src/data/generated/` is absent, so
 * starting the dev server on a cold checkout works without waiting for the 121
 * tie-outs on every restart. The full gate (`data:verify && data:split`) still
 * runs in `prebuild`, which is what CI and any deploy go through.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "data", "generated");

if (existsSync(OUT_DIR)) {
  process.exit(0);
}

console.log("ensure-generated: src/data/generated/ is missing — splitting the bundle");
execFileSync(process.execPath, [join(ROOT, "scripts", "split-bundle.mjs")], {
  stdio: "inherit",
});
