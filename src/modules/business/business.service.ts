import { uuid } from '../../shared/validation/common';
import { createBusinessSchema, createJoinCodeSchema, redeemJoinCodeSchema, setBusinessSoloSchema } from './business.validation';
import { requireCurrentMember, requireCurrentIdentity, lockCurrentMember, requireManagementPermission, requireOwnerPermission, requireMemberDeactivationPermission } from "../auth/auth.service";
import 'server-only';
import { createBusinessWithOwner } from './business.repository';
import { getPrisma } from '../../shared/db/prisma';
import { translatePersistenceError } from '../../shared/errors/translate-persistence-error';
import { BusinessRepository } from './business.repository';
import { CashUpRepository } from '../cash-ups/cash-ups.repository';
import { findJoinCodeBusiness } from './business.repository';
import { createHash, randomInt } from 'node:crypto';
import { MembershipStatus } from '../../generated/prisma/enums';
import type { CreateBusiness, CreateJoinCode, SetBusinessSolo } from './business.validation';
import { BusinessRuleError, ConflictError, EntityNotFoundError } from '../../shared/errors/service-errors';
import type { BusinessDto, MemberDto, JoinCodeDto } from './business.types';
const JOIN_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const JOIN_CODE_LENGTH = 12;
export async function createBusiness(input: CreateBusiness): Promise<BusinessDto> {
    const { userId } = await requireCurrentIdentity();
    input = createBusinessSchema.parse(input);
    const db = getPrisma();
    const result = await db.$transaction(tx => createBusinessWithOwner(tx, {
        ownerUserId: userId,
        name: input.name,
        isSolo: input.isSolo,
    }));
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
export async function getBusiness(): Promise<BusinessDto> {
    const actor = await requireCurrentMember();
    const db = getPrisma();
    try {
        const businessRepository = new BusinessRepository(actor.businessId, db);
        const business = await businessRepository.getBusiness();
        if (!business)
            throw new EntityNotFoundError();
        return {
            id: business.id,
            name: business.name,
            isSolo: business.isSolo,
            role: actor.role,
        };
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function listMembers(): Promise<MemberDto[]> {
    const actor = await requireCurrentMember();
    const db = getPrisma();
    try {
        const membershipRepository = new BusinessRepository(actor.businessId, db);
        const businessRepository = new BusinessRepository(actor.businessId, db);
        await businessSetupRequireBusiness(businessRepository);
        requireManagementPermission(actor);
        const members = await membershipRepository.listMembers();
        return members.map(mapMember);
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function deactivateMember(memberId: string): Promise<MemberDto> {
    const actor = await requireCurrentMember();
    memberId = uuid.parse(memberId);
    const db = getPrisma();
    try {
        return await db.$transaction(async (tx) => {
            await new BusinessRepository(actor.businessId, tx).lockBusiness();
            await lockCurrentMember(actor, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            const membershipRepository = new BusinessRepository(actor.businessId, tx);
            const cashUpRepository = new CashUpRepository(actor.businessId, tx);
            const business = await businessRepository.lockBusiness();
            if (!business)
                throw new EntityNotFoundError();
            requireManagementPermission(actor);
            const target = await membershipRepository.getMember(memberId);
            if (!target)
                throw new EntityNotFoundError();
            requireMemberDeactivationPermission(actor, target);
            if (target.status === 'INACTIVE')
                return mapMember(target);
            if ((await cashUpRepository.countUnresolvedCashUpsForUser(target.userId)) > 0) {
                throw new BusinessRuleError('MEMBER_HAS_UNRESOLVED_CASHUPS');
            }
            const result = await membershipRepository.setMemberStatus(memberId, 'INACTIVE', actor.userId);
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
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function replaceManager(memberId: string): Promise<MemberDto> {
    const actor = await requireCurrentMember();
    memberId = uuid.parse(memberId);
    const db = getPrisma();
    try {
        return await db.$transaction(async (tx) => {
            await new BusinessRepository(actor.businessId, tx).lockBusiness();
            await lockCurrentMember(actor, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            const membershipRepository = new BusinessRepository(actor.businessId, tx);
            const business = await businessRepository.lockBusiness();
            if (!business)
                throw new EntityNotFoundError();
            requireOwnerPermission(actor);
            if (business.isSolo)
                throw new BusinessRuleError('MANAGER_CHANGE_IN_SOLO_BUSINESS');
            const target = await membershipRepository.getMember(memberId);
            if (!target)
                throw new EntityNotFoundError();
            const result = await membershipRepository.replaceManager(target.userId, actor.userId);
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
                    if (!result.newManager)
                        throw new EntityNotFoundError();
                    const promoted = await membershipRepository.getMember(result.newManager.id);
                    if (!promoted)
                        throw new EntityNotFoundError();
                    return mapMember(promoted);
                }
            }
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function setBusinessSolo(input: SetBusinessSolo): Promise<BusinessDto> {
    const actor = await requireCurrentMember();
    input = setBusinessSoloSchema.parse(input);
    const db = getPrisma();
    try {
        return await db.$transaction(async (tx) => {
            await new BusinessRepository(actor.businessId, tx).lockBusiness();
            await lockCurrentMember(actor, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            await businessSetupRequireBusiness(businessRepository);
            requireOwnerPermission(actor);
            const result = await businessRepository.setBusinessSolo(input.isSolo, actor.userId);
            if (result.status === 'updated' &&
                (result.otherActiveMemberCount > 0 || result.unresolvedCashUpCount > 0)) {
                throw new BusinessRuleError('SOLO_CHANGE_BLOCKED');
            }
            if (result.status === 'stale')
                throw new ConflictError();
            return {
                id: result.business.id,
                name: result.business.name,
                isSolo: result.business.isSolo,
                role: actor.role,
            };
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function createJoinCode(input: CreateJoinCode): Promise<{
    id: string;
    code: string;
    expiresAt: string;
    maxUses: number;
}> {
    const actor = await requireCurrentMember();
    input = createJoinCodeSchema.parse(input);
    const db = getPrisma();
    try {
        return await db.$transaction(async (tx) => {
            await new BusinessRepository(actor.businessId, tx).lockBusiness();
            await lockCurrentMember(actor, tx);
            const joinCodeRepository = new BusinessRepository(actor.businessId, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            await businessSetupRequireBusiness(businessRepository);
            requireManagementPermission(actor);
            const code = createReadableJoinCode();
            const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
            const joinCode = await joinCodeRepository.createJoinCode({
                codeHash: createHash('sha256').update(code).digest('hex'),
                createdByUserId: actor.userId,
                expiresAt,
                maxUses: input.maxUses,
            }, actor.userId);
            return {
                id: joinCode.id,
                code,
                expiresAt: joinCode.expiresAt.toISOString(),
                maxUses: joinCode.maxUses,
            };
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function listJoinCodes(): Promise<JoinCodeDto[]> {
    const actor = await requireCurrentMember();
    const db = getPrisma();
    try {
        const joinCodeRepository = new BusinessRepository(actor.businessId, db);
        const businessRepository = new BusinessRepository(actor.businessId, db);
        await businessSetupRequireBusiness(businessRepository);
        requireManagementPermission(actor);
        const now = new Date();
        return (await joinCodeRepository.listJoinCodes()).map((joinCode) => ({
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
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function revokeJoinCode(id: string): Promise<{
    id: string;
    status: 'revoked';
}> {
    const actor = await requireCurrentMember();
    id = uuid.parse(id);
    const db = getPrisma();
    try {
        return await db.$transaction(async (tx) => {
            await new BusinessRepository(actor.businessId, tx).lockBusiness();
            await lockCurrentMember(actor, tx);
            const joinCodeRepository = new BusinessRepository(actor.businessId, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            await businessSetupRequireBusiness(businessRepository);
            requireManagementPermission(actor);
            const result = await joinCodeRepository.revokeJoinCode(id, actor.userId);
            if (result.status === 'not_found' || result.status === 'stale') {
                throw new EntityNotFoundError();
            }
            return { id, status: 'revoked' };
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function redeemJoinCode(code: string): Promise<{
    role: 'STAFF';
    status: 'ACTIVE';
}> {
    const { userId } = await requireCurrentIdentity();
    code = redeemJoinCodeSchema.parse({ code }).code;
    const db = getPrisma();
    const codeHash = createHash('sha256').update(code).digest('hex');
    const result = await db.$transaction(async (tx) => {
        const businessId = await findJoinCodeBusiness(codeHash, tx);
        if (!businessId)
            return { status: 'not_found' as const };
        return new BusinessRepository(businessId, tx).redeemJoinCode(codeHash, userId, userId);
    }, { maxWait: 5000, timeout: 15000 });
    if (result.status === 'not_found' ||
        result.status === 'revoked' ||
        result.status === 'expired' ||
        result.status === 'max_uses_reached' ||
        result.status === 'usage_update_failed') {
        throw new BusinessRuleError('JOIN_CODE_INVALID');
    }
    if (result.status === 'user_already_belongs_to_a_business') {
        throw new ConflictError('BUSINESS_ALREADY_EXISTS');
    }
    if (result.status === 'user_not_found')
        throw new EntityNotFoundError();
    return { role: 'STAFF', status: 'ACTIVE' };
}
async function businessSetupRequireBusiness(businesses: BusinessRepository) {
    const business = await businesses.getBusiness();
    if (!business)
        throw new EntityNotFoundError();
    return business;
}
function mapMember(member: {
    id: string;
    role: 'OWNER' | 'MANAGER' | 'STAFF';
    status: MembershipStatus;
    joinedAt: Date;
    deactivatedAt: Date | null;
    user: {
        fullName: string;
    };
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
