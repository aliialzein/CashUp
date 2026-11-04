import { AuditAction, AuditEntityType } from '../persistence';
import { compare } from '../domain/money';
import type { CreateCashOut } from '../validation';
import type { Actor } from './actor';
import { AuditTrail } from './audit-trail';
import type { CashOutCreateResultDto } from './dto';
import { ConflictError, EntityNotFoundError } from './errors';
import { mapCashOut } from './mappers/cash-out.mapper';
import { PermissionMatrix } from './permissions';
import { lockOwnOpenCashUp, tenantScope } from './staff-cash-up';
import { UseCaseRunner } from './use-case-runner';

export class CashOutService {
  constructor(
    private readonly runner: UseCaseRunner,
    private readonly permissions: PermissionMatrix,
    private readonly audit: AuditTrail,
  ) {}

  create(
    actor: Actor,
    cashUpId: string,
    input: CreateCashOut,
    idempotencyKey: string,
  ): Promise<CashOutCreateResultDto> {
    return this.runner.run(tenantScope(actor), async (repos) => {
      await lockOwnOpenCashUp(repos, this.permissions, actor, cashUpId);
      const result = await repos.cashOuts.create({
        ...input,
        cashUpId,
        idempotencyKey,
      });
      if (
        !result.created &&
        (result.cashOut.cashUpId !== cashUpId ||
          compare(result.cashOut.amount.toString(), input.amount) !== 0 ||
          result.cashOut.currency !== input.currency ||
          result.cashOut.reason !== input.reason)
      ) {
        throw new ConflictError('IDEMPOTENCY_KEY_REUSED');
      }
      if (result.created) {
        await this.audit.record(repos, actor, {
          action: AuditAction.CASHOUT_CREATED,
          entityType: AuditEntityType.CASH_OUT,
          entityId: result.cashOut.id,
        });
      }
      return {
        cashOut: mapCashOut(result.cashOut),
        replayed: !result.created,
      };
    });
  }

  cancel(
    actor: Actor,
    cashUpId: string,
    cashOutId: string,
    reason: string,
  ): Promise<{ cashOut: ReturnType<typeof mapCashOut> }> {
    return this.runner.run(tenantScope(actor), async (repos) => {
      const existing = await repos.cashOuts.findById(cashOutId);
      if (!existing || existing.cashUpId !== cashUpId) throw new EntityNotFoundError();
      await lockOwnOpenCashUp(repos, this.permissions, actor, cashUpId);
      const updated = await repos.cashOuts.cancel(cashOutId, reason, actor.membershipId);
      await this.audit.record(repos, actor, {
        action: AuditAction.CASHOUT_CANCELLED,
        entityType: AuditEntityType.CASH_OUT,
        entityId: updated.id,
        metadata: { reason },
      });
      return { cashOut: mapCashOut(updated) };
    });
  }
}
