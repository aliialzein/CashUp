import { Prisma } from '../../../src/generated/prisma/client';
import type {
  CashOut,
  CashUp,
  CountEntry,
  Membership,
  Sale,
} from '../../../src/generated/prisma/client';
import { ACTOR_BRAND } from '../../../src/services/actor';
import type { Actor } from '../../../src/services/actor';
import { CashOutService } from '../../../src/services/cash-out.service';
import { CashUpApprovalPolicy } from '../../../src/services/cash-up-approval-policy';
import { CashUpLifecycleService } from '../../../src/services/cash-up-lifecycle.service';
import { CountService } from '../../../src/services/count.service';
import {
  BusinessRuleError,
  ConflictError,
  EntityNotFoundError,
  ForbiddenError,
} from '../../../src/services/errors';
import { PermissionMatrix } from '../../../src/services/permissions';
import { DuplicateError } from '../../../src/persistence';
import { SaleService } from '../../../src/services/sale.service';
import { SubmitSnapshotBuilder } from '../../../src/services/submit-snapshot-builder';
import type { ServiceRepositories } from '../../../src/services/ports';
import { markTransactionRepositories } from '../../../src/services/ports';
import { UseCaseRunner } from '../../../src/services/use-case-runner';
import { editSaleSchema } from '../../../src/validation';
import { mapHttpError } from '../../../src/http/errorMapper';
import { serviceRepositories } from './service-repositories';

const businessId = 'c0f049c8-a170-4c72-9177-8767b1ea0904';
const cashUpId = 'b7bc0d14-f58f-4fa2-8432-39d2974d133d';
const saleId = '49536994-7425-4270-a31c-b44fae383c4a';
const membershipId = 'c993b54f-f441-4a56-9d8e-0936ca59ccbc';
const idempotencyKey = '9ebfd3da-4a78-4201-8123-cb64ee681245';

function actor(role: Actor['role'] = 'STAFF', id = membershipId): Actor {
  return {
    userId: '44cc1250-48f1-4ae1-b594-ff9b9bb3a4da',
    membershipId: id,
    businessId,
    role,
    [ACTOR_BRAND]: true,
  };
}

function cashUp(status: CashUp['status'] = 'OPEN', ownerId = membershipId): CashUp {
  const now = new Date('2026-11-03T10:00:00.000Z');
  return {
    id: cashUpId,
    businessId,
    membershipId: ownerId,
    status,
    floatUsd: new Prisma.Decimal('0.00'),
    floatLbp: new Prisma.Decimal('0.00'),
    referenceRate: null,
    openedAt: now,
    countStartedAt: null,
    closedAt: null,
    approvedAt: null,
    voidedAt: null,
    updatedAt: now,
    approvedById: null,
    selfApproved: false,
    returnReason: null,
    voidReason: null,
    lastSaleNumber: 0,
    expectedUsd: null,
    expectedLbp: null,
    countedUsd: null,
    countedLbp: null,
    gapUsd: null,
    gapLbp: null,
  };
}

function sale(
  status: Sale['status'] = 'DELIVERED',
  values: Partial<Sale> = {},
): Sale {
  const now = new Date('2026-11-03T10:00:00.000Z');
  return {
    id: saleId,
    businessId,
    cashUpId,
    saleNumber: 1,
    status,
    businessAmount: new Prisma.Decimal('10.00'),
    deliveryFee: new Prisma.Decimal('0.00'),
    tip: null,
    discount: null,
    totalCollected: new Prisma.Decimal('10.00'),
    currency: 'USD',
    method: 'CASH',
    changeGiven: null,
    changeCurrency: null,
    clientNumber: null,
    note: null,
    mixedChange: false,
    amountDiffers: false,
    isEdited: false,
    deletionAwaiting: false,
    cancelReason: null,
    idempotencyKey,
    createdAt: now,
    deliveredAt: status === 'DELIVERED' ? now : null,
    deletedAt: null,
    updatedAt: now,
    ...values,
  };
}

