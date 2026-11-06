import { Prisma } from '../../generated/prisma/client';
import type { Membership } from '../../generated/prisma/client';
import {
  AuditAction,
  AuditEntityType,
  MembershipRole,
} from '../../generated/prisma/enums';
import { TenantRepository } from '../base.repository';
import { AuditRepository } from './audit.repository';
import { MembershipRepository } from './membership.repository';

export interface CreateJoinCodeInput {
  codeHash: string;
  createdByUserId: string;
  expiresAt: Date;
  maxUses: number;
}

export interface JoinCodeView {
  id: string;
  expiresAt: Date;
  maxUses: number;
  usedCount: number;
  revokedAt: Date | null;
  createdAt: Date;
}

export type RedeemJoinCodeResult =
  | { status: 'redeemed'; joinCodeId: string; member: Membership }
  | {
      status:
        | 'not_found'
        | 'revoked'
        | 'expired'
        | 'max_uses_reached'
        | 'user_not_found'
        | 'user_already_belongs_to_a_business'
        | 'usage_update_failed';
    };

export class JoinCodeRepository extends TenantRepository {
  listJoinCodes(): Promise<JoinCodeView[]> {
    return this.db.joinCode.findMany({
      where: { businessId: this.businessId },
      select: {
        id: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async createJoinCode(input: CreateJoinCodeInput, actorUserId: string) {
    this.requireTransaction();
    const joinCode = await this.db.joinCode.create({
      data: {
        businessId: this.businessId,
        codeHash: input.codeHash,
        role: MembershipRole.STAFF,
        createdByUserId: input.createdByUserId,
        expiresAt: input.expiresAt,
        maxUses: input.maxUses,
      },
    });
    await new AuditRepository(this.db, this.scope, this.options).append({
      actorUserId,
      action: AuditAction.JOIN_CODE_CREATED,
      entityType: AuditEntityType.JOIN_CODE,
      entityId: joinCode.id,
      metadata: { maxUses: joinCode.maxUses, expiresAt: joinCode.expiresAt.toISOString() },
    });
    return joinCode;
  }

  async revokeJoinCode(id: string, actorUserId: string) {
    this.requireTransaction();
    const joinCode = await this.lockJoinCodeById(id);
    if (!joinCode) return { status: 'not_found' as const };
    if (joinCode.revokedAt) return { status: 'unchanged' as const, joinCode };

    const revokedAt = new Date();
    const updated = await this.db.joinCode.updateMany({
      where: { id, businessId: this.businessId, revokedAt: null },
      data: { revokedAt },
    });
    if (updated.count !== 1) return { status: 'stale' as const };

    await new AuditRepository(this.db, this.scope, this.options).append({
      actorUserId,
      action: AuditAction.JOIN_CODE_REVOKED,
      entityType: AuditEntityType.JOIN_CODE,
      entityId: id,
    });
    const revokedJoinCode = await this.db.joinCode.findFirst({
      where: { id, businessId: this.businessId },
    });
    if (!revokedJoinCode) return { status: 'stale' as const };
    return { status: 'revoked' as const, joinCode: revokedJoinCode };
  }

  async findJoinCodeByHashForUpdate(codeHash: string) {
    this.requireTransaction();
    const rows = await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "join_codes"
      WHERE "businessId" = ${this.businessId}::uuid
        AND "codeHash" = ${codeHash}
      FOR UPDATE
    `);
    if (rows.length === 0) return null;
    return this.db.joinCode.findFirst({
      where: { id: rows[0].id, businessId: this.businessId },
    });
  }

  async redeemJoinCode(codeHash: string, userId: string, actorUserId: string): Promise<RedeemJoinCodeResult> {
    this.requireTransaction();
    const joinCode = await this.findJoinCodeByHashForUpdate(codeHash);
    if (!joinCode) return { status: 'not_found' };
    if (joinCode.revokedAt) return { status: 'revoked' };
    const now = new Date();
    if (joinCode.expiresAt <= now) return { status: 'expired' };
    if (joinCode.usedCount >= joinCode.maxUses) return { status: 'max_uses_reached' };

    const userRows = await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE
    `);
    if (userRows.length === 0) return { status: 'user_not_found' };
    const existingMembership = await this.db.membership.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existingMembership) return { status: 'user_already_belongs_to_a_business' };

    const usageUpdate = await this.db.joinCode.updateMany({
      where: {
        id: joinCode.id,
        businessId: this.businessId,
        revokedAt: null,
        expiresAt: { gt: now },
        usedCount: joinCode.usedCount,
        maxUses: { gt: joinCode.usedCount },
      },
      data: { usedCount: { increment: 1 } },
    });
    if (usageUpdate.count !== 1) return { status: 'usage_update_failed' };

    const added = await new MembershipRepository(this.db, this.scope, this.options).addMember(
      userId,
      actorUserId,
    );
    if (added.status !== 'added') return { status: added.status };

    await new AuditRepository(this.db, this.scope, this.options).append({
      actorUserId,
      action: AuditAction.JOIN_CODE_USED,
      entityType: AuditEntityType.JOIN_CODE,
      entityId: joinCode.id,
      metadata: { membershipId: added.member.id },
    });
    return { status: 'redeemed', joinCodeId: joinCode.id, member: added.member };
  }

  private async lockJoinCodeById(id: string) {
    const rows = await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "join_codes"
      WHERE "id" = ${id}::uuid AND "businessId" = ${this.businessId}::uuid
      FOR UPDATE
    `);
    if (rows.length === 0) return null;
    return this.db.joinCode.findFirst({ where: { id, businessId: this.businessId } });
  }
}

export async function redeemJoinCodeByHash(
  prisma: import('../../generated/prisma/client').PrismaClient,
  codeHash: string,
  userId: string,
): Promise<RedeemJoinCodeResult> {
  const rows = await prisma.$queryRaw<Array<{ businessId: string }>>(Prisma.sql`
    SELECT "businessId" FROM "join_codes" WHERE "codeHash" = ${codeHash}
  `);
  const businessId = rows[0]?.businessId;
  if (!businessId) return { status: 'not_found' };

  return prisma.$transaction(
    (tx) =>
      new JoinCodeRepository(tx, { businessId }, { inTransaction: true }).redeemJoinCode(
        codeHash,
        userId,
        userId,
      ),
    { maxWait: 5_000, timeout: 15_000 },
  );
}
