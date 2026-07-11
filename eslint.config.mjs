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
    // Vendored minified PDF.js worker; lint the source package, not its build artifact.
    "public/pdf.worker.min.mjs",
    // Decompiled Gojek APK used only for template reverse-engineering; not
    // project source and gitignored. Skip so its minified JS doesn't pollute lint.
    "apk/**",
  ]),
]);

export default eslintConfig;
