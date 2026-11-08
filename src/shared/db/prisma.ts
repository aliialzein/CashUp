import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
/**
 * Prisma 7 needs a driver adapter. Use the POOLED Supabase URL (DATABASE_URL) here;
 * migrations use the direct URL via prisma.config.ts.
 */
export function createPrismaClient(connectionString: string | undefined = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
declare global {
  var __cashUpPrismaClient: PrismaClient | undefined;
}
/** One lazy runtime client/pool shared by services, repositories and HTTP adapters. */
export function getPrisma(): PrismaClient {
  return globalThis.__cashUpPrismaClient ??= createPrismaClient();
}
export async function closePrisma(): Promise<void> {
  const client = globalThis.__cashUpPrismaClient;
  globalThis.__cashUpPrismaClient = undefined;
  if (client)
    await client.$disconnect();
}
