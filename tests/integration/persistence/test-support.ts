import { assertTestDatabase } from './database-safety.cjs';
import {
  createPrismaClient,
  UnitOfWork,
  type CreateSaleInput,
} from "../../../src/persistence";
import {
  Currency,
  MembershipRole,
  PaymentMethod,
  SaleStatus,
} from "../../../src/generated/prisma/enums";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error("TEST_DATABASE_URL must be set before loading persistence integration tests.");
}

assertTestDatabase(connectionString);

export const prisma = createPrismaClient(connectionString);
export const uow = new UnitOfWork(prisma);

export interface Members {
  owner: { id: string; userId: string };
  manager: { id: string; userId: string };
  staff1: { id: string; userId: string };
  staff2: { id: string; userId: string };
}

export interface BusinessFixture {
  id: string;
  name: string;
  members: Members;
}

export interface Fixtures {
  businessA: BusinessFixture;
  businessB: BusinessFixture;
  soloBusiness: BusinessFixture;
}

export async function resetDatabase(): Promise<void> {
  assertTestDatabase(connectionString!);
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "amendment_changes",
      "amendments",
      "requests",
      "count_entries",
      "cash_outs",
      "sale_edits",
      "sales",
      "cash_ups",
      "join_codes",
      "memberships",
      "password_reset_tokens",
      "audit_logs",
      "businesses",
      "users"
    RESTART IDENTITY CASCADE
  `);
}

async function createMembers(businessId: string, prefix: string): Promise<Members> {
  async function createMember(key: string, role: MembershipRole) {
    const user = await prisma.user.create({
      data: {
        email: `${prefix}-${key}@example.test`,
        fullName: `${prefix} ${key}`,
      },
    });
    const membership = await prisma.membership.create({
      data: { businessId, userId: user.id, role },
    });
    return { id: membership.id, userId: user.id };
  }

  return {
    owner: await createMember("owner", MembershipRole.OWNER),
    manager: await createMember("manager", MembershipRole.MANAGER),
    staff1: await createMember("staff1", MembershipRole.STAFF),
    staff2: await createMember("staff2", MembershipRole.STAFF),
  };
}

export async function seedBusinesses(): Promise<Fixtures> {
  const businessA = await prisma.business.create({ data: { name: "Business A" } });
  const businessB = await prisma.business.create({ data: { name: "Business B" } });
  const soloBusiness = await prisma.business.create({
    data: { name: "Solo Business", isSolo: true },
  });
  const soloOwnerUser = await prisma.user.create({
    data: { email: "solo-owner@example.test", fullName: "Solo Owner" },
  });
  const soloOwnerMembership = await prisma.membership.create({
    data: {
      businessId: soloBusiness.id,
      userId: soloOwnerUser.id,
      role: MembershipRole.OWNER,
    },
  });
  const soloOwner = { id: soloOwnerMembership.id, userId: soloOwnerUser.id };

  return {
    businessA: {
      id: businessA.id,
      name: businessA.name,
      members: await createMembers(businessA.id, "business-a"),
    },
    businessB: {
      id: businessB.id,
      name: businessB.name,
      members: await createMembers(businessB.id, "business-b"),
    },
    soloBusiness: {
      id: soloBusiness.id,
      name: soloBusiness.name,
      members: {
        owner: soloOwner,
        manager: soloOwner,
        staff1: soloOwner,
        staff2: soloOwner,
      },
    },
  };
}

export function makeSaleInput(
  cashUpId: string,
  overrides: Partial<CreateSaleInput> = {},
) {
  return {
    cashUpId,
    status: SaleStatus.DELIVERED,
    businessAmount: "10.00",
    deliveryFee: "0.00",
    totalCollected: "10.00",
    currency: Currency.USD,
    method: PaymentMethod.CASH,
    mixedChange: false,
    ...overrides,
  };
}
