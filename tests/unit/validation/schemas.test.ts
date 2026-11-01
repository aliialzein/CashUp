import { randomUUID } from 'node:crypto';
import {
  auditQuerySchema,
  cancelSaleSchema,
  cashUpHistoryQuerySchema,
  confirmDeliverySchema,
  createCashOutSchema,
  createSaleSchema,
  editSaleSchema,
  listSalesQuerySchema,
  openCashUpSchema,
  requestDeleteSaleSchema,
  requestVoidCashUpSchema,
  returnCashUpSchema,
  saveCountLinesSchema,
  toValidationError,
  updateCashOutSchema,
  validateMergedCashOut,
  validateMergedSale,
  voidCashUpSchema,
} from '../../../src/validation';

const uuid = () => randomUUID();

const validSale = () => ({
  status: 'DELIVERED',
  businessAmount: '10',
  totalCollected: '10.00',
  currency: 'USD',
  method: 'CASH',
  idempotencyKey: uuid(),
});

describe('common schema rules', () => {
  it('normalizes money, applies defaults, and validates reference-rate bounds', () => {
    expect(openCashUpSchema.parse({})).toEqual({
      floatUsd: '0.00',
      floatLbp: '0.00',
    });
    expect(
      openCashUpSchema.parse({
        floatUsd: '1000000.00',
        floatLbp: '100000000000',
        referenceRate: '10000000',
      }),
    ).toEqual({
      floatUsd: '1000000.00',
      floatLbp: '100000000000.00',
      referenceRate: '10000000.00',
    });
    expect(
      openCashUpSchema.safeParse({ floatUsd: '1000000.01' }).success,
    ).toBe(false);
    expect(
      openCashUpSchema.safeParse({ floatLbp: '100000000000.01' }).success,
    ).toBe(false);
    expect(openCashUpSchema.safeParse({ referenceRate: '0' }).success).toBe(false);
    expect(openCashUpSchema.safeParse({ referenceRate: '10000000.01' }).success).toBe(
      false,
    );
    expect(openCashUpSchema.safeParse({ businessId: uuid() }).success).toBe(false);
  });

  it('trims text, bounds lengths, and rejects control characters', () => {
    expect(cancelSaleSchema.parse({ reason: '  Needs correction  ' }).reason).toBe(
      'Needs correction',
    );
    expect(cancelSaleSchema.safeParse({ reason: '  no ' }).success).toBe(false);
    expect(cancelSaleSchema.safeParse({ reason: `a${'x'.repeat(200)}` }).success).toBe(
      false,
    );
    expect(cancelSaleSchema.safeParse({ reason: 'bad\nreason' }).success).toBe(false);
    expect(createSaleSchema.safeParse({ ...validSale(), note: 'line 1\nline 2' }).success).toBe(
      true,
    );
    expect(createSaleSchema.safeParse({ ...validSale(), note: `x${'a'.repeat(500)}` }).success).toBe(
      false,
    );
    expect(createSaleSchema.safeParse({ ...validSale(), note: 'bad\ttext' }).success).toBe(
      false,
    );
    expect(createSaleSchema.safeParse({ ...validSale(), clientNumber: ' +961123456 ' }).success).toBe(
      true,
    );
    expect(createSaleSchema.safeParse({ ...validSale(), clientNumber: '+123' }).success).toBe(
      false,
    );
  });
});