function cashOut(): CashOut {
  const now = new Date('2026-11-03T10:00:00.000Z');
  return {
    id: 'a3f1212c-b061-4f82-90c5-e057aa8fd564',
    cashUpId,
    amount: new Prisma.Decimal('2.00'),
    currency: 'USD',
    reason: 'Drawer expense',
    status: 'ACTIVE',
    cancelReason: null,
    cancelledAt: null,
    cancelledByMembershipId: null,
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };
}

function countEntry(): CountEntry {
  return {
    id: '148fdf9f-64af-4f61-a707-df61e326cf7d',
    cashUpId,
    currency: 'USD',
    denomination: new Prisma.Decimal('5.00'),
    quantity: 2,
    updatedAt: new Date('2026-11-03T10:00:00.000Z'),
  };
}

function setup(options: {
  status?: CashUp['status'];
  ownerId?: string;
  ownerRole?: Actor['role'];
  ownerMissing?: boolean;
  actorId?: string;
  role?: Actor['role'];
  isSolo?: boolean;
  owned?: boolean;
  saleStatus?: Sale['status'];
  saleValues?: Partial<Sale>;
  saleEditValues?: Partial<Sale>;
  saleCreated?: boolean;
  cashOutCreated?: boolean;
  cashOutValues?: Partial<CashOut>;
  openConflict?: boolean;
  awaitingDelivery?: number;
  awaitingRequests?: number;
  deletionAwaiting?: number;
} = {}) {
  const currentCashUp = cashUp(options.status, options.ownerId);
  const currentSale = sale(options.saleStatus, options.saleValues);
  const currentCashOut = { ...cashOut(), ...options.cashOutValues };
  let latestCashUp = currentCashUp;
  const ownerMembership: Membership = {
    id: currentCashUp.membershipId,
    userId: '44cc1250-48f1-4ae1-b594-ff9b9bb3a4da',
    businessId,
    role: options.ownerRole ?? 'STAFF',
    status: 'ACTIVE',
    joinedAt: new Date('2026-11-03T10:00:00.000Z'),
    deactivatedAt: null,
  };
  const audit = { record: jest.fn(async () => undefined) };
  const repos: ServiceRepositories = serviceRepositories({
    businesses: {
      findSettings: async () => ({ id: businessId, name: 'Test shop', isSolo: options.isSolo ?? false }),
    },
    cashUps: {
      open: async () => {
        if (options.openConflict) throw new DuplicateError('Cash-up');
        latestCashUp = cashUp('OPEN', options.actorId ?? membershipId);
        return latestCashUp;
      },
      lockForUpdate: async () => currentCashUp,
      findOwn: async (_id, ownerId) =>
        options.owned === false || ownerId !== currentCashUp.membershipId
          ? null
          : currentCashUp,
      findById: async () => latestCashUp,
      submit: async () => {
        latestCashUp = { ...currentCashUp, status: 'SUBMITTED' };
        return latestCashUp;
      },
      approve: async (_id, approvedById, selfApproved) => {
        latestCashUp = {
          ...currentCashUp,
          status: 'APPROVED',
          approvedById,
          selfApproved,
        };
        return latestCashUp;
      },
      returnToOpen: async (_id, reason) => {
        latestCashUp = { ...currentCashUp, status: 'OPEN', returnReason: reason };
        return latestCashUp;
      },
    },
    memberships: {
      findById: async () => (options.ownerMissing ? null : ownerMembership),
    },
    sales: {
      create: jest.fn(async () => ({
        sale: currentSale,
        created: options.saleCreated ?? true,
      })),
      findById: async () => currentSale,
      findByIdempotencyKey: async () => currentSale,
      countByStatus: jest.fn(async () => ({
        total: 1,
        delivered: currentSale.status === 'DELIVERED' ? 1 : 0,
        toDeliver: currentSale.status === 'TO_DELIVER' ? 1 : 0,
        deleted: currentSale.status === 'DELETED' ? 1 : 0,
      })),
      countAwaitingDelivery: async () => options.awaitingDelivery ?? 0,
      flagCounts: async () => ({
        total: 0,
        deleted: 0,
        edited: 0,
        amountDiffers: 0,
        mixedChange: 0,
        deletionAwaiting: options.deletionAwaiting ?? 0,
      }),
      totalsByCurrencyAndMethod: async () => [],
      changeGivenByCurrency: async () => [],
      edit: jest.fn(async () =>
        sale(currentSale.status, {
          ...currentSale,
          note: 'Edited note',
          isEdited: true,
          ...options.saleEditValues,
        }),
      ),
      markDelivered: jest.fn(async () =>
        sale('DELIVERED', {
          ...currentSale,
          status: 'DELIVERED',
          amountDiffers: true,
          deliveredAt: new Date('2026-11-03T11:00:00.000Z'),
        }),
      ),
      cancelToDeliver: jest.fn(async () =>
        sale('DELETED', {
          ...currentSale,
          status: 'DELETED',
          cancelReason: 'Customer cancelled',
          deletedAt: new Date('2026-11-03T11:00:00.000Z'),
        }),
      ),
    },
    cashOuts: {
      create: jest.fn(async () => ({
        cashOut: currentCashOut,
        created: options.cashOutCreated ?? true,
      })),
      findById: async () => currentCashOut,
      listByCashUp: async () => [currentCashOut],
      cancel: async () => ({
        ...currentCashOut,
        status: 'CANCELLED',
        cancelReason: 'No longer needed',
        cancelledAt: new Date('2026-11-03T11:00:00.000Z'),
        cancelledByMembershipId: options.actorId ?? membershipId,
      }),
    },
    counts: {
      saveLines: async () => [countEntry()],
      countedTotals: async () => ({
        USD: new Prisma.Decimal('10.00'),
        LBP: new Prisma.Decimal('0.00'),
      }),
    },
    requests: { countAwaitingByCashUp: async () => options.awaitingRequests ?? 0 },
  });
  const runner = new UseCaseRunner({
    run: async (_scope, fn) => fn(markTransactionRepositories(repos)),
  });
  const permissions = new PermissionMatrix();
  return {
    repos,
    audit,
    runner,
    permissions,
    actor: actor(options.role, options.actorId),
    sale: currentSale,
    cashUp: currentCashUp,
    sales: new SaleService(runner, permissions, audit),
    cashOuts: new CashOutService(runner, permissions, audit),
    counts: new CountService(runner, permissions, audit),
    lifecycle: new CashUpLifecycleService(
      runner,
      permissions,
      new CashUpApprovalPolicy(),
      new SubmitSnapshotBuilder(),
      audit,
    ),
  };
}

