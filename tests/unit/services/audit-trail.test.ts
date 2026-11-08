import { AuditRepository } from '../../../src/modules/audit/audit.repository';
import type { AuditLog } from '../../../src/generated/prisma/client';
import { AuditAction, AuditEntityType } from '../../../src/generated/prisma/enums';
import type { CurrentMember } from '../../../src/modules/auth/auth.types';
import * as AuditTrail from '../../../src/modules/audit/audit.service';
import { mockRepositories, testDatabase, type RepositoryMocks } from './repository-mocks';
const actor: CurrentMember = {
    userId: '44cc1250-48f1-4ae1-b594-ff9b9bb3a4da',
    membershipId: 'c993b54f-f441-4a56-9d8e-0936ca59ccbc',
    businessId: 'c0f049c8-a170-4c72-9177-8767b1ea0904',
    role: 'STAFF',
    };
const now = new Date('2026-11-03T10:00:00.000Z');
describe('AuditTrail', () => {
    it('writes actor, action, entity and optional metadata through the transaction repository', async () => {
        const records: Array<Parameters<RepositoryMocks['audit']['append']>[0]> = [];
        const auditRow: AuditLog = {
            id: '148fdf9f-64af-4f61-a707-df61e326cf7d',
            businessId: actor.businessId,
            actorId: actor.userId,
            action: AuditAction.CASHUP_OPENED,
            entityType: AuditEntityType.CASH_UP,
            entityId: 'b7bc0d14-f58f-4fa2-8432-39d2974d133d',
            metadata: null,
            createdAt: now,
        };
        mockRepositories({
            audit: {
                append: async (entry) => {
                    records.push(entry);
                    return auditRow;
                },
            },
        });
        const trail = {
            record: (arg0: Parameters<typeof AuditTrail.recordAudit>[0], arg1: Parameters<typeof AuditTrail.recordAudit>[1], arg2: Parameters<typeof AuditTrail.recordAudit>[2]) => AuditTrail.recordAudit(arg0, arg1, arg2)
        };
        const audit = new AuditRepository(actor.businessId, testDatabase());
        await trail.record(audit, actor, {
            action: AuditAction.CASHUP_OPENED,
            entityType: AuditEntityType.CASH_UP,
            entityId: auditRow.entityId,
        });
        await trail.record(audit, actor, {
            action: AuditAction.CASHUP_RETURNED,
            entityType: AuditEntityType.CASH_UP,
            entityId: auditRow.entityId,
            metadata: { reason: 'Recount required' },
        });
        expect(records).toEqual([
            {
                actorUserId: actor.userId,
                action: AuditAction.CASHUP_OPENED,
                entityType: AuditEntityType.CASH_UP,
                entityId: auditRow.entityId,
            },
            {
                actorUserId: actor.userId,
                action: AuditAction.CASHUP_RETURNED,
                entityType: AuditEntityType.CASH_UP,
                entityId: auditRow.entityId,
                metadata: { reason: 'Recount required' },
            },
        ]);
    });
});
