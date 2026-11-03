import {
  AuditAction as PersistenceAuditAction,
  AuditEntityType as PersistenceAuditEntityType,
  CashUpStatus as PersistenceCashUpStatus,
  Currency as PersistenceCurrency,
  MembershipRole as PersistenceMembershipRole,
  PaymentMethod as PersistencePaymentMethod,
  SaleStatus as PersistenceSaleStatus,
} from '../../../src/persistence';
import {
  AuditAction,
  AuditEntityType,
  CashUpStatus,
  Currency,
  MembershipRole,
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
  it('re-exports the generated Prisma enum values from persistence', () => {
    expect(PersistenceAuditAction).toEqual(AuditAction);
    expect(PersistenceAuditEntityType).toEqual(AuditEntityType);
    expect(PersistenceCashUpStatus).toEqual(CashUpStatus);
    expect(PersistenceCurrency).toEqual(Currency);
    expect(PersistenceMembershipRole).toEqual(MembershipRole);
    expect(PersistencePaymentMethod).toEqual(PaymentMethod);
    expect(PersistenceSaleStatus).toEqual(SaleStatus);
  });

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
