import type {
  CashUpSnapshot as PersistenceCashUpSnapshot,
  ConfirmDeliveryInput as PersistenceConfirmDeliveryInput,
  CreateCashOutInput as PersistenceCreateCashOutInput,
  CreateSaleInput as PersistenceCreateSaleInput,
  CountLine as PersistenceCountLine,
  OpenCashUpInput as PersistenceOpenCashUpInput,
} from '../../../src/persistence';
import {
  buildSubmitSnapshot,
  computeDeliveryFlags,
} from '../../../src/domain/money';
import {
  confirmDeliverySchema,
  createCashOutSchema,
  createSaleSchema,
  openCashUpSchema,
  saveCountLinesSchema,
} from '../../../src/validation';

describe('validation output remains persistence-compatible', () => {
  it('accepts the server-enriched outputs without unsafe casts', () => {
    const opened = openCashUpSchema.parse({});
    const openInput = {
      ...opened,
      membershipId: 'membership-id',
    } satisfies PersistenceOpenCashUpInput;

    const sale = createSaleSchema.parse({
      status: 'DELIVERED',
      businessAmount: '10',
      totalCollected: '10',
      currency: 'USD',
      method: 'CASH',
    });
    const saleInput = {
      ...sale,
      cashUpId: 'cash-up-id',
      mixedChange: false,
      idempotencyKey: '0399f1fb-cd14-40d0-9388-7024fcdd9579',
    } satisfies PersistenceCreateSaleInput;

    const confirmation = confirmDeliverySchema.parse({
      totalCollected: '10',
      currency: 'USD',
      method: 'CASH',
    });
    const confirmationInput = {
      ...confirmation,
      ...computeDeliveryFlags(
        { totalCollected: '10', currency: 'USD', method: 'CASH' },
        confirmation,
      ),
    } satisfies PersistenceConfirmDeliveryInput;

    const cashOut = createCashOutSchema.parse({
      amount: '1',
      currency: 'USD',
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
