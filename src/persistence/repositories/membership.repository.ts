import { Prisma } from '../../generated/prisma/client';
import type { Membership } from '../../generated/prisma/client';
import {
  AuditAction,
  AuditEntityType,
  CashUpStatus,
  MembershipRole,
  MembershipStatus,
} from '../../generated/prisma/enums';
import { StaleStateError } from '../errors';
import { TenantRepository } from '../base.repository';
import { AuditRepository } from './audit.repository';
import { BusinessRepository } from './business.repository';

export type MemberTransitionResult<T> =
  | { status: 'updated'; member: T }
  | { status: 'unchanged'; member: T }
  | { status: 'not_found' }
  | { status: 'last_active_owner' }
  | { status: 'active_manager_exists' }
  | { status: 'owner_already_exists' }
  | { status: 'stale' };

export type AddMemberResult =
  | { status: 'added'; member: Membership }
  | { status: 'user_not_found' | 'user_already_belongs_to_a_business' };

export type ReplaceManagerResult =
  | {
      status: 'replaced';
      oldManager: Awaited<ReturnType<MembershipRepository['findById']>> | null;
      newManager: Awaited<ReturnType<MembershipRepository['findById']>>;
      oldManagerUnresolvedCashUpCount: number;
    }
  | {
      status:
        | 'new_manager_not_found'
        | 'new_manager_inactive'
        | 'new_manager_is_owner'
        | 'new_manager_already_manager'
        | 'old_manager_has_unresolved_cashups'
        | 'not_found';
      oldManagerUnresolvedCashUpCount: number;
    };

export class MembershipRepository extends TenantRepository {
  /** The caller's active membership in this business (checked on every request). */
  findActiveByUser(userId: string) {
    return this.db.membership.findFirst({
      where: { businessId: this.businessId, userId, status: MembershipStatus.ACTIVE },
    });
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

  listMembers(opts: { activeOnly?: boolean } = {}) {
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
    this.requireTransaction();
    const userRows = await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE
    `);
    if (userRows.length === 0) return { status: 'user_not_found' };

    const existing = await this.db.membership.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) return { status: 'user_already_belongs_to_a_business' };

    const member = await this.db.membership.create({
      data: { businessId: this.businessId, userId, role: MembershipRole.STAFF },
    });
    await new AuditRepository(this.db, this.scope, this.options).append({
      actorUserId,
      action: AuditAction.MEMBER_JOINED,
      entityType: AuditEntityType.MEMBERSHIP,
      entityId: member.id,
      metadata: { role: MembershipRole.STAFF },
    });
    return { status: 'added', member };
  }

  async setMemberStatus(
    id: string,
    status: MembershipStatus,
    actorUserId: string,
  ): Promise<MemberTransitionResult<NonNullable<Awaited<ReturnType<MembershipRepository['getMember']>>>>> {
    this.requireTransaction();
    const business = await new BusinessRepository(this.db, this.scope, this.options).lockBusiness();
    if (!business) return { status: 'not_found' };

    const member = await this.getMember(id);
    if (!member) return { status: 'not_found' };
    if (member.status === status) return { status: 'unchanged', member };

    if (
      status === MembershipStatus.INACTIVE &&
      member.status === MembershipStatus.ACTIVE &&
      member.role === MembershipRole.OWNER
    ) {
      const activeOwners = await this.db.membership.count({
        where: {
          businessId: this.businessId,
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });
      if (activeOwners <= 1) return { status: 'last_active_owner' };
    }

    if (
      status === MembershipStatus.ACTIVE &&
      member.role === MembershipRole.MANAGER
    ) {
      const anotherActiveManager = await this.db.membership.findFirst({
        where: {
          businessId: this.businessId,
          role: MembershipRole.MANAGER,
          status: MembershipStatus.ACTIVE,
          id: { not: id },
        },
        select: { id: true },
      });
      if (anotherActiveManager) return { status: 'active_manager_exists' };
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
    if (updated.count !== 1) return { status: 'stale' };

    await new AuditRepository(this.db, this.scope, this.options).append({
      actorUserId,
      action:
        status === MembershipStatus.INACTIVE
          ? AuditAction.MEMBER_DEACTIVATED
          : AuditAction.MEMBER_REACTIVATED,
      entityType: AuditEntityType.MEMBERSHIP,
      entityId: id,
      metadata: { oldStatus: member.status, newStatus: status },
    });
    const updatedMember = await this.getMember(id);
    if (!updatedMember) return { status: 'stale' };
    return { status: 'updated', member: updatedMember };
  }

  async changeMemberRole(
    id: string,
    role: MembershipRole,
    actorUserId: string,
  ): Promise<MemberTransitionResult<NonNullable<Awaited<ReturnType<MembershipRepository['getMember']>>>>> {
    this.requireTransaction();
    const business = await new BusinessRepository(this.db, this.scope, this.options).lockBusiness();
    if (!business) return { status: 'not_found' };

    const member = await this.getMember(id);
    if (!member) return { status: 'not_found' };
    if (member.role === role) return { status: 'unchanged', member };

    if (
      member.status === MembershipStatus.ACTIVE &&
      member.role === MembershipRole.OWNER &&
      role !== MembershipRole.OWNER
    ) {
      const activeOwners = await this.db.membership.count({
        where: {
          businessId: this.businessId,
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });
      if (activeOwners <= 1) return { status: 'last_active_owner' };
    }

    if (role === MembershipRole.OWNER) {
      const anotherOwner = await this.db.membership.findFirst({
        where: { businessId: this.businessId, role: MembershipRole.OWNER, id: { not: id } },
        select: { id: true },
      });
      if (anotherOwner) return { status: 'owner_already_exists' };
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
      if (anotherActiveManager) return { status: 'active_manager_exists' };
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
    if (updated.count !== 1) return { status: 'stale' };

    await new AuditRepository(this.db, this.scope, this.options).append({
      actorUserId,
      action: AuditAction.MEMBER_ROLE_CHANGED,
      entityType: AuditEntityType.MEMBERSHIP,
      entityId: id,
      metadata: { oldRole: member.role, newRole: role } satisfies Prisma.InputJsonObject,
    });
    const updatedMember = await this.getMember(id);
    if (!updatedMember) return { status: 'stale' };
    return { status: 'updated', member: updatedMember };
  }

  async replaceManager(
    newManagerUserId: string,
    actorUserId: string,
  ): Promise<ReplaceManagerResult> {
    this.requireTransaction();
    const business = await new BusinessRepository(this.db, this.scope, this.options).lockBusiness();
    if (!business) return { status: 'not_found', oldManagerUnresolvedCashUpCount: 0 };

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
      if (demoted.count !== 1) throw new StaleStateError('Manager membership');
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
    if (promoted.count !== 1) throw new StaleStateError('Manager membership');

    const audit = new AuditRepository(this.db, this.scope, this.options);
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
}
