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
  collectCoverageFrom: [
    "src/domain/**/*.ts",
    "src/http/**/*.ts",
    "src/services/**/*.ts",
    "src/validation/**/*.ts",
  ],
  coverageThreshold: {
    global: { lines: 0, branches: 0 },
    "./src/services": { lines: 90 },
    "./src/domain": { lines: 95, branches: 95 },
    "./src/validation": { lines: 95, branches: 95 },
  },
};

export default createJestConfig(config);