import type { Business, Membership, PrismaClient } from '../../generated/prisma/client';

export interface CreateBusinessWithOwnerInput {
  ownerUserId: string;
  name: string;
  isSolo: boolean;
}

export type CreateBusinessWithOwnerResult =
  | {
      status: 'created';
      business: Business;
      ownerMembership: Membership;
    }
  | { status: 'user_not_found' | 'user_already_belongs_to_a_business' };

export async function createBusinessWithOwner(
  prisma: PrismaClient,
  input: CreateBusinessWithOwnerInput,
): Promise<CreateBusinessWithOwnerResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "users" WHERE "id" = ${input.ownerUserId}::uuid FOR UPDATE
    `;
    if (user.length === 0) return { status: 'user_not_found' };

    const existingMembership = await tx.membership.findUnique({
      where: { userId: input.ownerUserId },
      select: { id: true },
    });
    if (existingMembership) return { status: 'user_already_belongs_to_a_business' };

    const business = await tx.business.create({
      data: { name: input.name, isSolo: input.isSolo },
    });
    const ownerMembership = await tx.membership.create({
      data: {
        businessId: business.id,
        userId: input.ownerUserId,
        role: 'OWNER',
      },
    });
    await tx.auditLog.createMany({
      data: [
        {
          businessId: business.id,
          actorId: input.ownerUserId,
          action: 'BUSINESS_CREATED',
          entityType: 'BUSINESS',
          entityId: business.id,
        },
        {
          businessId: business.id,
          actorId: input.ownerUserId,
          action: 'MEMBER_JOINED',
          entityType: 'MEMBERSHIP',
          entityId: ownerMembership.id,
          metadata: { role: 'OWNER' },
        },
      ],
    });

    return { status: 'created', business, ownerMembership };
  });
}
