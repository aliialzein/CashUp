import { uuid } from '../../shared/validation/common';
import { editSaleSchema, confirmDeliverySchema, cancelSaleSchema } from './sales.validation';
import { checkSaleBalance } from '../../domain/money/sale-balance';
import type { SaleRecord } from './sales.repository';
import { idempotencyKey as idempotencyKeySchema } from '../../shared/validation/common';
import type { CreateSaleCommand } from './sales.types';
import { requireCurrentMember, lockCurrentMember } from "../auth/auth.service";
import 'server-only';
import { getPrisma } from '../../shared/db/prisma';
import { translatePersistenceError } from '../../shared/errors/translate-persistence-error';
import { SaleRepository } from './sales.repository';
import { BusinessRepository } from '../business/business.repository';
import { CashUpRepository } from '../cash-ups/cash-ups.repository';
import { AuditRepository } from '../audit/audit.repository';
import { AuditAction, AuditEntityType, SaleStatus } from '../../generated/prisma/enums';
import { compare } from '../../domain/money/money';
import { computeDeliveryFlags } from '../../domain/money/delivery';
import type { ConfirmDelivery } from './sales.validation';
import type { CreateSale, EditSale } from './sales.validation';
import { recordAudit } from '../audit/audit.service';
import type { SaleCreateResultDto, SaleMutationDto } from './sales.types';
import { BusinessRuleError, ConflictError, EntityNotFoundError } from '../../shared/errors/service-errors';
import { mapSaleLine } from './sales.mapper';
import { lockOwnOpenCashUp } from '../cash-ups/cash-ups.workflow';
import { createSaleSchema, validateMergedSale } from './sales.validation';
const SALE_MONEY_FIELDS = ["businessAmountUsd","businessAmountLbp","deliveryFeeUsd","deliveryFeeLbp","tipUsd","tipLbp","discountUsd","discountLbp","totalCollectedUsd","totalCollectedLbp","changeGivenUsd","changeGivenLbp"] as const satisfies readonly (keyof SaleRecord & keyof CreateSale)[];
const SALE_ENTITY = AuditEntityType.SALE;
export async function createSale(cashUpId: string, command: CreateSaleCommand): Promise<SaleCreateResultDto> {
    const actor = await requireCurrentMember();
    cashUpId = uuid.parse(cashUpId);
    const db = getPrisma();
    idempotencyKeySchema.parse(command?.idempotencyKey);
    const { idempotencyKey, ...payload } = command;
    const parsed = createSaleSchema.safeParse(payload);
    if (!parsed.success) {
        if (parsed.error.issues.some(issue => issue.message === 'SALE_NOT_BALANCED')) throw new BusinessRuleError('SALE_NOT_BALANCED');
        throw parsed.error;
    }
    const input = parsed.data;
    try {
        return await db.$transaction(async (tx) => {
            await lockCurrentMember(actor, tx);
            const saleRepository = new SaleRepository(actor.businessId, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            const cashUpRepository = new CashUpRepository(actor.businessId, tx);
            const auditRepository = new AuditRepository(actor.businessId, tx);
            await lockOwnOpenCashUp(businessRepository, cashUpRepository, actor, cashUpId);
            const result = await saleRepository.create({
                ...input,
                cashUpId,
                idempotencyKey,
            });
            if (!result.created && result.sale.cashUpId !== cashUpId) throw new ConflictError('IDEMPOTENCY_KEY_REUSED');
            if (!result.created && (result.sale.isEdited || await saleRepository.hasReplayChanges(result.sale.id))) {
                throw new ConflictError('IDEMPOTENCY_REPLAY_UNVERIFIABLE');
            }
            if (!result.created &&
                !sameSaleInput(result.sale, input, cashUpId)) {
                throw new ConflictError('IDEMPOTENCY_KEY_REUSED');
            }
            if (result.created) {
                await recordAudit(auditRepository, actor, {
                    action: AuditAction.SALE_CREATED,
                    entityType: SALE_ENTITY,
                    entityId: result.sale.id,
                });
            }
            return {
                saleId: result.sale.id,
                sale: mapSaleLine(result.sale),
                salesSummary: await saleRepository.countByStatus(cashUpId),
                replayed: !result.created,
            };
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function editSale(cashUpId: string, saleId: string, input: EditSale): Promise<SaleMutationDto> {
    const actor = await requireCurrentMember();
    cashUpId = uuid.parse(cashUpId);
    saleId = uuid.parse(saleId);
    input = editSaleSchema.parse(input);
    const db = getPrisma();
    try {
        return await db.$transaction(async (tx) => {
            await lockCurrentMember(actor, tx);
            const saleRepository = new SaleRepository(actor.businessId, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            const cashUpRepository = new CashUpRepository(actor.businessId, tx);
            const auditRepository = new AuditRepository(actor.businessId, tx);
            const beforeLock = await saleRepository.findById(saleId);
            if (!beforeLock || beforeLock.cashUpId !== cashUpId)
                throw new EntityNotFoundError();
            await lockOwnOpenCashUp(businessRepository, cashUpRepository, actor, cashUpId);
            const current = await saleRepository.findById(saleId);
            if (!current || current.cashUpId !== cashUpId)
                throw new EntityNotFoundError();
            if (current.status === SaleStatus.DELETED) {
                throw new ConflictError('SALE_ALREADY_CANCELLED');
            }
            if (current.deletionAwaiting)
                throw new ConflictError();
            const merged = validateMergedSale({
                businessAmountUsd: current.businessAmountUsd.toString(),
                businessAmountLbp: current.businessAmountLbp.toString(),
                deliveryFeeUsd: current.deliveryFeeUsd.toString(),
                deliveryFeeLbp: current.deliveryFeeLbp.toString(),
                tipUsd: current.tipUsd.toString(),
                tipLbp: current.tipLbp.toString(),
                discountUsd: current.discountUsd.toString(),
                discountLbp: current.discountLbp.toString(),
                totalCollectedUsd: current.totalCollectedUsd.toString(),
                totalCollectedLbp: current.totalCollectedLbp.toString(),
                changeGivenUsd: current.changeGivenUsd.toString(),
                changeGivenLbp: current.changeGivenLbp.toString(),
                method: current.method,
                status: current.status,
                clientNumber: current.clientNumber,
                note: current.note,
            }, input);
            if (!merged.success)
                throw new BusinessRuleError('SALE_NOT_BALANCED');
            const balance = checkSaleBalance(merged.data);
            if (!balance.balanced)
                throw new BusinessRuleError('SALE_NOT_BALANCED');
            const updated = await saleRepository.edit(saleId, input, actor.membershipId);
            if (saleChanged(current, updated)) {
                await recordAudit(auditRepository, actor, {
                    action: AuditAction.SALE_EDITED,
                    entityType: SALE_ENTITY,
                    entityId: saleId,
                });
            }
            return {
                saleId,
                sale: mapSaleLine(updated),
                salesSummary: await saleRepository.countByStatus(cashUpId),
            };
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function confirmSaleDelivery(cashUpId: string, saleId: string, input: ConfirmDelivery): Promise<SaleMutationDto> {
    const actor = await requireCurrentMember();
    cashUpId = uuid.parse(cashUpId);
    saleId = uuid.parse(saleId);
    input = confirmDeliverySchema.parse(input);
    const db = getPrisma();
    try {
        return await db.$transaction(async (tx) => {
            await lockCurrentMember(actor, tx);
            const saleRepository = new SaleRepository(actor.businessId, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            const cashUpRepository = new CashUpRepository(actor.businessId, tx);
            const auditRepository = new AuditRepository(actor.businessId, tx);
            const beforeLock = await saleRepository.findById(saleId);
            if (!beforeLock || beforeLock.cashUpId !== cashUpId)
                throw new EntityNotFoundError();
            await lockOwnOpenCashUp(businessRepository, cashUpRepository, actor, cashUpId);
            const current = await saleRepository.findById(saleId);
            if (!current || current.cashUpId !== cashUpId)
                throw new EntityNotFoundError();
            if (current.status !== SaleStatus.TO_DELIVER) {
                throw new BusinessRuleError('SALE_NOT_AWAITING_DELIVERY');
            }
            const flags = computeDeliveryFlags({
                totalCollectedUsd: current.totalCollectedUsd.toString(),
                totalCollectedLbp: current.totalCollectedLbp.toString(),
                method: current.method,
            }, input);
            const updated = await saleRepository.markDelivered(saleId, {
                ...input,
                ...flags,
            });
            await recordAudit(auditRepository, actor, {
                action: AuditAction.SALE_DELIVERED,
                entityType: SALE_ENTITY,
                entityId: saleId,
            });
            return {
                saleId,
                sale: mapSaleLine(updated),
                salesSummary: await saleRepository.countByStatus(cashUpId),
            };
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
export async function cancelSale(cashUpId: string, saleId: string, reason: string): Promise<SaleMutationDto> {
    const actor = await requireCurrentMember();
    cashUpId = uuid.parse(cashUpId);
    saleId = uuid.parse(saleId);
    reason = cancelSaleSchema.parse({ reason }).reason;
    const db = getPrisma();
    try {
        return await db.$transaction(async (tx) => {
            await lockCurrentMember(actor, tx);
            const saleRepository = new SaleRepository(actor.businessId, tx);
            const businessRepository = new BusinessRepository(actor.businessId, tx);
            const cashUpRepository = new CashUpRepository(actor.businessId, tx);
            const auditRepository = new AuditRepository(actor.businessId, tx);
            const beforeLock = await saleRepository.findById(saleId);
            if (!beforeLock || beforeLock.cashUpId !== cashUpId)
                throw new EntityNotFoundError();
            await lockOwnOpenCashUp(businessRepository, cashUpRepository, actor, cashUpId);
            const current = await saleRepository.findById(saleId);
            if (!current || current.cashUpId !== cashUpId)
                throw new EntityNotFoundError();
            if (current.status === SaleStatus.DELETED) {
                throw new ConflictError('SALE_ALREADY_CANCELLED');
            }
            if (current.status !== SaleStatus.TO_DELIVER) {
                throw new BusinessRuleError('SALE_CANNOT_BE_CANCELLED');
            }
            const cancelled = await saleRepository.cancelToDeliver(saleId, reason);
            await recordAudit(auditRepository, actor, {
                action: AuditAction.SALE_CANCELLED,
                entityType: SALE_ENTITY,
                entityId: saleId,
                metadata: { reason },
            });
            return {
                saleId,
                sale: mapSaleLine(cancelled),
                salesSummary: await saleRepository.countByStatus(cashUpId),
            };
        }, { maxWait: 5000, timeout: 15000 });
    }
    catch (error) {
        throw translatePersistenceError(error);
    }
}
function sameSaleInput(sale: SaleRecord, input: CreateSale, cashUpId: string): boolean {
    return (sale.cashUpId === cashUpId &&
        sale.status === input.status &&
        SALE_MONEY_FIELDS.every(field => sameMoney(sale[field].toString(), input[field])) &&
        sale.method === input.method &&
        sale.clientNumber === (input.clientNumber ?? null) &&
        sale.note === (input.note ?? null));
}
function saleChanged(before: SaleRecord, after: SaleRecord): boolean {
    return (SALE_MONEY_FIELDS.some(field => !sameMoney(before[field].toString(), after[field].toString())) ||
        before.method !== after.method ||
        before.clientNumber !== after.clientNumber ||
        before.note !== after.note);
}
function sameMoney(left: string, right: string): boolean {
    return compare(left, right) === 0;
}

