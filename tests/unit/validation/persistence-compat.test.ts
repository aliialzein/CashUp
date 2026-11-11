import type { CashUpSnapshot as PersistenceCashUpSnapshot, OpenCashUpInput as PersistenceOpenCashUpInput } from '../../../src/modules/cash-ups/cash-ups.repository';
import type { ConfirmDeliveryInput as PersistenceConfirmDeliveryInput, CreateSaleInput as PersistenceCreateSaleInput } from '../../../src/modules/sales/sales.repository';
import type { CreateCashOutInput as PersistenceCreateCashOutInput } from '../../../src/modules/cash-outs/cash-outs.repository';
import type { CountLine as PersistenceCountLine } from '../../../src/modules/cash-ups/cash-ups.repository';
import { buildSubmitSnapshot } from '../../../src/domain/money/cash-up-totals';
import { computeDeliveryFlags } from '../../../src/domain/money/delivery';
import { openCashUpSchema, saveCountLinesSchema } from '../../../src/modules/cash-ups/cash-ups.validation';
import { confirmDeliverySchema } from '../../../src/modules/sales/sales.validation';
import { createCashOutSchema } from '../../../src/modules/cash-outs/cash-outs.validation';
import { createSaleSchema } from '../../../src/modules/sales/sales.validation';
describe('validation output remains persistence-compatible', () => {
    it('accepts the server-enriched outputs without unsafe casts', () => {
        const opened = openCashUpSchema.parse({});
        const openInput = {
            ...opened,
            membershipId: 'membership-id',
        } satisfies PersistenceOpenCashUpInput;
        const sale = createSaleSchema.parse({
            businessAmountLbp: '0.00',
            deliveryFeeUsd: '0.00',
            deliveryFeeLbp: '0.00',
            tipUsd: '0.00',
            tipLbp: '0.00',
            discountUsd: '0.00',
            discountLbp: '0.00',
            totalCollectedLbp: '0.00',
            changeGivenUsd: '0.00',
            changeGivenLbp: '0.00',
            status: 'DELIVERED',
            businessAmountUsd: '10',
            totalCollectedUsd: '10',
            method: 'CASH',
        });
        const saleInput = {
            ...sale,
            cashUpId: 'cash-up-id',
            idempotencyKey: '0399f1fb-cd14-40d0-9388-7024fcdd9579',
        } satisfies PersistenceCreateSaleInput;
        const confirmation = confirmDeliverySchema.parse({ tipUsd: '0.00', tipLbp: '0.00',
            totalCollectedLbp: '0.00',
            changeGivenUsd: '0.00',
            changeGivenLbp: '0.00',
            totalCollectedUsd: '10',
            method: 'CASH',
        });
        const confirmationInput = {
            ...confirmation,
            deliveryFeeUsd: '0', deliveryFeeLbp: '0',
            ...computeDeliveryFlags({
                businessAmountUsd: '10', businessAmountLbp: '0', deliveryFeeUsd: '0', deliveryFeeLbp: '0',
                tipUsd: '0', tipLbp: '0', discountUsd: '0', discountLbp: '0', method: null,
            }, confirmation),
        } satisfies PersistenceConfirmDeliveryInput;
        const cashOut = createCashOutSchema.parse({
            amountLbp: '0.00', note: null,
            amountUsd: '1',
            reason: 'Valid reason',
        });
        const cashOutInput = {
            ...cashOut,
            cashUpId: 'cash-up-id',
            idempotencyKey: '0399f1fb-cd14-40d0-9388-7024fcdd9579',
        } satisfies PersistenceCreateCashOutInput;
        const countLine = saveCountLinesSchema.parse({
            lines: [{ currency: 'USD', denomination: '100', quantity: 1 }],
        }).lines[0] satisfies PersistenceCountLine;
        const snapshot = buildSubmitSnapshot({
            floatUsd: '0',
            floatLbp: '0',
            sales: [],
            change: [],
            cashOuts: [],
            counted: { USD: '0', LBP: '0' },
        }) satisfies PersistenceCashUpSnapshot;
        expect([
            openInput,
            saleInput,
            confirmationInput,
            cashOutInput,
            countLine,
            snapshot,
        ]).toHaveLength(6);
    });
});
