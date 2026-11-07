import { createHash, randomInt } from 'node:crypto';
import type { MembershipStatus } from '../persistence';
import type { UnitOfWork } from '../persistence';
import type {
  CreateBusiness,
  CreateJoinCode,
  SetBusinessSolo,
} from '../validation';
import type { Actor } from './actor';
import { BusinessRuleError, ConflictError, EntityNotFoundError, ForbiddenError } from './errors';
import { assertCan } from './permissions';
import type { TransactionRepositories } from './ports';
import { UseCaseRunner } from './use-case-runner';

const JOIN_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const JOIN_CODE_LENGTH = 12;

export interface BusinessDto {
  readonly id: string;
  readonly name: string;
  readonly isSolo: boolean;
  readonly role: 'OWNER' | 'MANAGER' | 'STAFF';
}

export interface MemberDto {
  readonly id: string;
  readonly fullName: string;
  readonly role: 'OWNER' | 'MANAGER' | 'STAFF';
  readonly status: MembershipStatus;
  readonly joinedAt: string;
  readonly deactivatedAt: string | null;
}

export interface JoinCodeDto {
  readonly id: string;
  readonly status: 'active' | 'expired' | 'revoked' | 'used_up';
  readonly expiresAt: string;
  readonly maxUses: number;
  readonly usedCount: number;
  readonly createdAt: string;
}

type SetupPersistence = Pick<UnitOfWork, 'createBusinessWithOwner' | 'redeemJoinCodeByHash'>;

export class BusinessSetupService {
  constructor(
    private readonly runner: UseCaseRunner,
    private readonly persistence: SetupPersistence,
  ) {}

  async createBusiness(userId: string, input: CreateBusiness): Promise<BusinessDto> {
    const result = await this.persistence.createBusinessWithOwner({
      ownerUserId: userId,
      name: input.name,
      isSolo: input.isSolo,
    });
    if (result.status !== 'created') {
      if (result.status === 'user_already_belongs_to_a_business') {
        throw new ConflictError('BUSINESS_ALREADY_EXISTS');
      }
      throw new EntityNotFoundError();
    }
    return {
      id: result.business.id,
      name: result.business.name,
      isSolo: result.business.isSolo,
      role: 'OWNER',
    };
  }

  getBusiness(actor: Actor): Promise<BusinessDto> {
    return this.runner.run({ businessId: actor.businessId }, async (repos) => {
      assertCan(actor, 'business.read', false);
      const business = await repos.businesses.getBusiness();
      if (!business) throw new EntityNotFoundError();
      return {
        id: business.id,
        name: business.name,
        isSolo: business.isSolo,
        role: actor.role,
      };
    });
  }

  listMembers(actor: Actor): Promise<MemberDto[]> {
    return this.runner.run({ businessId: actor.businessId }, async (repos) => {
      const business = await this.requireBusiness(repos);
      assertCan(actor, 'members.list', business.isSolo);
      const members = await repos.memberships.listMembers();
      return members.map(mapMember);
    });
  }

  deactivateMember(actor: Actor, memberId: string): Promise<MemberDto> {
    return this.runner.run({ businessId: actor.businessId }, async (repos) => {
      const business = await repos.businesses.lockBusiness();
      if (!business) throw new EntityNotFoundError();
      assertCan(actor, 'members.deactivate', business.isSolo);
      const target = await repos.memberships.getMember(memberId);
      if (!target) throw new EntityNotFoundError();
      if (target.userId === actor.userId) {
        throw new BusinessRuleError('MEMBER_CANNOT_DEACTIVATE_SELF');
      }
      if (
        actor.role === 'MANAGER' &&
        target.role !== 'STAFF'
      ) {
        throw new ForbiddenError('MEMBER_DEACTIVATION_FORBIDDEN');
      }
      if (target.role === 'OWNER' && actor.role !== 'OWNER') {
        throw new ForbiddenError('MEMBER_DEACTIVATION_FORBIDDEN');
      }
      if (target.status === 'INACTIVE') return mapMember(target);

      if ((await repos.cashUps.countUnresolvedCashUpsForUser(target.userId)) > 0) {
        throw new BusinessRuleError('MEMBER_HAS_UNRESOLVED_CASHUPS');
      }
      const result = await repos.memberships.setMemberStatus(
        memberId,
        'INACTIVE',
        actor.userId,
      );
      if (result.status === 'last_active_owner') {
        throw new BusinessRuleError('LAST_ACTIVE_OWNER');
      }
      if (result.status === 'not_found' || result.status === 'stale') {
        throw new EntityNotFoundError();
      }
      if (result.status !== 'updated' && result.status !== 'unchanged') {
        throw new ConflictError();
      }
      return mapMember(result.member);
    });
  }

