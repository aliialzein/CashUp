import { getPrisma } from "../../shared/db/prisma";
import { type Db } from "../../shared/db/types";
import { NotInTransactionError, NotFoundError, StaleStateError } from "../../shared/errors/persistence-errors";
import { Prisma, type Business, type Membership } from "../../generated/prisma/client";
import { AuditAction, AuditEntityType, CashUpStatus, MembershipRole, MembershipStatus } from "../../generated/prisma/enums";
import { AuditRepository } from "../audit/audit.repository";
import 'server-only';
export class BusinessRepository {
    constructor(private readonly businessId: string, private readonly db: Db = getPrisma()) {
        if (!businessId)
            throw new Error('A repository requires a businessId');
    }
    getBusiness() {
        return this.db.business.findUnique({ where: { id: this.businessId } });
    }
    findSettings(): Promise<{
        id: string;
        name: string;
        isSolo: boolean;
    } | null> {
        return this.db.business.findUnique({
            where: { id: this.businessId },
            select: { id: true, name: true, isSolo: true },
        });
    }
    async lockBusiness() {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const rows = await this.db.$queryRaw<Array<{
            id: string;
        }>>(Prisma.sql `
      SELECT "id" FROM "businesses"
      WHERE "id" = ${this.businessId}::uuid
      -- Serialize settings/role workflows without blocking audit foreign-key KEY SHARE checks.
      FOR NO KEY UPDATE
    `);
        if (rows.length === 0)
            return null;
        return this.getBusiness();
    }
    async setBusinessSolo(isSolo: boolean, actorUserId: string) {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const business = await this.lockBusiness();
        if (!business)
            throw new NotFoundError('Business');
        const [otherActiveMemberCount, unresolvedCashUpCount] = await Promise.all([
            this.db.membership.count({
                where: {
                    businessId: this.businessId,
                    status: MembershipStatus.ACTIVE,
                    role: { not: MembershipRole.OWNER },
                },
            }),
            this.db.cashUp.count({
                where: {
                    businessId: this.businessId,
                    status: { in: [CashUpStatus.OPEN, CashUpStatus.SUBMITTED] },
                },
            }),
        ]);
        const counts = { otherActiveMemberCount, unresolvedCashUpCount };
        if (business.isSolo === isSolo) {
            return { status: 'unchanged' as const, business, ...counts };
        }
        const updated = await this.db.business.updateMany({
            where: { id: this.businessId, isSolo: business.isSolo },
            data: { isSolo },
        });
        if (updated.count !== 1)
            return { status: 'stale' as const, business, ...counts };
        await new AuditRepository(this.businessId, this.db).append({
            actorUserId,
            action: AuditAction.BUSINESS_SOLO_CHANGED,
            entityType: AuditEntityType.BUSINESS,
            entityId: this.businessId,
            metadata: { oldIsSolo: business.isSolo, newIsSolo: isSolo } satisfies Prisma.InputJsonObject,
        });
        const updatedBusiness = await this.getBusiness();
        if (!updatedBusiness)
            throw new NotFoundError('Business');
        return { status: 'updated' as const, business: updatedBusiness, ...counts };
    }
    findById(id: string) {
        return this.db.membership.findFirst({
            where: { id, businessId: this.businessId },
        });
    }
    getMember(id: string) {
        return this.db.membership.findFirst({
            where: { id, businessId: this.businessId },
            include: { user: { select: { id: true, fullName: true, email: true } } },
        });
    }
    listMembers(opts: {
        activeOnly?: boolean;
    } = {}) {
        return this.db.membership.findMany({
            where: {
                businessId: this.businessId,
                ...(opts.activeOnly ? { status: MembershipStatus.ACTIVE } : {}),
            },
            include: { user: { select: { id: true, fullName: true, email: true } } },
            orderBy: { joinedAt: 'asc' },
        });
    }
    async addMember(userId: string, actorUserId: string): Promise<AddMemberResult> {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const userRows = await this.db.$queryRaw<Array<{
            id: string;
        }>>(Prisma.sql `
      SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE
    `);
        if (userRows.length === 0)
            return { status: 'user_not_found' };
        const existing = await this.db.membership.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (existing)
            return { status: 'user_already_belongs_to_a_business' };
        const member = await this.db.membership.create({
            data: { businessId: this.businessId, userId, role: MembershipRole.STAFF },
        });
        await new AuditRepository(this.businessId, this.db).append({
            actorUserId,
            action: AuditAction.MEMBER_JOINED,
            entityType: AuditEntityType.MEMBERSHIP,
            entityId: member.id,
            metadata: { role: MembershipRole.STAFF },
        });
        return { status: 'added', member };
    }
    async setMemberStatus(id: string, status: MembershipStatus, actorUserId: string): Promise<MemberTransitionResult<NonNullable<Awaited<ReturnType<BusinessRepository['getMember']>>>>> {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const business = await new BusinessRepository(this.businessId, this.db).lockBusiness();
        if (!business)
            return { status: 'not_found' };
        const member = await this.getMember(id);
        if (!member)
            return { status: 'not_found' };
        if (member.status === status)
            return { status: 'unchanged', member };
        if (status === MembershipStatus.INACTIVE &&
            member.status === MembershipStatus.ACTIVE &&
            member.role === MembershipRole.OWNER) {
            const activeOwners = await this.db.membership.count({
                where: {
                    businessId: this.businessId,
                    role: MembershipRole.OWNER,
                    status: MembershipStatus.ACTIVE,
                },
            });
            if (activeOwners <= 1)
                return { status: 'last_active_owner' };
        }
        if (status === MembershipStatus.ACTIVE &&
            member.role === MembershipRole.MANAGER) {
            const anotherActiveManager = await this.db.membership.findFirst({
                where: {
                    businessId: this.businessId,
                    role: MembershipRole.MANAGER,
                    status: MembershipStatus.ACTIVE,
                    id: { not: id },
                },
                select: { id: true },
            });
            if (anotherActiveManager)
                return { status: 'active_manager_exists' };
        }
        const updated = await this.db.membership.updateMany({
            where: {
                id,
                businessId: this.businessId,
                status: member.status,
                role: member.role,
            },
            data: {
                status,
                deactivatedAt: status === MembershipStatus.INACTIVE ? new Date() : null,
            },
        });
        if (updated.count !== 1)
            return { status: 'stale' };
        await new AuditRepository(this.businessId, this.db).append({
            actorUserId,
            action: status === MembershipStatus.INACTIVE
                ? AuditAction.MEMBER_DEACTIVATED
                : AuditAction.MEMBER_REACTIVATED,
            entityType: AuditEntityType.MEMBERSHIP,
            entityId: id,
            metadata: { oldStatus: member.status, newStatus: status },
        });
        const updatedMember = await this.getMember(id);
        if (!updatedMember)
            return { status: 'stale' };
        return { status: 'updated', member: updatedMember };
    }
    async changeMemberRole(id: string, role: MembershipRole, actorUserId: string): Promise<MemberTransitionResult<NonNullable<Awaited<ReturnType<BusinessRepository['getMember']>>>>> {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const business = await new BusinessRepository(this.businessId, this.db).lockBusiness();
        if (!business)
            return { status: 'not_found' };
        const member = await this.getMember(id);
        if (!member)
            return { status: 'not_found' };
        if (member.role === role)
            return { status: 'unchanged', member };
        if (member.status === MembershipStatus.ACTIVE &&
            member.role === MembershipRole.OWNER &&
            role !== MembershipRole.OWNER) {
            const activeOwners = await this.db.membership.count({
                where: {
                    businessId: this.businessId,
                    role: MembershipRole.OWNER,
                    status: MembershipStatus.ACTIVE,
                },
            });
            if (activeOwners <= 1)
                return { status: 'last_active_owner' };
        }
        if (role === MembershipRole.OWNER) {
            const anotherOwner = await this.db.membership.findFirst({
                where: { businessId: this.businessId, role: MembershipRole.OWNER, id: { not: id } },
                select: { id: true },
            });
            if (anotherOwner)
                return { status: 'owner_already_exists' };
        }
        if (role === MembershipRole.MANAGER && member.status === MembershipStatus.ACTIVE) {
            const anotherActiveManager = await this.db.membership.findFirst({
                where: {
                    businessId: this.businessId,
                    role: MembershipRole.MANAGER,
                    status: MembershipStatus.ACTIVE,
                    id: { not: id },
                },
                select: { id: true },
            });
            if (anotherActiveManager)
                return { status: 'active_manager_exists' };
        }
        const updated = await this.db.membership.updateMany({
            where: {
                id,
                businessId: this.businessId,
                role: member.role,
                status: member.status,
            },
            data: { role },
        });
        if (updated.count !== 1)
            return { status: 'stale' };
        await new AuditRepository(this.businessId, this.db).append({
            actorUserId,
            action: AuditAction.MEMBER_ROLE_CHANGED,
            entityType: AuditEntityType.MEMBERSHIP,
            entityId: id,
            metadata: { oldRole: member.role, newRole: role } satisfies Prisma.InputJsonObject,
        });
        const updatedMember = await this.getMember(id);
        if (!updatedMember)
            return { status: 'stale' };
        return { status: 'updated', member: updatedMember };
    }
    async replaceManager(newManagerUserId: string, actorUserId: string): Promise<ReplaceManagerResult> {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const business = await new BusinessRepository(this.businessId, this.db).lockBusiness();
        if (!business)
            return { status: 'not_found', oldManagerUnresolvedCashUpCount: 0 };
        const oldManager = await this.db.membership.findFirst({
            where: {
                businessId: this.businessId,
                role: MembershipRole.MANAGER,
                status: MembershipStatus.ACTIVE,
            },
        });
        const newManager = await this.db.membership.findFirst({
            where: { businessId: this.businessId, userId: newManagerUserId },
        });
        if (!newManager) {
            return { status: 'new_manager_not_found', oldManagerUnresolvedCashUpCount: 0 };
        }
        if (newManager.status === MembershipStatus.INACTIVE) {
            return { status: 'new_manager_inactive', oldManagerUnresolvedCashUpCount: 0 };
        }
        if (newManager.role === MembershipRole.OWNER) {
            return { status: 'new_manager_is_owner', oldManagerUnresolvedCashUpCount: 0 };
        }
        const unresolvedCashUpCount = oldManager
            ? await this.db.cashUp.count({
                where: {
                    businessId: this.businessId,
                    membershipId: oldManager.id,
                    status: { in: [CashUpStatus.OPEN, CashUpStatus.SUBMITTED] },
                },
            })
            : 0;
        if (oldManager?.id === newManager.id) {
            return {
                status: 'new_manager_already_manager',
                oldManagerUnresolvedCashUpCount: unresolvedCashUpCount,
            };
        }
        if (unresolvedCashUpCount > 0) {
            return {
                status: 'old_manager_has_unresolved_cashups',
                oldManagerUnresolvedCashUpCount: unresolvedCashUpCount,
            };
        }
        if (oldManager) {
            const demoted = await this.db.membership.updateMany({
                where: {
                    id: oldManager.id,
                    businessId: this.businessId,
                    role: MembershipRole.MANAGER,
                    status: MembershipStatus.ACTIVE,
                },
                data: { role: MembershipRole.STAFF },
            });
            if (demoted.count !== 1)
                throw new StaleStateError('Manager membership');
        }
        const promoted = await this.db.membership.updateMany({
            where: {
                id: newManager.id,
                businessId: this.businessId,
                role: newManager.role,
                status: MembershipStatus.ACTIVE,
            },
            data: { role: MembershipRole.MANAGER },
        });
        if (promoted.count !== 1)
            throw new StaleStateError('Manager membership');
        const audit = new AuditRepository(this.businessId, this.db);
        if (oldManager) {
            await audit.append({
                actorUserId,
                action: AuditAction.MEMBER_ROLE_CHANGED,
                entityType: AuditEntityType.MEMBERSHIP,
                entityId: oldManager.id,
                metadata: {
                    oldRole: MembershipRole.MANAGER,
                    newRole: MembershipRole.STAFF,
                } satisfies Prisma.InputJsonObject,
            });
        }
        await audit.append({
            actorUserId,
            action: AuditAction.MEMBER_ROLE_CHANGED,
            entityType: AuditEntityType.MEMBERSHIP,
            entityId: newManager.id,
            metadata: {
                oldRole: newManager.role,
                newRole: MembershipRole.MANAGER,
            } satisfies Prisma.InputJsonObject,
        });
        return {
            status: 'replaced',
            oldManager: oldManager ? await this.findById(oldManager.id) : null,
            newManager: await this.findById(newManager.id),
            oldManagerUnresolvedCashUpCount: unresolvedCashUpCount,
        };
    }
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
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
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
        await new AuditRepository(this.businessId, this.db).append({
            actorUserId,
            action: AuditAction.JOIN_CODE_CREATED,
            entityType: AuditEntityType.JOIN_CODE,
            entityId: joinCode.id,
            metadata: { maxUses: joinCode.maxUses, expiresAt: joinCode.expiresAt.toISOString() },
        });
        return joinCode;
    }
    async revokeJoinCode(id: string, actorUserId: string) {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const joinCode = await this.lockJoinCodeById(id);
        if (!joinCode)
            return { status: 'not_found' as const };
        if (joinCode.revokedAt)
            return { status: 'unchanged' as const, joinCode };
        const revokedAt = new Date();
        const updated = await this.db.joinCode.updateMany({
            where: { id, businessId: this.businessId, revokedAt: null },
            data: { revokedAt },
        });
        if (updated.count !== 1)
            return { status: 'stale' as const };
        await new AuditRepository(this.businessId, this.db).append({
            actorUserId,
            action: AuditAction.JOIN_CODE_REVOKED,
            entityType: AuditEntityType.JOIN_CODE,
            entityId: id,
        });
        const revokedJoinCode = await this.db.joinCode.findFirst({
            where: { id, businessId: this.businessId },
        });
        if (!revokedJoinCode)
            return { status: 'stale' as const };
        return { status: 'revoked' as const, joinCode: revokedJoinCode };
    }
    async findJoinCodeByHashForUpdate(codeHash: string) {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const rows = await this.db.$queryRaw<Array<{
            id: string;
        }>>(Prisma.sql `
      SELECT "id" FROM "join_codes"
      WHERE "businessId" = ${this.businessId}::uuid
        AND "codeHash" = ${codeHash}
      FOR UPDATE
    `);
        if (rows.length === 0)
            return null;
        return this.db.joinCode.findFirst({
            where: { id: rows[0].id, businessId: this.businessId },
        });
    }
    async redeemJoinCode(codeHash: string, userId: string, actorUserId: string): Promise<RedeemJoinCodeResult> {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const joinCode = await this.findJoinCodeByHashForUpdate(codeHash);
        if (!joinCode)
            return { status: 'not_found' };
        if (joinCode.revokedAt)
            return { status: 'revoked' };
        const now = new Date();
        if (joinCode.expiresAt <= now)
            return { status: 'expired' };
        if (joinCode.usedCount >= joinCode.maxUses)
            return { status: 'max_uses_reached' };
        const userRows = await this.db.$queryRaw<Array<{
            id: string;
        }>>(Prisma.sql `
      SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE
    `);
        if (userRows.length === 0)
            return { status: 'user_not_found' };
        const existingMembership = await this.db.membership.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (existingMembership)
            return { status: 'user_already_belongs_to_a_business' };
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
        if (usageUpdate.count !== 1)
            return { status: 'usage_update_failed' };
        const added = await new BusinessRepository(this.businessId, this.db).addMember(userId, actorUserId);
        if (added.status !== 'added')
            return { status: added.status };
        await new AuditRepository(this.businessId, this.db).append({
            actorUserId,
            action: AuditAction.JOIN_CODE_USED,
            entityType: AuditEntityType.JOIN_CODE,
            entityId: joinCode.id,
            metadata: { membershipId: added.member.id },
        });
        return { status: 'redeemed', joinCodeId: joinCode.id, member: added.member };
    }
    private async lockJoinCodeById(id: string) {
        const rows = await this.db.$queryRaw<Array<{
            id: string;
        }>>(Prisma.sql `
      SELECT "id" FROM "join_codes"
      WHERE "id" = ${id}::uuid AND "businessId" = ${this.businessId}::uuid
      FOR UPDATE
    `);
        if (rows.length === 0)
            return null;
        return this.db.joinCode.findFirst({ where: { id, businessId: this.businessId } });
    }
}
export interface CreateBusinessWithOwnerInput {
    ownerUserId: string;
    name: string;
    isSolo: boolean;
}
export type CreateBusinessWithOwnerResult = {
    status: 'created';
    business: Business;
    ownerMembership: Membership;
} | {
    status: 'user_not_found' | 'user_already_belongs_to_a_business';
};
export async function createBusinessWithOwner(tx: Prisma.TransactionClient, input: CreateBusinessWithOwnerInput): Promise<CreateBusinessWithOwnerResult> {
    if (typeof Reflect.get(tx, '$connect') === 'function')
        throw new NotInTransactionError();
    const user = await tx.$queryRaw<Array<{
        id: string;
    }>> `
      SELECT "id" FROM "users" WHERE "id" = ${input.ownerUserId}::uuid FOR UPDATE
    `;
    if (user.length === 0)
        return { status: 'user_not_found' };
    const existingMembership = await tx.membership.findUnique({
        where: { userId: input.ownerUserId },
        select: { id: true },
    });
    if (existingMembership)
        return { status: 'user_already_belongs_to_a_business' };
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
}
export type MemberTransitionResult<T> = {
    status: 'updated';
    member: T;
} | {
    status: 'unchanged';
    member: T;
} | {
    status: 'not_found';
} | {
    status: 'last_active_owner';
} | {
    status: 'active_manager_exists';
} | {
    status: 'owner_already_exists';
} | {
    status: 'stale';
};
export type AddMemberResult = {
    status: 'added';
    member: Membership;
} | {
    status: 'user_not_found' | 'user_already_belongs_to_a_business';
};
export type ReplaceManagerResult = {
    status: 'replaced';
    oldManager: Awaited<ReturnType<BusinessRepository['findById']>> | null;
    newManager: Awaited<ReturnType<BusinessRepository['findById']>>;
    oldManagerUnresolvedCashUpCount: number;
} | {
    status: 'new_manager_not_found' | 'new_manager_inactive' | 'new_manager_is_owner' | 'new_manager_already_manager' | 'old_manager_has_unresolved_cashups' | 'not_found';
    oldManagerUnresolvedCashUpCount: number;
};
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
export type RedeemJoinCodeResult = {
    status: 'redeemed';
    joinCodeId: string;
    member: Membership;
} | {
    status: 'not_found' | 'revoked' | 'expired' | 'max_uses_reached' | 'user_not_found' | 'user_already_belongs_to_a_business' | 'usage_update_failed';
};
/** Bootstrap lookup by a server-hashed join secret, before the user has a business. */
export async function findJoinCodeBusiness(codeHash: string, db: Db): Promise<string | null> {
    const rows = await db.$queryRaw<Array<{
        businessId: string;
    }>>(Prisma.sql `
    SELECT "businessId" FROM "join_codes" WHERE "codeHash" = ${codeHash}
  `);
    return rows[0]?.businessId ?? null;
}
