import "dotenv/config";

if (!process.env.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL =
    "postgresql://cashup_test:cashup_test@127.0.0.1:55432/cashup_test";
}
