import "server-only";

import { createPrismaClient, UnitOfWork } from "../persistence";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: ReturnType<typeof createPrismaClient>;
};

let unitOfWork: UnitOfWork | undefined;

export function getPrismaClient(): ReturnType<typeof createPrismaClient> {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export function getUnitOfWork(): UnitOfWork {
  if (!unitOfWork) {
    unitOfWork = new UnitOfWork(getPrismaClient());
  }
  return unitOfWork;
}
