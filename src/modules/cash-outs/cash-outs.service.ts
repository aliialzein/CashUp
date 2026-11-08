import { uuid } from '../../shared/validation/common';
import { cancelCashOutSchema } from './cash-outs.validation';
import { createCashOutSchema } from './cash-outs.validation';
import { idempotencyKey as idempotencyKeySchema } from '../../shared/validation/common';
import type { CreateCashOutCommand } from './cash-outs.types';
import { requireCurrentMember, lockCurrentMember } from "../auth/auth.service";
import 'server-only';
import { getPrisma } from '../../shared/db/prisma';
import { translatePersistenceError } from '../../shared/errors/translate-persistence-error';
import { CashOutRepository } from './cash-outs.repository';
import { BusinessRepository } from '../business/business.repository';
import { CashUpRepository } from '../cash-ups/cash-ups.repository';
import { AuditRepository } from '../audit/audit.repository';
import { AuditAction, AuditEntityType } from '../../generated/prisma/enums';
import { compare } from '../../domain/money/money';
import { recordAudit } from '../audit/audit.service';
import type { CashOutCreateResultDto } from './cash-outs.types';
import { ConflictError, EntityNotFoundError } from '../../shared/errors/service-errors';
import { mapCashOut } from './cash-outs.mapper';
import { lockOwnOpenCashUp } from '../cash-ups/cash-ups.workflow';
export async function createCashOut(cashUpId: string, command: CreateCashOutCommand): Promise<CashOutCreateResultDto> {
    const actor = await requireCurrentMember();
    cashUpId = uuid.parse(cashUpId);
    const db = getPrisma();
    idempotencyKeySchema.parse(command?.idempotencyKey);
    const { idempotencyKey, ...payload } = command;
    const input = createCashOutSchema.parse(payload);
    try {
        return await db.$transaction(async (tx) => {
            await lockCurrentMember(actor, tx);
            const cashOutRepository = new CashOutRepository(actor.businessId, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            const cashUpRepository = new CashUpRepository(actor.businessId, tx);
            const auditRepository = new AuditRepository(actor.businessId, tx);
            await lockOwnOpenCashUp(businessRepository, cashUpRepository, actor, cashUpId);
            const result = await cashOutRepository.create({
                ...input,
                cashUpId,
                idempotencyKey,
            });
            if (!result.created &&
                (result.cashOut.cashUpId !== cashUpId ||
                    compare(result.cashOut.amountUsd.toString(), input.amountUsd) !== 0 ||
                    compare(result.cashOut.amountLbp.toString(), input.amountLbp) !== 0 ||
                    result.cashOut.note !== (input.note ?? null) ||
                    result.cashOut.reason !== input.reason)) {
                throw new ConflictError('IDEMPOTENCY_KEY_REUSED');
            }
            if (result.created) {
                await recordAudit(auditRepository, actor, {
                    action: AuditAction.CASHOUT_CREATED,
                    entityType: AuditEntityType.CASH_OUT,
                    entityId: result.cashOut.id,
                });
            }
            return {
                cashOut: mapCashOut(result.cashOut),
                replayed: !result.created,
            };
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function cancelCashOut(cashUpId: string, cashOutId: string, reason: string): Promise<{
    cashOut: ReturnType<typeof mapCashOut>;
}> {
    const actor = await requireCurrentMember();
    cashUpId = uuid.parse(cashUpId);
    cashOutId = uuid.parse(cashOutId);
    reason = cancelCashOutSchema.parse({ reason }).reason;
    const db = getPrisma();
    try {
        return await db.$transaction(async (tx) => {
            await lockCurrentMember(actor, tx);
            const cashOutRepository = new CashOutRepository(actor.businessId, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            const cashUpRepository = new CashUpRepository(actor.businessId, tx);
            const auditRepository = new AuditRepository(actor.businessId, tx);
            const existing = await cashOutRepository.findById(cashOutId);
            if (!existing || existing.cashUpId !== cashUpId)
                throw new EntityNotFoundError();
            await lockOwnOpenCashUp(businessRepository, cashUpRepository, actor, cashUpId);
            const updated = await cashOutRepository.cancel(cashOutId, reason, actor.membershipId);
            await recordAudit(auditRepository, actor, {
                action: AuditAction.CASHOUT_CANCELLED,
                entityType: AuditEntityType.CASH_OUT,
                entityId: updated.id,
                metadata: { reason },
            });
            return { cashOut: mapCashOut(updated) };
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
