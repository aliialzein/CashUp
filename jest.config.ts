import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/tests/support/unit-service-boundaries.ts"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "<rootDir>/tests/integration/"],
  coverageProvider: "v8",
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/domain/**/*.ts",
    "src/modules/**/*.service.ts",
    "src/modules/**/*.mapper.ts",
    "src/modules/**/*.validation.ts",
    "src/modules/cash-ups/cash-ups.workflow.ts",
    "src/shared/errors/**/*.ts",
    "src/shared/validation/**/*.ts",
  ],
  coverageThreshold: {
    global: { lines: 0, branches: 0 },
    "./src/modules/**/*.service.ts": { lines: 90 },
    "./src/domain": { lines: 95, branches: 95 },
    "./src/modules/**/*.validation.ts": { lines: 95, branches: 95 },
    "./src/shared/validation": { lines: 95, branches: 95 },
  },
};

export default createJestConfig(config);
