import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Read-only territory. The pipeline and the prototype are the reference
    // implementations this app is ported from; they are plain Node/browser
    // scripts and are not held to the app's TypeScript rules.
    "pipeline/**",
    "prototype/**",
    "data/**",
    // Emitted by scripts/split-bundle.mjs.
    "src/data/generated/**",
  ]),
]);

export default eslintConfig;
