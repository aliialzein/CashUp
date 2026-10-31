import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  clearMocks: true,
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "<rootDir>/tests/integration/"],
  coverageProvider: "v8",
  collectCoverage: true,
  coverageDirectory: "coverage",
};

export default createJestConfig(config);