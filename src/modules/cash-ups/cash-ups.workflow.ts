import { requireOwnCashUpPermission } from "../auth/auth.service";
import { type BusinessRepository } from "../business/business.repository";
import { type CashUpRepository, type CashUpSnapshot } from "./cash-ups.repository";
import { CashUpStatus } from "../../generated/prisma/enums";
import type { CurrentMember } from '../auth/auth.types';
import { BusinessRuleError, EntityNotFoundError } from "../../shared/errors/service-errors";
import { editSaleSchema } from "../sales/sales.validation";
import { type SaleRepository } from "../sales/sales.repository";
import { type CashOutRepository } from "../cash-outs/cash-outs.repository";
import { buildSubmitSnapshot } from "../../domain/money/cash-up-totals";
import { type Currency } from "../../domain/money/config";
import { type CashUpRow } from "./cash-ups.mapper";
import 'server-only';
export async function lockOwnOpenCashUp(businesses: BusinessRepository, cashUps: CashUpRepository, actor: CurrentMember, cashUpId: string): Promise<void> {
    const settings = await businesses.findSettings();
    if (!settings)
        throw new EntityNotFoundError();
    requireOwnCashUpPermission(actor, settings.isSolo);
    const locked = await cashUps.lockForUpdate(cashUpId);
    const cashUp = await cashUps.findOwn(cashUpId, actor.membershipId);
    if (!cashUp)
        throw new EntityNotFoundError();
    if (locked.status !== CashUpStatus.OPEN) {
        throw new BusinessRuleError('CASHUP_NOT_OPEN');
    }
    await assertSupportedPendingAmendments(cashUps, cashUpId);
}
import 'server-only';
// Removed schema fields are historical strings, never aliases for today's pair columns.
const LEGACY_FIELDS = new Set(['businessAmount', 'deliveryFee', 'tip', 'discount', 'totalCollected', 'changeGiven', 'currency', 'changeCurrency', 'mixedChange']);
/** Called after the cash-up lock and authorization, before existing mutations. */
export async function assertSupportedPendingAmendments(cashUps: CashUpRepository, cashUpId: string): Promise<void> {
    const pending = await cashUps.pendingSaleAmendmentFields(cashUpId);
    for (const { field } of pending) {
        if (field !== null && LEGACY_FIELDS.has(field))
            throw new BusinessRuleError('LEGACY_AMENDMENT_UNSUPPORTED');
        if (field === null || !Object.hasOwn(editSaleSchema.shape, field))
            throw new BusinessRuleError('AMENDMENT_FIELD_UNSUPPORTED');
    }
}
import 'server-only';
export type SnapshotCashUp = Pick<CashUpRow, 'id' | 'floatUsd' | 'floatLbp'>;
/**
 * The supplied repositories must use the same transaction client so aggregates describe
 * the state protected by the cash-up row lock already held by the caller.
 */
export async function buildCashUpSnapshot(salesRepository: SaleRepository, cashOutsRepository: CashOutRepository, countsRepository: CashUpRepository, cashUp: SnapshotCashUp): Promise<CashUpSnapshot> {
    const sales = await salesRepository.totalsByCurrencyAndMethod(cashUp.id);
    const changes = await salesRepository.changeGivenByCurrency(cashUp.id);
    const cashOuts = (await cashOutsRepository.listByCashUp(cashUp.id)).flatMap(({ amountUsd, amountLbp, status }) => [
        { currency: 'USD' as const, total: amountUsd.toString(), status },
        { currency: 'LBP' as const, total: amountLbp.toString(), status },
    ]);
    const counts = await countsRepository.countedTotals(cashUp.id);
    const counted: Record<Currency, string> = {
        USD: counts.USD.toString(),
        LBP: counts.LBP.toString(),
    };
    return buildSubmitSnapshot({
        floatUsd: cashUp.floatUsd.toString(),
        floatLbp: cashUp.floatLbp.toString(),
        sales,
        change: changes,
        cashOuts,
        counted,
    });
}