describe('sale request schemas', () => {
  it('accepts a balanced sale with normalized amounts and computed fields omitted', () => {
    expect(createSaleSchema.parse(validSale())).toMatchObject({
      deliveryFee: '0.00',
      businessAmount: '10.00',
      totalCollected: '10.00',
      status: 'DELIVERED',
    });
    expect(createSaleSchema.safeParse({ ...validSale(), status: 'TO_DELIVER' }).success).toBe(
      false,
    );
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        status: 'TO_DELIVER',
        clientNumber: '+961123456',
      }).success,
    ).toBe(true);
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        amountDiffers: true,
      }).success,
    ).toBe(false);
  });

  it.each([
    'status',
    'businessAmount',
    'totalCollected',
    'currency',
    'method',
    'idempotencyKey',
  ])('requires create-sale field %s', (field) => {
    const body = validSale();
    delete body[field as keyof typeof body];
    expect(createSaleSchema.safeParse(body).success).toBe(false);
  });

  it.each(['totalCollected', 'currency', 'method'])(
    'requires confirmation field %s',
    (field) => {
      const body: Record<string, string> = {
        totalCollected: '10',
        currency: 'USD',
        method: 'CASH',
      };
      delete body[field];
      expect(confirmDeliverySchema.safeParse(body).success).toBe(false);
    },
  );

  it('checks sale amount limits, balance, due, and change pairing with stable issue paths', () => {
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        businessAmount: '1000000.00',
        totalCollected: '1000000.00',
      }).success,
    ).toBe(true);
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        changeGiven: '1000000.01',
        changeCurrency: 'USD',
        totalCollected: '1000010.01',
      }).success,
    ).toBe(false);
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        changeGiven: '100000000000.00',
        changeCurrency: 'LBP',
      }).success,
    ).toBe(true);
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        changeGiven: '100000000000.01',
        changeCurrency: 'LBP',
      }).success,
    ).toBe(false);
    expect(createSaleSchema.safeParse({ ...validSale(), businessAmount: '1000000.01' }).success).toBe(
      false,
    );
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        currency: 'LBP',
        businessAmount: '100000000000.00',
        totalCollected: '100000000000.00',
      }).success,
    ).toBe(true);
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        currency: 'LBP',
        businessAmount: '100000000000.01',
        totalCollected: '100000000000.01',
      }).success,
    ).toBe(false);
    expect(createSaleSchema.safeParse({ ...validSale(), totalCollected: '9.99' }).success).toBe(
      false,
    );
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        businessAmount: '10',
        discount: '11',
        totalCollected: '1',
      }).success,
    ).toBe(false);
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        changeGiven: '1.00',
      }).error?.issues.some((issue) => issue.path.join('.') === 'changeCurrency'),
    ).toBe(true);
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        changeCurrency: 'USD',
      }).error?.issues.some((issue) => issue.path.join('.') === 'changeGiven'),
    ).toBe(true);
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        changeGiven: '1',
        changeCurrency: 'USD',
        totalCollected: '11',
      }).success,
    ).toBe(true);
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        changeGiven: '1',
        changeCurrency: 'LBP',
        totalCollected: '10',
      }).success,
    ).toBe(true);
  });

  it('validates edit and merged-sale rules', () => {
    expect(editSaleSchema.safeParse({}).success).toBe(false);
    expect(editSaleSchema.safeParse({ note: 'Updated\nnote' }).success).toBe(true);
    expect(editSaleSchema.safeParse({ mixedChange: true }).success).toBe(false);
    expect(editSaleSchema.safeParse({ businessAmount: '100000000000.00' }).success).toBe(
      true,
    );
    expect(editSaleSchema.safeParse({ currency: 'USD', businessAmount: '1000000.01' }).success).toBe(
      false,
    );
    const current = {
      businessAmount: '10.00',
      deliveryFee: '0.00',
      totalCollected: '10.00',
      currency: 'USD' as const,
      method: 'CASH' as const,
    };
    expect(
      createSaleSchema.safeParse({
        ...validSale(),
        businessAmount: '20',
        totalCollected: '20',
      }).success,
    ).toBe(true);
    expect(validateMergedSale(current, { businessAmount: '20', totalCollected: '20' }).success).toBe(
      true,
    );
    expect(validateMergedSale(current, { businessAmount: '20' }).success).toBe(false);
    expect(
      validateMergedSale(current, { changeGiven: '1' }).error?.issues.some(
        (issue) => issue.path.join('.') === 'changeCurrency',
      ),
    ).toBe(true);
    expect(
      validateMergedSale(current, {
        tip: '1',
        totalCollected: '11',
        discount: null,
        changeGiven: null,
        changeCurrency: null,
        clientNumber: '+961123456',
        note: 'updated',
      }).success,
    ).toBe(true);
  });

  it('validates delivery confirmations and rejects computed or unrelated fields', () => {
    const good = { totalCollected: '10', currency: 'USD', method: 'CASH' };
    expect(confirmDeliverySchema.parse(good).totalCollected).toBe('10.00');
    expect(confirmDeliverySchema.safeParse({ ...good, amountDiffers: true }).success).toBe(
      false,
    );
    expect(confirmDeliverySchema.safeParse({ ...good, mixedChange: true }).success).toBe(
      false,
    );
    expect(confirmDeliverySchema.safeParse({ ...good, status: 'DELIVERED' }).success).toBe(
      false,
    );
    expect(
      confirmDeliverySchema.safeParse({ ...good, changeCurrency: 'USD' }).success,
    ).toBe(false);
    expect(
      confirmDeliverySchema.safeParse({ ...good, changeGiven: '1' }).success,
    ).toBe(false);
    expect(
      confirmDeliverySchema.safeParse({
        ...good,
        changeGiven: '1',
        changeCurrency: 'USD',
      }).success,
    ).toBe(true);
  });
});