const createSaleInput = {
  status: 'DELIVERED',
  businessAmount: '10.00',
  deliveryFee: '0.00',
  totalCollected: '10.00',
  currency: 'USD',
  method: 'CASH',
} as const;

const createCashOutInput = {
  amount: '2.00',
  currency: 'USD',
  reason: 'Drawer expense',
} as const;

describe('SaleService', () => {
  it('creates a balanced sale and audits the committed change', async () => {
    const app = setup();
    const result = await app.sales.create(
      app.actor,
      cashUpId,
      createSaleInput,
      idempotencyKey,
    );

    expect(result).toMatchObject({
      saleId,
      sale: { moneyTaken: 'COLLECTED' },
      salesSummary: { total: 1, delivered: 1 },
      replayed: false,
    });
    expect(app.repos.sales.create).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey, mixedChange: false }),
    );
    expect(app.audit.record).toHaveBeenCalledTimes(1);
  });

  it('returns an identical create replay without a second audit entry', async () => {
    const app = setup({ saleCreated: false });
    const result = await app.sales.create(
      app.actor,
      cashUpId,
      createSaleInput,
      idempotencyKey,
    );
    expect(result.replayed).toBe(true);
    expect(app.audit.record).not.toHaveBeenCalled();
  });

  it('rejects reusing a create key with different content', async () => {
    const app = setup({ saleCreated: false });
    await expect(
      app.sales.create(
        app.actor,
        cashUpId,
        { ...createSaleInput, note: 'different request' },
        idempotencyKey,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(app.audit.record).not.toHaveBeenCalled();
  });

  it.each([
    ['status', { status: 'TO_DELIVER' }],
    ['business amount', { businessAmount: new Prisma.Decimal('11.00') }],
    ['delivery fee', { deliveryFee: new Prisma.Decimal('1.00') }],
    ['tip', { tip: new Prisma.Decimal('1.00') }],
    ['discount', { discount: new Prisma.Decimal('1.00') }],
    ['total collected', { totalCollected: new Prisma.Decimal('11.00') }],
    ['currency', { currency: 'LBP' }],
    ['payment method', { method: 'WHISH' }],
    ['change amount', { changeGiven: new Prisma.Decimal('1.00') }],
    ['change currency', { changeCurrency: 'LBP' }],
    ['client number', { clientNumber: '+96170000000' }],
    ['note', { note: 'Previously saved' }],
    ['mixed-change flag', { mixedChange: true }],
    ['cash-up id', { cashUpId: '4a969bbb-6f7a-4dfb-90cd-c81360c62236' }],
  ] as const)(
    'rejects idempotency replay when the persisted %s differs',
    async (_field, saleValues) => {
      const app = setup({ saleCreated: false, saleValues });
      await expect(
        app.sales.create(app.actor, cashUpId, createSaleInput, idempotencyKey),
      ).rejects.toBeInstanceOf(ConflictError);
    },
  );

  it.each(['SUBMITTED', 'APPROVED'] as const)(
    'rejects writes while the cash-up is %s',
    async (status) => {
      const app = setup({ status });
      await expect(
        app.sales.create(app.actor, cashUpId, createSaleInput, idempotencyKey),
      ).rejects.toBeInstanceOf(BusinessRuleError);
      expect(app.repos.sales.create).not.toHaveBeenCalled();
    },
  );

  it('rejects invalid sale balances and missing cash-ups without writing', async () => {
    const invalidBalance = setup();
    await expect(
      invalidBalance.sales.create(
        invalidBalance.actor,
        cashUpId,
        { ...createSaleInput, totalCollected: '9.00' },
        idempotencyKey,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(invalidBalance.repos.sales.create).not.toHaveBeenCalled();

    const missing = setup({ owned: false });
    await expect(
      missing.sales.create(missing.actor, cashUpId, createSaleInput, idempotencyKey),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('returns 404 for another staff member and reviewers on another staff cash-up', async () => {
    const staff = setup({ owned: false });
    await expect(
      staff.sales.create(staff.actor, cashUpId, createSaleInput, idempotencyKey),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    const manager = setup({ role: 'MANAGER', ownerId: membershipId });
    await expect(
      manager.sales.create(
        actor('MANAGER', 'c5b51876-8e33-4b48-bdeb-ec803f41b202'),
        cashUpId,
        createSaleInput,
        idempotencyKey,
      ),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it('allows a Manager on their own cash-up and a solo Owner acting as Staff', async () => {
    const managerMembershipId = 'c5b51876-8e33-4b48-bdeb-ec803f41b202';
    const manager = setup({ role: 'MANAGER', ownerId: managerMembershipId });
    await expect(
      manager.sales.create(
        actor('MANAGER', managerMembershipId),
        cashUpId,
        createSaleInput,
        idempotencyKey,
      ),
    ).resolves.toMatchObject({ replayed: false });

    const owner = setup({ role: 'OWNER', isSolo: true });
    await expect(
      owner.sales.create(
        actor('OWNER'),
        cashUpId,
        createSaleInput,
        idempotencyKey,
      ),
    ).resolves.toMatchObject({ replayed: false });
  });

  it('rejects an Owner who is not acting in a solo business', async () => {
    const app = setup({ role: 'OWNER', isSolo: false });
    await expect(
      app.sales.create(
        app.actor,
        cashUpId,
        createSaleInput,
        idempotencyKey,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('confirms delivery and computes amount-difference flags from the domain', async () => {
    const app = setup({
      saleStatus: 'TO_DELIVER',
      saleValues: { totalCollected: new Prisma.Decimal('12.00') },
    });
    await app.sales.confirmDelivery(app.actor, cashUpId, saleId, {
      totalCollected: '10.00',
      currency: 'USD',
      method: 'CASH',
    });
    expect(app.repos.sales.markDelivered).toHaveBeenCalledWith(
      saleId,
      expect.objectContaining({ amountDiffers: true, mixedChange: false }),
    );
    expect(app.audit.record).toHaveBeenCalledTimes(1);
  });

  it('rejects delivery confirmation on a collected sale', async () => {
    const app = setup();
    await expect(
      app.sales.confirmDelivery(app.actor, cashUpId, saleId, {
        totalCollected: '10.00',
        currency: 'USD',
        method: 'CASH',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(app.repos.sales.markDelivered).not.toHaveBeenCalled();
    expect(app.audit.record).not.toHaveBeenCalled();
  });

  it('edits a partial sale and records an audit only for the change', async () => {
    const app = setup();
    const result = await app.sales.edit(
      app.actor,
      cashUpId,
      saleId,
      editSaleSchema.parse({ note: 'Edited note' }),
    );
    expect(result.sale.note).toBe('Edited note');
    expect(app.repos.sales.edit).toHaveBeenCalledWith(
      saleId,
      expect.objectContaining({ note: 'Edited note', mixedChange: false }),
      app.actor.membershipId,
    );
    expect(app.audit.record).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['business amount', { businessAmount: new Prisma.Decimal('11.00') }],
    ['delivery fee', { deliveryFee: new Prisma.Decimal('1.00') }],
    ['tip', { tip: new Prisma.Decimal('1.00') }],
    ['discount', { discount: new Prisma.Decimal('1.00') }],
    ['total collected', { totalCollected: new Prisma.Decimal('11.00') }],
    ['currency', { currency: 'LBP' }],
    ['payment method', { method: 'WHISH' }],
    ['change amount', { changeGiven: new Prisma.Decimal('1.00') }],
    ['change currency', { changeCurrency: 'LBP' }],
    ['client number', { clientNumber: '+96170000000' }],
    ['note', { note: 'Edited note' }],
    ['mixed-change flag', { mixedChange: true, note: null }],
  ] as const)('audits a change to the sale %s field', async (_field, saleEditValues) => {
    const app = setup({ saleEditValues });
    await app.sales.edit(
      app.actor,
      cashUpId,
      saleId,
      editSaleSchema.parse({ note: 'Edited note' }),
    );
    expect(app.audit.record).toHaveBeenCalledTimes(1);
  });

  it('does not audit a no-op sale edit', async () => {
    const app = setup({ saleEditValues: { note: null, isEdited: false } });
    await app.sales.edit(
      app.actor,
      cashUpId,
      saleId,
      editSaleSchema.parse({ note: 'Edited note' }),
    );
    expect(app.audit.record).not.toHaveBeenCalled();
  });

  it('cancels a to-deliver sale once and rejects a repeated cancellation', async () => {
    const app = setup({ saleStatus: 'TO_DELIVER' });
    const result = await app.sales.cancel(app.actor, cashUpId, saleId, 'Customer cancelled');
    expect(result.sale.moneyTaken).toBe('CANCELLED');
    expect(app.audit.record).toHaveBeenCalledTimes(1);

    const alreadyCancelled = setup({ saleStatus: 'DELETED' });
    await expect(
      alreadyCancelled.sales.cancel(
        alreadyCancelled.actor,
        cashUpId,
        saleId,
        'Customer cancelled',
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(alreadyCancelled.repos.sales.cancelToDeliver).not.toHaveBeenCalled();
    expect(alreadyCancelled.audit.record).not.toHaveBeenCalled();
  });

  it('rejects direct cancellation of a collected sale', async () => {
    const app = setup();
    await expect(
      app.sales.cancel(app.actor, cashUpId, saleId, 'Customer cancelled'),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('CashOutService', () => {
  it('creates and audits a cash-out with its persistence idempotency key', async () => {
    const app = setup();
    const result = await app.cashOuts.create(
      app.actor,
      cashUpId,
      createCashOutInput,
      idempotencyKey,
    );
    expect(result).toMatchObject({
      cashOut: { cashUpId, amount: '2.00' },
      replayed: false,
    });
    expect(app.repos.cashOuts.create).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey, cashUpId }),
    );
    expect(app.audit.record).toHaveBeenCalledTimes(1);
  });

  it('does not audit a matching replay and rejects a conflicting reuse', async () => {
    const replay = setup({ cashOutCreated: false });
    await expect(
      replay.cashOuts.create(replay.actor, cashUpId, createCashOutInput, idempotencyKey),
    ).resolves.toMatchObject({ replayed: true });
    expect(replay.audit.record).not.toHaveBeenCalled();

    const conflict = setup({
      cashOutCreated: false,
      cashOutValues: { reason: 'Different content' },
    });
    await expect(
      conflict.cashOuts.create(
        conflict.actor,
        cashUpId,
        createCashOutInput,
        idempotencyKey,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('applies the same owner and OPEN-state checks before creating cash-outs', async () => {
    const otherOwner = setup({ owned: false });
    await expect(
      otherOwner.cashOuts.create(
        otherOwner.actor,
        cashUpId,
        createCashOutInput,
        idempotencyKey,
      ),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    const submitted = setup({ status: 'SUBMITTED' });
    await expect(
      submitted.cashOuts.create(
        submitted.actor,
        cashUpId,
        createCashOutInput,
        idempotencyKey,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(submitted.repos.cashOuts.create).not.toHaveBeenCalled();
  });
});

describe('CashUpLifecycleService review transitions', () => {
  it('maps an existing open cash-up to a conflict', async () => {
    const app = setup({ openConflict: true });
    await expect(
      app.lifecycle.open(app.actor, { floatUsd: '1.00', floatLbp: '0.00' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('blocks submission while deliveries or decisions are pending', async () => {
    const awaitingDelivery = setup({ awaitingDelivery: 1 });
    await expect(
      awaitingDelivery.lifecycle.submit(awaitingDelivery.actor, cashUpId),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    const awaitingRequest = setup({ awaitingRequests: 1 });
    await expect(
      awaitingRequest.lifecycle.submit(awaitingRequest.actor, cashUpId),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    const awaitingDeletion = setup({ deletionAwaiting: 1 });
    await expect(
      awaitingDeletion.lifecycle.submit(awaitingDeletion.actor, cashUpId),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('approves a submitted staff cash-up by its Manager', async () => {
    const app = setup({
      status: 'SUBMITTED',
      role: 'MANAGER',
      actorId: 'c5b51876-8e33-4b48-bdeb-ec803f41b202',
      ownerId: membershipId,
    });

    await expect(app.lifecycle.approve(app.actor, cashUpId)).resolves.toMatchObject({
      status: 'APPROVED',
      approvedById: app.actor.membershipId,
      selfApproved: false,
    });
  });

  it('allows a solo Owner to self-approve and rejects a Staff reviewer', async () => {
    const ownerId = 'eeb72ae1-685c-45e8-a3aa-85557d5bc113';
    const soloOwner = setup({
      status: 'SUBMITTED',
      role: 'OWNER',
      actorId: ownerId,
      ownerId,
      ownerRole: 'OWNER',
      isSolo: true,
    });
    await expect(
      soloOwner.lifecycle.approve(soloOwner.actor, cashUpId),
    ).resolves.toMatchObject({ status: 'APPROVED', selfApproved: true });

    const staff = setup({ status: 'SUBMITTED' });
    await expect(staff.lifecycle.approve(staff.actor, cashUpId)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('returns a submitted cash-up to OPEN with the review reason', async () => {
    const app = setup({
      status: 'SUBMITTED',
      role: 'MANAGER',
      actorId: 'c5b51876-8e33-4b48-bdeb-ec803f41b202',
      ownerId: membershipId,
    });

    await expect(
      app.lifecycle.returnToOpen(app.actor, cashUpId, 'Recount required'),
    ).resolves.toMatchObject({ status: 'OPEN', returnReason: 'Recount required' });
  });

  it('rejects review transitions when the owner membership is unavailable', async () => {
    const app = setup({
      status: 'SUBMITTED',
      role: 'MANAGER',
      actorId: 'c5b51876-8e33-4b48-bdeb-ec803f41b202',
      ownerId: membershipId,
      ownerMissing: true,
    });
    await expect(app.lifecycle.approve(app.actor, cashUpId)).rejects.toBeInstanceOf(
      EntityNotFoundError,
    );
    await expect(
      app.lifecycle.returnToOpen(app.actor, cashUpId, 'Recount'),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });

  it.each([
    ['OPEN', EntityNotFoundError],
    ['APPROVED', ConflictError],
  ] as const)('rejects approval of a %s cash-up', async (status, error) => {
    const app = setup({
      status,
      role: 'MANAGER',
      actorId: 'c5b51876-8e33-4b48-bdeb-ec803f41b202',
      ownerId: membershipId,
    });
    await expect(app.lifecycle.approve(app.actor, cashUpId)).rejects.toBeInstanceOf(error);
    await expect(
      app.lifecycle.returnToOpen(app.actor, cashUpId, 'Recount'),
    ).rejects.toBeInstanceOf(error);
  });
});

describe('staff mutation role-action-status matrix', () => {
  const managerId = 'c5b51876-8e33-4b48-bdeb-ec803f41b202';
  const ownerId = 'eeb72ae1-685c-45e8-a3aa-85557d5bc113';
  const roles = [
    { name: 'staff own', role: 'STAFF' as const, actorId: membershipId, ownerId: membershipId, isSolo: false },
    { name: 'manager own', role: 'MANAGER' as const, actorId: managerId, ownerId: managerId, isSolo: false },
    { name: 'manager on staff', role: 'MANAGER' as const, actorId: managerId, ownerId: membershipId, isSolo: false },
    { name: 'owner non-solo', role: 'OWNER' as const, actorId: ownerId, ownerId: membershipId, isSolo: false },
    { name: 'owner solo', role: 'OWNER' as const, actorId: ownerId, ownerId, isSolo: true },
  ];
  const actions: Array<{
    name: string;
    saleStatus?: Sale['status'];
    run: (app: ReturnType<typeof setup>) => Promise<unknown>;
  }> = [
    {
      name: 'cash-up open',
      run: (app) =>
        app.lifecycle.open(app.actor, { floatUsd: '1.00', floatLbp: '0.00' }),
    },
    {
      name: 'sale create',
      run: (app) => app.sales.create(app.actor, cashUpId, createSaleInput, idempotencyKey),
    },
    {
      name: 'sale edit',
      run: (app) =>
        app.sales.edit(app.actor, cashUpId, saleId, editSaleSchema.parse({ note: 'Changed' })),
    },
    {
      name: 'sale confirm delivery',
      saleStatus: 'TO_DELIVER',
      run: (app) =>
        app.sales.confirmDelivery(app.actor, cashUpId, saleId, {
          totalCollected: '10.00',
          currency: 'USD',
          method: 'CASH',
        }),
    },
    {
      name: 'sale cancel',
      saleStatus: 'TO_DELIVER',
      run: (app) => app.sales.cancel(app.actor, cashUpId, saleId, 'Customer cancelled'),
    },
    {
      name: 'cash-out create',
      run: (app) =>
        app.cashOuts.create(app.actor, cashUpId, createCashOutInput, idempotencyKey),
    },
    {
      name: 'cash-out cancel',
      run: (app) =>
        app.cashOuts.cancel(app.actor, cashUpId, cashOut().id, 'No longer needed'),
    },
    {
      name: 'count replace',
      run: (app) =>
        app.counts.replace(app.actor, cashUpId, {
          lines: [{ currency: 'USD', denomination: '5.00', quantity: 2 }],
        }),
    },
    {
      name: 'cash-up submit',
      run: (app) => app.lifecycle.submit(app.actor, cashUpId),
    },
  ];

  it.each(
    roles.flatMap((role) =>
      actions.flatMap((action) =>
        (['OPEN', 'SUBMITTED', 'APPROVED'] as const).map((status) => ({
          role,
          action,
          status,
        })),
      ),
    ),
  )('$role.name / $action.name / $status', async ({ role, action, status }) => {
    const app = setup({
      status,
      role: role.role,
      actorId: role.actorId,
      ownerId: role.ownerId,
      isSolo: role.isSolo,
      saleStatus: action.saleStatus,
    });
    const expected =
      role.name === 'owner non-solo'
        ? 403
        : action.name === 'cash-up open'
          ? 'ALLOW'
          : role.name === 'manager on staff'
            ? 404
            : status === 'OPEN'
              ? 'ALLOW'
              : 422;

    let actual: number | 'ALLOW';
    try {
      await action.run(app);
      actual = 'ALLOW';
    } catch (error) {
      actual = mapHttpError(error, 'matrix').status;
    }

    expect(actual).toBe(expected);
  });
});
