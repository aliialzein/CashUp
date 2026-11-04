import type { AuditLog } from '../../../src/generated/prisma/client';
import { AuditAction, AuditEntityType } from '../../../src/persistence';
import { ACTOR_BRAND } from '../../../src/services/actor';
import type { Actor } from '../../../src/services/actor';
import { AuditTrail } from '../../../src/services/audit-trail';
import {
  markTransactionRepositories,
  type ServiceRepositories,
} from '../../../src/services/ports';
import { serviceRepositories } from './service-repositories';

const actor: Actor = {
  userId: '44cc1250-48f1-4ae1-b594-ff9b9bb3a4da',
  membershipId: 'c993b54f-f441-4a56-9d8e-0936ca59ccbc',
  businessId: 'c0f049c8-a170-4c72-9177-8767b1ea0904',
  role: 'STAFF',
  [ACTOR_BRAND]: true,
};

const now = new Date('2026-11-03T10:00:00.000Z');

describe('AuditTrail', () => {
  it('writes actor, action, entity and optional metadata through the transaction repository', async () => {
    const records: Array<Parameters<ServiceRepositories['audit']['append']>[0]> = [];
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
    const repositories = serviceRepositories({
      audit: {
        append: async (entry) => {
          records.push(entry);
          return auditRow;
        },
      },
    });
    const trail = new AuditTrail();
    const transactionRepositories = markTransactionRepositories(repositories);

    await trail.record(transactionRepositories, actor, {
      action: AuditAction.CASHUP_OPENED,
      entityType: AuditEntityType.CASH_UP,
      entityId: auditRow.entityId,
    });
    await trail.record(transactionRepositories, actor, {
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
