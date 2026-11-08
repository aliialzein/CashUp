import "dotenv/config";

import { execFileSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

import { assertTestDatabase, defaultTestUrl } from './database-safety.cjs';

async function waitForDatabase(connectionString: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw new Error("Timed out waiting for the integration-test PostgreSQL database.", {
    cause: lastError,
  });
}

export default async function globalSetup(): Promise<void> {
  process.env.RUN_DB_TESTS = "1";
  let connectionString = process.env.TEST_DATABASE_URL;

  if (!connectionString) {
    try {
      execFileSync(
        "docker",
        ["compose", "--file", "docker-compose.test.yml", "up", "--detach"],
        { cwd: process.cwd(), stdio: "inherit" },
      );
    } catch (error) {
      throw new Error("Integration tests require Docker with a running daemon, or the disposable PostgreSQL service configured via TEST_DATABASE_URL.", { cause: error });
    }
    connectionString = defaultTestUrl;
    process.env.TEST_DATABASE_URL = connectionString;
  }

  assertTestDatabase(connectionString);
  process.env.TEST_DATABASE_URL = connectionString;
  await waitForDatabase(connectionString);

  const env = {
    ...process.env,
    DATABASE_URL: connectionString,
    DIRECT_URL: connectionString,
    TEST_DATABASE_URL: connectionString,
  };
  execFileSync(
    process.execPath,
    [
      path.join(process.cwd(), "node_modules", "prisma", "build", "index.js"),
      "migrate",
      "deploy",
      "--config",
      "prisma7.config.ts",
    ],
    { cwd: process.cwd(), env, stdio: "inherit" },
  );
}
