import { services as testServices } from '../services/service-test-support';
import { repositoriesForTest } from './test-support';
import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import { MembershipRole, MembershipStatus } from '../../../src/generated/prisma/enums';
import { prisma, resetDatabase, seedBusinesses, type Fixtures } from './test-support';
const describeIfDb = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;
describeIfDb('business setup persistence against PostgreSQL', () => {
    jest.setTimeout(20000);
    let fixtures: Fixtures;
    beforeEach(async () => {
        await resetDatabase();
        fixtures = await seedBusinesses();
    });
    afterAll(async () => {
        await prisma.$disconnect();
    });
    async function createUser(email: string) {
        return prisma.user.create({ data: { email, fullName: email } });
    }
    async function resolveActor(userId: string, businessId: string) {
        return testServices.memberFor(userId, businessId);
    }
    async function createJoinCode(businessId: string, creatorUserId: string, overrides: {
        expiresAt?: Date;
        maxUses?: number;
    } = {}) {
        return prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId }).businessId, tx);
            return repos.joinCodes.createJoinCode({
                codeHash: randomUUID(),
                createdByUserId: creatorUserId,
                expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60000),
                maxUses: overrides.maxUses ?? 1,
            }, creatorUserId);
        }, { maxWait: 5000, timeout: 15000 });
    }
    it('rejects a second ACTIVE MANAGER at the partial unique index', async () => {
        const { businessA } = fixtures;
        const secondManager = await createUser('second-manager@example.test');
        await expect(prisma.membership.create({
            data: {
                businessId: businessA.id,
                userId: secondManager.id,
                role: MembershipRole.MANAGER,
            },
        })).rejects.toThrow();
    });
    it('prevents deactivation and role change of the last ACTIVE OWNER', async () => {
        const { businessA } = fixtures;
        const repos = repositoriesForTest(({ businessId: businessA.id }).businessId);
        await expect(prisma.$transaction(async (tx) => {
            const transactionRepos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return transactionRepos.memberships.setMemberStatus(businessA.members.owner.id, MembershipStatus.INACTIVE, businessA.members.owner.userId);
        }, { maxWait: 5000, timeout: 15000 })).resolves.toMatchObject({ status: 'last_active_owner' });
        await expect(prisma.$transaction(async (tx) => {
            const transactionRepos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return transactionRepos.memberships.changeMemberRole(businessA.members.owner.id, MembershipRole.STAFF, businessA.members.owner.userId);
        }, { maxWait: 5000, timeout: 15000 })).resolves.toMatchObject({ status: 'last_active_owner' });
        expect(await repos.memberships.findById(businessA.members.owner.id)).toMatchObject({
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
        });
    });
    it('creates a business with its owner and audits the setup atomically', async () => {
        const user = await createUser('new-owner@example.test');
        const created = await testServices.businessSetup.createBusiness(user.id, {
            name: 'New business',
            isSolo: true,
        });
        expect(created).toMatchObject({
            name: 'New business',
            isSolo: true,
            role: MembershipRole.OWNER,
        });
        expect(await prisma.membership.findUnique({ where: { userId: user.id } })).toMatchObject({ businessId: created.id, role: MembershipRole.OWNER });
        expect(await prisma.auditLog.count({ where: { businessId: created.id } })).toBe(2);
    });
    it('redeems a multi-use code twice and rejects a repeat redemption by an existing member', async () => {
        const { businessA } = fixtures;
        const services = testServices;
        const owner = await resolveActor(businessA.members.owner.userId, businessA.id);
        const code = await services.businessSetup.createJoinCode(owner, {
            expiresInDays: 7,
            maxUses: 2,
        });
        const firstUser = await createUser('service-redemption-one@example.test');
        const secondUser = await createUser('service-redemption-two@example.test');
        await expect(services.businessSetup.redeemJoinCode(firstUser.id, code.code)).resolves.toEqual({
            role: 'STAFF',
            status: 'ACTIVE',
        });
        await expect(services.businessSetup.redeemJoinCode(secondUser.id, code.code)).resolves.toEqual({
            role: 'STAFF',
            status: 'ACTIVE',
        });
        await expect(services.businessSetup.redeemJoinCode(firstUser.id, code.code)).rejects.toMatchObject({
            code: 'JOIN_CODE_INVALID',
        });
        expect(await prisma.joinCode.findFirstOrThrow({ where: { businessId: businessA.id } })).toMatchObject({ usedCount: 2, maxUses: 2 });
    });
    it('refuses to deactivate a member with an OPEN cash-up', async () => {
        const { businessA } = fixtures;
        const services = testServices;
        const owner = await resolveActor(businessA.members.owner.userId, businessA.id);
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessA.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        await expect(services.businessSetup.deactivateMember(owner, businessA.members.staff1.id)).rejects.toMatchObject({ code: 'MEMBER_HAS_UNRESOLVED_CASHUPS' });
        expect(await prisma.membership.findUniqueOrThrow({
            where: { id: businessA.members.staff1.id },
        })).toMatchObject({ status: MembershipStatus.ACTIVE });
    });
    it('replaces the manager through the service and keeps the previous manager active as STAFF', async () => {
        const { businessA } = fixtures;
        const services = testServices;
        const owner = await resolveActor(businessA.members.owner.userId, businessA.id);
        await services.businessSetup.replaceManager(owner, businessA.members.staff1.id);
        expect(await prisma.membership.findUniqueOrThrow({
            where: { id: businessA.members.manager.id },
        })).toMatchObject({ role: MembershipRole.STAFF, status: MembershipStatus.ACTIVE });
        expect(await prisma.membership.findUniqueOrThrow({
            where: { id: businessA.members.staff1.id },
        })).toMatchObject({ role: MembershipRole.MANAGER, status: MembershipStatus.ACTIVE });
    });
    it('refuses solo mode with another active member and with a pending cash-up', async () => {
        const services = testServices;
        const { businessA } = fixtures;
        const ownerA = await resolveActor(businessA.members.owner.userId, businessA.id);
        await expect(services.businessSetup.setBusinessSolo(ownerA, { isSolo: true })).rejects.toMatchObject({ code: 'SOLO_CHANGE_BLOCKED' });
        const soloOwnerUser = await createUser('pending-solo-owner@example.test');
        const created = await services.businessSetup.createBusiness(soloOwnerUser.id, {
            name: 'Pending solo',
            isSolo: false,
        });
        const owner = await resolveActor(soloOwnerUser.id, created.id);
        const ownerMembership = await prisma.membership.findUniqueOrThrow({
            where: { userId: soloOwnerUser.id },
        });
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: created.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: ownerMembership.id });
        }, { maxWait: 5000, timeout: 15000 });
        await expect(services.businessSetup.setBusinessSolo(owner, { isSolo: true })).rejects.toMatchObject({ code: 'SOLO_CHANGE_BLOCKED' });
        expect(await prisma.business.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({
            isSolo: false,
        });
    });
    it('rejects expired, fully-used, and revoked join codes', async () => {
        const { businessA } = fixtures;
        const expiredCode = await createJoinCode(businessA.id, businessA.members.owner.userId, {
            expiresAt: new Date(Date.now() - 1000),
        });
        const expiredUser = await createUser('expired-redeemer@example.test');
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.joinCodes.redeemJoinCode(expiredCode.codeHash, expiredUser.id, expiredUser.id);
        }, { maxWait: 5000, timeout: 15000 })).resolves.toEqual({ status: 'expired' });
        const usedCode = await createJoinCode(businessA.id, businessA.members.owner.userId, {
            maxUses: 2,
        });
        const firstUser = await createUser('first-redeemer@example.test');
        const secondUser = await createUser('second-redeemer@example.test');
        const thirdUser = await createUser('third-redeemer@example.test');
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.joinCodes.redeemJoinCode(usedCode.codeHash, firstUser.id, firstUser.id);
        }, { maxWait: 5000, timeout: 15000 })).resolves.toMatchObject({ status: 'redeemed' });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.joinCodes.redeemJoinCode(usedCode.codeHash, secondUser.id, secondUser.id);
        }, { maxWait: 5000, timeout: 15000 })).resolves.toMatchObject({ status: 'redeemed' });
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.joinCodes.redeemJoinCode(usedCode.codeHash, thirdUser.id, thirdUser.id);
        }, { maxWait: 5000, timeout: 15000 })).resolves.toEqual({ status: 'max_uses_reached' });
        expect(await prisma.joinCode.findUniqueOrThrow({ where: { id: usedCode.id } })).toMatchObject({
            usedCount: 2,
            maxUses: 2,
        });
        const revokedCode = await createJoinCode(businessA.id, businessA.members.owner.userId);
        await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.joinCodes.revokeJoinCode(revokedCode.id, businessA.members.owner.userId);
        }, { maxWait: 5000, timeout: 15000 });
        const revokedUser = await createUser('revoked-redeemer@example.test');
        await expect(prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.joinCodes.redeemJoinCode(revokedCode.codeHash, revokedUser.id, revokedUser.id);
        }, { maxWait: 5000, timeout: 15000 })).resolves.toEqual({ status: 'revoked' });
    });
    it('serializes competing redemptions for the last remaining use', async () => {
        const { businessA } = fixtures;
        const joinCode = await createJoinCode(businessA.id, businessA.members.owner.userId, {
            maxUses: 1,
        });
        const firstUser = await createUser('concurrent-first@example.test');
        const secondUser = await createUser('concurrent-second@example.test');
        const results = await Promise.all([
            prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
                return repos.joinCodes.redeemJoinCode(joinCode.codeHash, firstUser.id, firstUser.id);
            }, { maxWait: 5000, timeout: 15000 }),
            prisma.$transaction(async (tx) => {
                const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
                return repos.joinCodes.redeemJoinCode(joinCode.codeHash, secondUser.id, secondUser.id);
            }, { maxWait: 5000, timeout: 15000 }),
        ]);
        expect(results.map((result) => result.status).sort()).toEqual([
            'max_uses_reached',
            'redeemed',
        ]);
        expect(await prisma.joinCode.findUniqueOrThrow({ where: { id: joinCode.id } })).toMatchObject({ usedCount: 1, maxUses: 1 });
    });
    it('swaps managers without violating the index and aborts when the old manager has an OPEN cash-up', async () => {
        const { businessA } = fixtures;
        const replaced = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.memberships.replaceManager(businessA.members.staff1.userId, businessA.members.owner.userId);
        }, { maxWait: 5000, timeout: 15000 });
        expect(replaced).toMatchObject({ status: 'replaced' });
        expect(await prisma.membership.count({
            where: {
                businessId: businessA.id,
                role: MembershipRole.MANAGER,
                status: MembershipStatus.ACTIVE,
            },
        })).toBe(1);
        expect(await prisma.membership.findUniqueOrThrow({
            where: { id: businessA.members.manager.id },
        })).toMatchObject({ role: MembershipRole.STAFF, status: MembershipStatus.ACTIVE });
        expect(await prisma.membership.findUniqueOrThrow({
            where: { id: businessA.members.staff1.id },
        })).toMatchObject({ role: MembershipRole.MANAGER, status: MembershipStatus.ACTIVE });
        await expect(repositoriesForTest(({ businessId: businessA.id }).businessId).audit.list({
            entityType: 'MEMBERSHIP',
        })).resolves.toHaveLength(2);
        const openCashUp = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.cashUps.open({ membershipId: businessA.members.staff1.id });
        }, { maxWait: 5000, timeout: 15000 });
        const aborted = await prisma.$transaction(async (tx) => {
            const repos = repositoriesForTest(({ businessId: businessA.id }).businessId, tx);
            return repos.memberships.replaceManager(businessA.members.staff2.userId, businessA.members.owner.userId);
        }, { maxWait: 5000, timeout: 15000 });
        expect(aborted).toEqual({
            status: 'old_manager_has_unresolved_cashups',
            oldManagerUnresolvedCashUpCount: 1,
        });
        expect(await prisma.cashUp.findUniqueOrThrow({ where: { id: openCashUp.id } })).toMatchObject({
            status: 'OPEN',
        });
        expect(await prisma.membership.findUniqueOrThrow({
            where: { id: businessA.members.staff1.id },
        })).toMatchObject({ role: MembershipRole.MANAGER });
        expect(await prisma.membership.findUniqueOrThrow({
            where: { id: businessA.members.staff2.id },
        })).toMatchObject({ role: MembershipRole.STAFF });
    });
});
