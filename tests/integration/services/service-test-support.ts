import { createServices } from '../../../src/services';
import type { Actor } from '../../../src/services';
import {
  prisma,
  resetDatabase,
  seedBusinesses,
  uow,
  type BusinessFixture,
} from '../persistence/test-support';

export { prisma, resetDatabase, seedBusinesses, uow };
export const services = createServices(uow);

export async function staffActor(business: BusinessFixture, staff = 1) {
  const member = staff === 1 ? business.members.staff1 : business.members.staff2;
  return services.actorResolver.resolve(member.userId, business.id);
}

export async function managerActor(business: BusinessFixture) {
  return services.actorResolver.resolve(
    business.members.manager.userId,
    business.id,
  );
}

export async function ownerActor(business: BusinessFixture) {
  return services.actorResolver.resolve(business.members.owner.userId, business.id);
}

export async function openEmptyCashUp(
  business: BusinessFixture,
  actor?: Actor,
) {
  return services.lifecycle.open(actor ?? (await staffActor(business)), {});
}
