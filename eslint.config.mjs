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
    "coverage/**",
    "src/generated/prisma/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: ["src/persistence/**", "src/lib/prisma.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/generated/prisma/**", "**/generated/prisma/**"],
              message: "Import Prisma generated client code only through src/persistence or src/lib/prisma.ts.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.{js,jsx,ts,tsx}", "src/validation/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/persistence",
                "@/persistence/**",
                "src/persistence",
                "src/persistence/**",
                "**/persistence",
                "**/persistence/**",
                "@/generated/prisma/**",
                "**/generated/prisma/**",
                "next",
                "next/**",
                "server-only",
                "node:*",
                "fs",
                "fs/**",
                "path",
                "path/**",
                "crypto",
                "crypto/**",
                "os",
                "os/**",
                "child_process",
                "child_process/**",
              ],
              message:
                "Domain and validation modules must remain portable and free of server-only dependencies.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