describe('cash-out, count, and query schemas', () => {
  it('requires cash-out fields and enforces field limits and partial updates', () => {
    const cashOut = {
      amount: '1000000.00',
      currency: 'USD',
      reason: 'Drawer expense',
      idempotencyKey: uuid(),
    };
    expect(createCashOutSchema.safeParse(cashOut).success).toBe(true);
    expect(createCashOutSchema.safeParse({ ...cashOut, amount: '1000000.01' }).success).toBe(
      false,
    );
    expect(createCashOutSchema.safeParse({ ...cashOut, membershipId: uuid() }).success).toBe(
      false,
    );
    expect(createCashOutSchema.safeParse({}).success).toBe(false);
    for (const field of ['amount', 'currency', 'reason', 'idempotencyKey']) {
      const missing = { ...cashOut };
      delete missing[field as keyof typeof missing];
      expect(createCashOutSchema.safeParse(missing).success).toBe(false);
    }
    expect(
      createCashOutSchema.safeParse({
        ...cashOut,
        amount: '100000000000.00',
        currency: 'LBP',
      }).success,
    ).toBe(true);
    expect(
      createCashOutSchema.safeParse({
        ...cashOut,
        amount: '100000000000.01',
        currency: 'LBP',
      }).success,
    ).toBe(false);
    expect(updateCashOutSchema.safeParse({}).success).toBe(false);
    expect(updateCashOutSchema.safeParse({ reason: 'Changed reason' }).success).toBe(true);
    expect(updateCashOutSchema.safeParse({ amount: '100000000000.00' }).success).toBe(
      true,
    );
    expect(
      updateCashOutSchema.safeParse({ amount: '1000000.01', currency: 'USD' }).success,
    ).toBe(false);
    expect(
      validateMergedCashOut(
        { amount: '1.00', currency: 'USD', reason: 'Existing reason' },
        { amount: '1000000.01' },
      ).success,
    ).toBe(false);
    expect(
      validateMergedCashOut(
        { amount: '1.00', currency: 'LBP', reason: 'Existing reason' },
        { amount: '1000000.01' },
      ).success,
    ).toBe(true);
  });

  it('normalizes denominations, rejects duplicates, and bounds quantities', () => {
    expect(
      saveCountLinesSchema.parse({
        lines: [{ currency: 'USD', denomination: '100.00', quantity: 0 }],
      }).lines[0].denomination,
    ).toBe('100.00');
    expect(
      saveCountLinesSchema.safeParse({
        lines: [
          { currency: 'USD', denomination: '100', quantity: 1 },
          { currency: 'USD', denomination: '100.00', quantity: 2 },
        ],
      }).success,
    ).toBe(false);
    expect(
      saveCountLinesSchema.safeParse({
        lines: [{ currency: 'USD', denomination: '3', quantity: 1 }],
      }).success,
    ).toBe(false);
    for (const quantity of [-1, 1.5, 100001]) {
      expect(
        saveCountLinesSchema.safeParse({
          lines: [{ currency: 'LBP', denomination: '1000', quantity }],
        }).success,
      ).toBe(false);
    }
    expect(
      saveCountLinesSchema.safeParse({
        lines: [{ currency: 'LBP', denomination: '1000', quantity: 100000 }],
      }).success,
    ).toBe(true);
    for (const field of ['currency', 'denomination', 'quantity']) {
      const missing = { currency: 'USD', denomination: '1', quantity: 1 };
      delete missing[field as keyof typeof missing];
      expect(saveCountLinesSchema.safeParse({ lines: [missing] }).success).toBe(false);
    }
    expect(
      saveCountLinesSchema.safeParse({
        lines: Array.from({ length: 51 }, () => ({
          currency: 'USD',
          denomination: '1',
          quantity: 1,
        })),
      }).success,
    ).toBe(false);
    expect(saveCountLinesSchema.safeParse({ lines: [] }).success).toBe(false);
  });

  it('parses repeated and comma-separated statuses and bounds pagination', () => {
    expect(
      listSalesQuerySchema.parse({ statuses: ['DELIVERED', 'DELETED,TO_DELIVER'] }).statuses,
    ).toEqual(['DELIVERED', 'DELETED', 'TO_DELIVER']);
    expect(listSalesQuerySchema.parse({ statuses: 'DELIVERED,DELETED' }).statuses).toEqual([
      'DELIVERED',
      'DELETED',
    ]);
    expect(listSalesQuerySchema.safeParse({ clientNumber: '+1234567890123456' }).success).toBe(
      false,
    );
    expect(listSalesQuerySchema.safeParse({ clientNumber: '+12345678901234' }).success).toBe(
      true,
    );
    expect(listSalesQuerySchema.safeParse({ clientNumber: '+12345' }).success).toBe(true);
    expect(listSalesQuerySchema.safeParse({ statuses: 'BOGUS' }).success).toBe(false);
    expect(auditQuerySchema.parse({}).take).toBe(30);
    expect(auditQuerySchema.parse({ take: '100' }).take).toBe(100);
    expect(auditQuerySchema.safeParse({ take: '101' }).success).toBe(false);
    expect(auditQuerySchema.safeParse({ take: '0' }).success).toBe(false);
    expect(auditQuerySchema.safeParse({ cursorId: 'not-a-uuid' }).success).toBe(false);
    expect(auditQuerySchema.safeParse({ take: '1.5' }).success).toBe(false);
    expect(auditQuerySchema.safeParse({ take: 10 }).success).toBe(true);
    expect(auditQuerySchema.safeParse({ entityType: 'SALE' }).success).toBe(true);
    expect(auditQuerySchema.safeParse({ entityType: 'NOT_AUDIT_ENTITY' }).success).toBe(
      false,
    );
    expect(listSalesQuerySchema.safeParse({ statuses: ['DELIVERED', 42] }).success).toBe(
      false,
    );
    expect(
      cashUpHistoryQuerySchema.safeParse({
        from: '2026-02-02',
        to: '2026-02-01',
      }).success,
    ).toBe(false);
    expect(
      cashUpHistoryQuerySchema.safeParse({
        from: '2026-02-01',
        to: '2026-02-02',
        membershipId: uuid(),
      }).success,
    ).toBe(true);
  });
});

