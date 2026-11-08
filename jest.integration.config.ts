import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  clearMocks: true,
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/integration/**/*.int.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  maxWorkers: 1,
  setupFilesAfterEnv: ["<rootDir>/tests/support/integration-service-boundaries.ts"],
  extensionsToTreatAsEsm: [".ts"],
  // Coverage thresholds belong to the fast suite; this suite verifies real DB boundaries.
  collectCoverage: false,
  globalSetup: "<rootDir>/tests/integration/persistence/global-setup.ts",
  setupFiles: ["<rootDir>/tests/integration/persistence/setup-env.ts"],
};

export default createJestConfig(config);
