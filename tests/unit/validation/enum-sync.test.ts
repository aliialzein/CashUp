import {
  AuditEntityType,
  Currency,
  PaymentMethod,
  SaleStatus,
} from '../../../src/generated/prisma/enums';
import {
  CURRENCIES,
  CREATE_SALE_STATUSES,
  PAYMENT_METHODS,
  SALE_STATUSES,
} from '../../../src/domain/money/config';
import { AUDIT_ENTITY_TYPES } from '../../../src/validation';

describe('domain enum tuples stay aligned with Prisma', () => {
  it('matches currency, payment method, and sale status enums', () => {
    expect([...CURRENCIES]).toEqual(Object.values(Currency));
    expect([...PAYMENT_METHODS]).toEqual(Object.values(PaymentMethod));
    expect([...SALE_STATUSES]).toEqual(Object.values(SaleStatus));
    expect([...AUDIT_ENTITY_TYPES]).toEqual(Object.values(AuditEntityType));
    expect(CREATE_SALE_STATUSES.every((status) => SALE_STATUSES.includes(status))).toBe(
      true,
    );
  });
});
