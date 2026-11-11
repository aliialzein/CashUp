import { uuid } from '../../shared/validation/common';
import { editSaleSchema, confirmDeliverySchema, cancelSaleSchema, requestDeleteSaleSchema, decideSaleDeletionSchema } from './sales.validation';
import { checkSaleBalance, type SaleBalanceInput } from '../../domain/money/sale-balance';
import type { SaleRecord } from './sales.repository';
import { idempotencyKey as idempotencyKeySchema } from '../../shared/validation/common';
import type { CreateSaleCommand } from './sales.types';
import { requireCurrentMember, lockCurrentMember, requireOwnerPermission } from "../auth/auth.service";
import 'server-only';
import { getPrisma } from '../../shared/db/prisma';
import { translatePersistenceError } from '../../shared/errors/translate-persistence-error';
import { SaleRepository } from './sales.repository';
import { BusinessRepository } from '../business/business.repository';
import { CashUpRepository } from '../cash-ups/cash-ups.repository';
import { AuditRepository } from '../audit/audit.repository';
import { AuditAction, AuditEntityType, SaleStatus } from '../../generated/prisma/enums';
import { compare, type MoneyLike } from '../../domain/money/money';
import { computeDeliveryFlags } from '../../domain/money/delivery';
import type { ConfirmDeliveryInput } from './sales.validation';
import type { CreateSale, EditSale } from './sales.validation';
import { recordAudit } from '../audit/audit.service';
import type { SaleCreateResultDto, SaleMutationDto } from './sales.types';
import { BusinessRuleError, ConflictError, EntityNotFoundError, ForbiddenError } from '../../shared/errors/service-errors';
import { mapSaleLine, mapSaleDeletionRequest } from './sales.mapper';
import { assertSupportedPendingAmendments, lockOwnOpenCashUp } from '../cash-ups/cash-ups.workflow';
import { createSaleSchema, validateMergedSale } from './sales.validation';
const SALE_MONEY_FIELDS = ["businessAmountUsd","businessAmountLbp","deliveryFeeUsd","deliveryFeeLbp","tipUsd","tipLbp","discountUsd","discountLbp","totalCollectedUsd","totalCollectedLbp","changeGivenUsd","changeGivenLbp"] as const satisfies readonly (keyof SaleRecord & keyof CreateSale)[];
const SALE_ENTITY = AuditEntityType.SALE;
function assertSaleBalance(input: SaleBalanceInput, referenceRate?: MoneyLike): void {
    const balance = checkSaleBalance(input, referenceRate);
    if (!balance.balanced) {
        throw new BusinessRuleError(
            referenceRate === undefined && balance.requiresReferenceRate
                ? 'SALE_REQUIRES_REFERENCE_RATE'
                : 'SALE_NOT_BALANCED',
        );
    }
}
export async function createSale(cashUpId: string, command: CreateSaleCommand): Promise<SaleCreateResultDto> {
    const actor = await requireCurrentMember();
    cashUpId = uuid.parse(cashUpId);
    const db = getPrisma();
    idempotencyKeySchema.parse(command?.idempotencyKey);
    const { idempotencyKey, ...payload } = command;
    const parsed = createSaleSchema.safeParse(payload);
    if (!parsed.success) {
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
            const cashUp = await cashUpRepository.findById(cashUpId);
            if (!cashUp)
                throw new EntityNotFoundError();
            if (input.status === 'DELIVERED') assertSaleBalance(input, cashUp.referenceRate?.toString());
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
            if (current.status === SaleStatus.DELIVERED)
                throw new BusinessRuleError('SALE_ALREADY_DELIVERED');
            const cashUp = await cashUpRepository.findById(cashUpId);
            if (!cashUp)
                throw new EntityNotFoundError();
            const merged = validateMergedSale(current, input);
            if (!merged.success) throw merged.error;
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
export async function confirmSaleDelivery(cashUpId: string, saleId: string, input: ConfirmDeliveryInput): Promise<SaleMutationDto> {
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
            const cashUp = await cashUpRepository.findById(cashUpId);
            if (!cashUp)
                throw new EntityNotFoundError();
            const final = {
                ...input,
                deliveryFeeUsd: input.deliveryFeeUsd ?? current.deliveryFeeUsd.toString(),
                deliveryFeeLbp: input.deliveryFeeLbp ?? current.deliveryFeeLbp.toString(),
            };
            const due = {
                businessAmountUsd: current.businessAmountUsd.toString(),
                businessAmountLbp: current.businessAmountLbp.toString(),
                discountUsd: current.discountUsd.toString(),
                discountLbp: current.discountLbp.toString(),
                deliveryFeeUsd: final.deliveryFeeUsd,
                deliveryFeeLbp: final.deliveryFeeLbp,
                tipUsd: final.tipUsd,
                tipLbp: final.tipLbp,
                method: current.method,
            };
            // Validate discounts and maxima against the final order, without rejecting real discrepancies.
            createSaleSchema.parse({ ...due, ...final, status: 'DELIVERED', method: final.method });
            const actualBalance = checkSaleBalance({ ...due, ...final }, cashUp.referenceRate?.toString());
            if (!cashUp.referenceRate && actualBalance.requiresReferenceRate)
                throw new BusinessRuleError('SALE_REQUIRES_REFERENCE_RATE');
            const flags = computeDeliveryFlags(due, final, cashUp.referenceRate?.toString());
            const updated = await saleRepository.markDelivered(saleId, {
                ...final,
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
        SALE_MONEY_FIELDS.every(field => sameMoney(sale[field]?.toString() ?? null, input[field])) &&
        sale.method === input.method &&
        sale.clientNumber === (input.clientNumber ?? null) &&
        sale.note === (input.note ?? null));
}
function saleChanged(before: SaleRecord, after: SaleRecord): boolean {
    return (SALE_MONEY_FIELDS.some(field => !sameMoney(before[field]?.toString() ?? null, after[field]?.toString() ?? null)) ||
        before.method !== after.method ||
        before.clientNumber !== after.clientNumber ||
        before.note !== after.note);
}
function sameMoney(left: string | null, right: MoneyLike | null): boolean {
    if (left === null || right === null) return left === right;
    return compare(left, right) === 0;
}

/** Delivered deletion changes live reconciliation only; it does not record a refund. */
export async function requestSaleDeletion(cashUpId: string, saleId: string, reason: string): Promise<import('./sales.types').SaleDeletionResultDto> {
    const actor = await requireCurrentMember();
    cashUpId = uuid.parse(cashUpId);
    saleId = uuid.parse(saleId);
    reason = requestDeleteSaleSchema.parse({ reason }).reason;
    try {
        return await getPrisma().$transaction(async tx => {
            await lockCurrentMember(actor, tx);
            const sales = new SaleRepository(actor.businessId, tx);
            const cashUps = new CashUpRepository(actor.businessId, tx);
            const businesses = new BusinessRepository(actor.businessId, tx);
            const audit = new AuditRepository(actor.businessId, tx);
            const beforeLock = await sales.findById(saleId);
            if (!beforeLock || beforeLock.cashUpId !== cashUpId) throw new EntityNotFoundError();
            await lockOwnOpenCashUp(businesses, cashUps, actor, cashUpId);
            const current = await sales.findById(saleId);
            if (!current || current.cashUpId !== cashUpId) throw new EntityNotFoundError();
            if (current.status === SaleStatus.DELETED) throw new ConflictError('SALE_ALREADY_CANCELLED');
            if (current.status !== SaleStatus.DELIVERED) throw new BusinessRuleError('SALE_DELETION_REQUIRES_DELIVERED');
            if (current.deletionAwaiting || (await sales.listDeletionRequests(cashUpId)).some(request => request.saleId === saleId && request.status === 'AWAITING_OWNER'))
                throw new ConflictError('SALE_DELETION_REQUEST_EXISTS');
            const updated = await sales.lockForDeletion(saleId);
            const request = await sales.createDeletionRequest(cashUpId, saleId, actor.membershipId, reason);
            await recordAudit(audit, actor, { action: AuditAction.REQUEST_CREATED, entityType: AuditEntityType.REQUEST, entityId: request.id, metadata: { saleId, cashUpId, reason } });
            await recordAudit(audit, actor, { action: AuditAction.SALE_LOCKED_FOR_DELETION, entityType: SALE_ENTITY, entityId: saleId, metadata: { requestId: request.id } });
            return { saleId, sale: mapSaleLine(updated), salesSummary: await sales.countByStatus(cashUpId), request: mapSaleDeletionRequest(request) };
        }, { maxWait: 5000, timeout: 15000 });
    } catch (error) { throw translatePersistenceError(error); }
}
export async function decideSaleDeletion(requestId: string, decision: 'APPROVE' | 'REFUSE', reason: string): Promise<import('./sales.types').SaleDeletionResultDto> {
    const actor = await requireCurrentMember();
    requestId = uuid.parse(requestId);
    // Runtime validation is required even for direct service callers.
    const input = decideSaleDeletionSchema.parse({ decision, reason });
    const approved = input.decision === 'APPROVE';
    reason = input.reason;
    try {
        return await getPrisma().$transaction(async tx => {
            await lockCurrentMember(actor, tx);
            requireOwnerPermission(actor);
            const sales = new SaleRepository(actor.businessId, tx);
            const cashUps = new CashUpRepository(actor.businessId, tx);
            const businesses = new BusinessRepository(actor.businessId, tx);
            const audit = new AuditRepository(actor.businessId, tx);
            const beforeLock = await sales.findDeletionRequest(requestId);
            if (!beforeLock) throw new EntityNotFoundError();
            const cashUp = await cashUps.lockForUpdate(beforeLock.cashUpId);
            if (cashUp.status !== 'OPEN') throw new BusinessRuleError('CASHUP_NOT_OPEN');
            await assertSupportedPendingAmendments(cashUps, beforeLock.cashUpId);
            const request = await sales.findDeletionRequest(requestId);
            if (!request || !request.saleId) throw new EntityNotFoundError();
            if (request.status !== 'AWAITING_OWNER') throw new ConflictError('REQUEST_ALREADY_DECIDED');
            const current = await sales.findById(request.saleId);
            if (!current || current.cashUpId !== request.cashUpId) throw new EntityNotFoundError();
            if (current.status !== SaleStatus.DELIVERED || !current.deletionAwaiting) throw new ConflictError('SALE_DELETION_STATE_CONFLICT');
            const settings = await businesses.findSettings();
            if (!settings) throw new EntityNotFoundError();
            const isSelf = request.requestedById === actor.membershipId;
            if (isSelf && !settings.isSolo) throw new ForbiddenError('REVIEW_NOT_ALLOWED');
            const updated = approved ? await sales.markDeleted(current.id) : await sales.releaseDeletionLock(current.id);
            const resolved = await sales.decideDeletionRequest(requestId, approved, actor.membershipId, reason, approved && isSelf);
            await recordAudit(audit, actor, { action: approved ? AuditAction.REQUEST_APPROVED : AuditAction.REQUEST_REJECTED, entityType: AuditEntityType.REQUEST, entityId: requestId, metadata: { saleId: current.id, reason, selfApproved: approved && isSelf } });
            if (approved) await recordAudit(audit, actor, { action: AuditAction.SALE_DELETED, entityType: SALE_ENTITY, entityId: current.id, metadata: { requestId } });
            return { saleId: current.id, sale: mapSaleLine(updated), salesSummary: await sales.countByStatus(request.cashUpId), request: mapSaleDeletionRequest(resolved) };
        }, { maxWait: 5000, timeout: 15000 });
    } catch (error) { throw translatePersistenceError(error); }
}
/** Owner decision queue or the owning staff member's request history. */
export async function listSaleDeletionRequests(cashUpId: string): Promise<readonly import('./sales.types').SaleDeletionRequestDto[]> {
    const actor = await requireCurrentMember();
    cashUpId = uuid.parse(cashUpId);
    const cashUp = await new CashUpRepository(actor.businessId).findById(cashUpId);
    if (!cashUp || (actor.role !== 'OWNER' && cashUp.membershipId !== actor.membershipId)) throw new EntityNotFoundError();
    return (await new SaleRepository(actor.businessId).listDeletionRequests(cashUpId)).map(mapSaleDeletionRequest);
}