  replaceManager(actor: Actor, memberId: string): Promise<MemberDto> {
    return this.runner.run({ businessId: actor.businessId }, async (repos) => {
      const business = await repos.businesses.lockBusiness();
      if (!business) throw new EntityNotFoundError();
      assertCan(actor, 'manager.replace', business.isSolo);
      if (business.isSolo) throw new BusinessRuleError('MANAGER_CHANGE_IN_SOLO_BUSINESS');

      const target = await repos.memberships.getMember(memberId);
      if (!target) throw new EntityNotFoundError();
      const result = await repos.memberships.replaceManager(target.userId, actor.userId);
      switch (result.status) {
        case 'new_manager_not_found':
        case 'not_found':
          throw new EntityNotFoundError();
        case 'new_manager_inactive':
          throw new BusinessRuleError('MANAGER_INACTIVE');
        case 'new_manager_is_owner':
          throw new BusinessRuleError('OWNER_CANNOT_BE_MANAGER');
        case 'new_manager_already_manager':
          return mapMember(target);
        case 'old_manager_has_unresolved_cashups':
          throw new BusinessRuleError('MEMBER_HAS_UNRESOLVED_CASHUPS');
        case 'replaced': {
          if (!result.newManager) throw new EntityNotFoundError();
          const promoted = await repos.memberships.getMember(result.newManager.id);
          if (!promoted) throw new EntityNotFoundError();
          return mapMember(promoted);
        }
      }
    });
  }

  setBusinessSolo(actor: Actor, input: SetBusinessSolo): Promise<BusinessDto> {
    return this.runner.run({ businessId: actor.businessId }, async (repos) => {
      const business = await this.requireBusiness(repos);
      assertCan(actor, 'business.changeSolo', business.isSolo);
      const result = await repos.businesses.setBusinessSolo(input.isSolo, actor.userId);
      if (
        result.status === 'updated' &&
        (result.otherActiveMemberCount > 0 || result.unresolvedCashUpCount > 0)
      ) {
        throw new BusinessRuleError('SOLO_CHANGE_BLOCKED');
      }
      if (result.status === 'stale') throw new ConflictError();
      return {
        id: result.business.id,
        name: result.business.name,
        isSolo: result.business.isSolo,
        role: actor.role,
      };
    });
  }

  createJoinCode(
    actor: Actor,
    input: CreateJoinCode,
  ): Promise<{ id: string; code: string; expiresAt: string; maxUses: number }> {
    return this.runner.run({ businessId: actor.businessId }, async (repos) => {
      const business = await this.requireBusiness(repos);
      assertCan(actor, 'joinCodes.create', business.isSolo);
      const code = createReadableJoinCode();
      const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
      const joinCode = await repos.joinCodes.createJoinCode(
        {
          codeHash: createHash('sha256').update(code).digest('hex'),
          createdByUserId: actor.userId,
          expiresAt,
          maxUses: input.maxUses,
        },
        actor.userId,
      );
      return {
        id: joinCode.id,
        code,
        expiresAt: joinCode.expiresAt.toISOString(),
        maxUses: joinCode.maxUses,
      };
    });
  }

  listJoinCodes(actor: Actor): Promise<JoinCodeDto[]> {
    return this.runner.run({ businessId: actor.businessId }, async (repos) => {
      const business = await this.requireBusiness(repos);
      assertCan(actor, 'joinCodes.list', business.isSolo);
      const now = new Date();
      return (await repos.joinCodes.listJoinCodes()).map((joinCode) => ({
        id: joinCode.id,
        status: joinCode.revokedAt
          ? 'revoked'
          : joinCode.expiresAt <= now
            ? 'expired'
            : joinCode.usedCount >= joinCode.maxUses
              ? 'used_up'
              : 'active',
        expiresAt: joinCode.expiresAt.toISOString(),
        maxUses: joinCode.maxUses,
        usedCount: joinCode.usedCount,
        createdAt: joinCode.createdAt.toISOString(),
      }));
    });
  }

  revokeJoinCode(actor: Actor, id: string): Promise<{ id: string; status: 'revoked' }> {
    return this.runner.run({ businessId: actor.businessId }, async (repos) => {
      const business = await this.requireBusiness(repos);
      assertCan(actor, 'joinCodes.revoke', business.isSolo);
      const result = await repos.joinCodes.revokeJoinCode(id, actor.userId);
      if (result.status === 'not_found' || result.status === 'stale') {
        throw new EntityNotFoundError();
      }
      return { id, status: 'revoked' };
    });
  }

  async redeemJoinCode(userId: string, code: string): Promise<{ role: 'STAFF'; status: 'ACTIVE' }> {
    const result = await this.persistence.redeemJoinCodeByHash(
      createHash('sha256').update(code).digest('hex'),
      userId,
    );
    if (
      result.status === 'not_found' ||
      result.status === 'revoked' ||
      result.status === 'expired' ||
      result.status === 'max_uses_reached' ||
      result.status === 'usage_update_failed'
    ) {
      throw new BusinessRuleError('JOIN_CODE_INVALID');
    }
    if (result.status === 'user_already_belongs_to_a_business') {
      throw new ConflictError('BUSINESS_ALREADY_EXISTS');
    }
    if (result.status === 'user_not_found') throw new EntityNotFoundError();
    return { role: 'STAFF', status: 'ACTIVE' };
  }

  private async requireBusiness(repos: TransactionRepositories<'businesses'>) {
    const business = await repos.businesses.getBusiness();
    if (!business) throw new EntityNotFoundError();
    return business;
  }
}

function mapMember(member: {
  id: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  status: MembershipStatus;
  joinedAt: Date;
  deactivatedAt: Date | null;
  user: { fullName: string };
}): MemberDto {
  return {
    id: member.id,
    fullName: member.user.fullName,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt.toISOString(),
    deactivatedAt: member.deactivatedAt?.toISOString() ?? null,
  };
}

function createReadableJoinCode(): string {
  let code = '';
  for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}