describe('strict body schemas and validation errors', () => {
  it('rejects server-controlled and unrecognized keys on every core request shape', () => {
    expect(openCashUpSchema.safeParse({ status: 'OPEN' }).success).toBe(false);
    expect(createSaleSchema.safeParse({ ...validSale(), membershipId: uuid() }).success).toBe(
      false,
    );
    expect(createSaleSchema.safeParse({ ...validSale(), mixedChange: false }).success).toBe(
      false,
    );
    expect(createSaleSchema.safeParse({ ...validSale(), amountDiffers: false }).success).toBe(
      false,
    );
    expect(createSaleSchema.safeParse({ ...validSale(), createdAt: 'now' }).success).toBe(
      false,
    );
    expect(confirmDeliverySchema.safeParse({
      totalCollected: '10',
      currency: 'USD',
      method: 'CASH',
      status: 'DELIVERED',
    }).success).toBe(false);
    expect(
      createCashOutSchema.safeParse({
        amount: '1',
        currency: 'USD',
        reason: 'Valid reason',
        idempotencyKey: uuid(),
        businessId: uuid(),
      }).success,
    ).toBe(false);
    expect(
      saveCountLinesSchema.safeParse({
        lines: [{ currency: 'USD', denomination: '1', quantity: 1, createdAt: 'now' }],
      }).success,
    ).toBe(false);
  });

  it.each([
    cancelSaleSchema,
    requestDeleteSaleSchema,
    requestVoidCashUpSchema,
    voidCashUpSchema,
    returnCashUpSchema,
  ])('accepts only a valid reason body', (schema) => {
    expect(schema.safeParse({ reason: 'Valid reason' }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ reason: 'Valid reason', status: 'OPEN' }).success).toBe(
      false,
    );
  });

  it('reports paths and stable codes but never echoes submitted personal values', () => {
    const privateNumber = '+961123456';
    const result = createSaleSchema.safeParse({
      ...validSale(),
      clientNumber: privateNumber,
      businessAmount: '1000000.01',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const error = toValidationError(result.error);
    const serialized = JSON.stringify(error);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.issues).toContainEqual({
      path: ['businessAmount'],
      code: 'AMOUNT_EXCEEDS_MAX',
    });
    expect(serialized).not.toContain(privateNumber);
    expect(serialized).not.toContain('1000000.01');
    expect(serialized).not.toContain('message');
    const uncustomized = openCashUpSchema.safeParse({ floatUsd: 4 }).error;
    expect(uncustomized).toBeDefined();
    expect(toValidationError(uncustomized!).issues[0].code).toBe('invalid_type');
  });
});
