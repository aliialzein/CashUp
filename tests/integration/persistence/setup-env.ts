import { assertTestDatabase, defaultTestUrl } from './database-safety.cjs';

const connectionString = process.env.TEST_DATABASE_URL ?? defaultTestUrl;
assertTestDatabase(connectionString);
process.env.RUN_DB_TESTS = '1';
process.env.TEST_DATABASE_URL = connectionString;
process.env.DATABASE_URL = connectionString;
process.env.DIRECT_URL = connectionString;
