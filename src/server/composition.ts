import { createPrismaClient, UnitOfWork } from '../persistence';
import { createServices } from '../services/container';
import { DevHeaderSessionProvider, InMemoryIdempotencyStore } from '../http';
import type { HttpDependencies } from '../http';
import logger from '../lib/logger';

declare global {
  var __cashUpHttpDependencies: HttpDependencies | undefined;
  var __cashUpPrismaClient: ReturnType<typeof createPrismaClient> | undefined;
}

function createHttpDependencies(): HttpDependencies {
  const prisma = globalThis.__cashUpPrismaClient ?? createPrismaClient();
  globalThis.__cashUpPrismaClient = prisma;
  const services = createServices(new UnitOfWork(prisma));

  return {
    sessionProvider: new DevHeaderSessionProvider(),
    actorResolver: services.actorResolver,
    businessSetup: services.businessSetup,
    lifecycle: services.lifecycle,
    sales: services.sales,
    cashOuts: services.cashOuts,
    counts: services.counts,
    queries: services.queries,
    idempotencyStore: new InMemoryIdempotencyStore(),
    reportInternalError: (details) => {
      logger.error('Unhandled HTTP request error', details);
    },
  };
}

export function getHttpDeps(): HttpDependencies {
  if (!globalThis.__cashUpHttpDependencies) {
    globalThis.__cashUpHttpDependencies = createHttpDependencies();
  }
  return globalThis.__cashUpHttpDependencies;
}

export async function closeHttpDeps(): Promise<void> {
  const prisma = globalThis.__cashUpPrismaClient;
  globalThis.__cashUpHttpDependencies = undefined;
  globalThis.__cashUpPrismaClient = undefined;
  if (prisma) await prisma.$disconnect();
}
