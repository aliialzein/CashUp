import "dotenv/config";

import { execFileSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

const defaultTestUrl = "postgresql://cashup_test:cashup_test@127.0.0.1:55432/cashup_test";

function assertTestDatabase(connectionString: string): void {
  const databaseName = decodeURIComponent(new URL(connectionString).pathname.slice(1));
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing integration tests: database name "${databaseName}" must contain "test".`,
    );
  }
}

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
  let connectionString = process.env.TEST_DATABASE_URL;

  if (!connectionString) {
    execFileSync(
      "docker",
      ["compose", "--file", "docker-compose.test.yml", "up", "--detach"],
      { cwd: process.cwd(), stdio: "inherit" },
    );
    connectionString = defaultTestUrl;
    process.env.TEST_DATABASE_URL = connectionString;
  }

  assertTestDatabase(connectionString);
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
