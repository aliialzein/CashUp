import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  clearMocks: true,
  testEnvironment: "node",
  testMatch: ["**/*.int.test.ts", "<rootDir>/tests/unit/services/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  maxWorkers: 1,
  extensionsToTreatAsEsm: [".ts"],
  collectCoverage: true,
  collectCoverageFrom: ["src/services/**/*.ts"],
  coverageThreshold: {
    global: { lines: 0 },
    "./src/services": { lines: 90 },
  },
  globalSetup: "<rootDir>/tests/integration/persistence/global-setup.ts",
  setupFiles: ["<rootDir>/tests/integration/persistence/setup-env.ts"],
};

export default createJestConfig(config);
