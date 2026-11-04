import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ACTOR_BRAND } from '../../services/actor';
import {
  BusinessRuleError,
  ConflictError,
  EntityNotFoundError,
  ForbiddenError,
} from '../../services/errors';
import type { Actor } from '../../services/actor';
import type {
  CashUpDto,
  CashUpOwnDto,
  CashUpReviewDto,
  CashOutDto,
  SaleLineDto,
  OpenCashUpSummaryDto,
} from '../../services/dto';
import type { HttpDependencies, RouteContext } from '..';
import {
  InMemoryIdempotencyStore,
  SessionProvider,
  hashCanonicalBody,
  UnauthenticatedError,
} from '..';
import { openCashUpSchema } from '../../validation';
import { createCashUpRoutes } from '../routes/cashUps';
import { createCashOutRoutes } from '../routes/cashOuts';
import { createReviewRoutes } from '../routes/review';
import { createSaleRoutes } from '../routes/sales';
import { createCountRoutes } from '../routes/counts';

const userId = 'cfd0db5d-cd96-4f5c-bb34-88d08e0748a8';
const businessId = '02d32eae-21cb-497f-86e4-8a2df9e469f8';
const cashUpId = 'e2461a3b-6449-4dfb-94b6-aed839bac5aa';
const requestId = 'fcd0db5d-cd96-4f5c-bb34-88d08e0748a8';

const actor: Actor = {
  userId,
  membershipId: '4c9c5415-0cc5-427d-8a61-64829c6de50c',
  businessId,
  role: 'STAFF',
  [ACTOR_BRAND]: true,
};

const cashUp: CashUpDto = {
  id: cashUpId,
  status: 'OPEN',
  floatUsd: '10.00',
  floatLbp: '0.00',
  referenceRate: null,
  openedAt: '2026-11-03T10:00:00.000Z',
  countStartedAt: null,
  closedAt: null,
  approvedAt: null,
  voidedAt: null,
  approvedById: null,
  selfApproved: false,
  returnReason: null,
  voidReason: null,
  expectedUsd: null,
  expectedLbp: null,
  countedUsd: null,
  countedLbp: null,
  gapUsd: null,
  gapLbp: null,
};

const ownDetail: CashUpOwnDto = {
  ...cashUp,
  sales: [],
  salesSummary: { total: 0, delivered: 0, toDeliver: 0, deleted: 0 },
  cashOuts: [],
};

const reviewDetail: CashUpReviewDto = {
  ...ownDetail,
  cashOuts: [],
  countEntries: [],
  salesByCurrency: {
    USD: {
      businessAmount: '0.00',
      deliveryFees: '0.00',
      totalCollected: '0.00',
      tips: '0.00',
      discounts: '0.00',
      changeGiven: '0.00',
    },
    LBP: {
      businessAmount: '0.00',
      deliveryFees: '0.00',
      totalCollected: '0.00',
      tips: '0.00',
      discounts: '0.00',
      changeGiven: '0.00',
    },
  },
  walletTotals: {
    WHISH: { USD: '0.00', LBP: '0.00' },
    OMT: { USD: '0.00', LBP: '0.00' },
  },
  expectedAndGap: {
    USD: { expected: '10.00', counted: '0.00', gap: '-10.00', direction: 'SHORT', display: '-10.00' },
    LBP: { expected: '0.00', counted: '0.00', gap: '0.00', direction: 'EVEN', display: '0.00' },
  },
  flags: {
    total: 0,
    deleted: 0,
    edited: 0,
    amountDiffers: 0,
    mixedChange: 0,
    deletionAwaiting: 0,
  },
};

const openSummary: OpenCashUpSummaryDto = {
  id: cashUpId,
  openedAt: cashUp.openedAt,
  staffName: 'Test staff',
  salesCount: 0,
  requestsCount: 0,
};

const saleLineId = 'a3f1212c-b061-4f82-90c5-e057aa8fd564';
const saleLine: SaleLineDto = {
  id: saleLineId,
  saleNumber: 1,
  status: 'DELIVERED',
  moneyTaken: 'COLLECTED',
  amountCollected: '10.00',
  amountExpected: null,
  currency: 'USD',
  method: 'CASH',
  changeGiven: null,
  changeCurrency: null,
  businessAmount: '10.00',
  deliveryFee: '0.00',
  tip: null,
  discount: null,
  clientNumber: null,
  note: null,
  createdAt: '2026-11-03T10:00:00.000Z',
  deliveredAt: '2026-11-03T10:00:00.000Z',
  cancelReason: null,
  isEdited: false,
  amountDiffers: false,
  mixedChange: false,
  deletionAwaiting: false,
};

const salesSummary = { total: 1, delivered: 1, toDeliver: 0, deleted: 0 };
const cashOut: CashOutDto = {
  id: 'a3f1212c-b061-4f82-90c5-e057aa8fd564',
  cashUpId,
  amount: '2.00',
  currency: 'USD' as const,
  reason: 'Drawer expense',
  status: 'ACTIVE',
  cancelReason: null,
  cancelledAt: null,
  createdAt: '2026-11-03T10:00:00.000Z',
  updatedAt: '2026-11-03T10:00:00.000Z',
};

function makeDependencies(overrides: {
  sessionProvider?: SessionProvider;
  actorResolver?: HttpDependencies['actorResolver'];
  lifecycle?: Partial<HttpDependencies['lifecycle']>;
  sales?: Partial<HttpDependencies['sales']>;
  cashOuts?: Partial<HttpDependencies['cashOuts']>;
  queries?: Partial<HttpDependencies['queries']>;
  idempotencyStore?: HttpDependencies['idempotencyStore'];
} = {}): HttpDependencies {
  const lifecycle: HttpDependencies['lifecycle'] = {
    open: jest.fn(async () => cashUp),
    submit: jest.fn(async () => cashUp),
    approve: jest.fn(async () => cashUp),
    returnToOpen: jest.fn(async () => cashUp),
    ...overrides.lifecycle,
  };
  const queries: HttpDependencies['queries'] = {
    getOwn: jest.fn(async () => ownDetail),
    listOwn: jest.fn(async (_actor, query) =>
      query.take > 1 ? [cashUp, { ...cashUp, id: 'c8c0bdb4-2d18-4f75-bb30-5f480ce80985' }] : [cashUp],
    ),
    listOpenSummaries: jest.fn(async () => [openSummary]),
    listSubmitted: jest.fn(async () => [cashUp]),
    listReviewed: jest.fn(async (_actor, query) =>
      query.take > 1 ? [cashUp, { ...cashUp, id: 'c8c0bdb4-2d18-4f75-bb30-5f480ce80985' }] : [cashUp],
    ),
    getReviewDetail: jest.fn(async () => reviewDetail),
    ...overrides.queries,
  };
  const sales: HttpDependencies['sales'] = {
    create: jest.fn(async () => ({
      saleId: saleLineId,
      sale: saleLine,
      salesSummary,
      replayed: false,
    })),
    edit: jest.fn(async () => ({ saleId: saleLineId, sale: saleLine, salesSummary })),
    confirmDelivery: jest.fn(async () => ({ saleId: saleLineId, sale: saleLine, salesSummary })),
    cancel: jest.fn(async () => ({ saleId: saleLineId, sale: saleLine, salesSummary })),
    ...overrides.sales,
  };
  const cashOuts: HttpDependencies['cashOuts'] = {
    create: jest.fn(async () => ({ cashOut, replayed: false })),
    cancel: jest.fn(async () => ({ cashOut })),
    ...overrides.cashOuts,
  };
  const counts: HttpDependencies['counts'] = {
    replace: jest.fn(async () => ({
      cashUpId,
      lines: [],
      countedTotals: { USD: '0.00', LBP: '0.00' },
    })),
  };
  return {
    sessionProvider:
      overrides.sessionProvider ??
      ({
        getSession: jest.fn(async () => ({ userId, businessId })),
      } satisfies SessionProvider),
    actorResolver:
      overrides.actorResolver ??
      ({
        resolve: jest.fn(async () => actor),
      } satisfies HttpDependencies['actorResolver']),
    lifecycle,
    queries,
    sales,
    cashOuts,
    counts,
    idempotencyStore: overrides.idempotencyStore ?? new InMemoryIdempotencyStore(),
    reportInternalError: jest.fn(),
  };
}

function request(
  method: string,
  path: string,
  body?: string,
  headers: Record<string, string> = {},
): Request {
  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', 'application/json');
  }
  return new Request(`http://localhost${path}`, {
    method,
    headers: requestHeaders,
    body,
  });
}

async function json(response: Response): Promise<unknown> {
  return response.json();
}

describe('cash-up controller routes', () => {
  it('opens a cash-up with a 201 response and Location header', async () => {
    const deps = makeDependencies();
    const response = await createCashUpRoutes(deps).open(
      request('POST', '/api/v1/cash-ups', '{"floatUsd":"10.0"}'),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(`/api/v1/cash-ups/${cashUpId}`);
    expect(await json(response)).toEqual({ data: cashUp });
    expect(deps.lifecycle.open).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ floatUsd: '10.00', floatLbp: '0.00' }),
    );
  });

  it('lists own history with the cursor page envelope', async () => {
    const deps = makeDependencies();
    const response = await createCashUpRoutes(deps).listOwn(
      request('GET', '/api/v1/cash-ups?take=1'),
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({
      data: [cashUp],
      page: { nextCursor: cashUpId },
    });
    expect(deps.queries.listOwn).toHaveBeenCalledWith(actor, { take: 2 });
  });

  it('omits the next cursor when the look-ahead item is absent', async () => {
    const deps = makeDependencies({
      queries: {
        listOwn: jest.fn(async () => [cashUp]),
        listReviewed: jest.fn(async () => [cashUp]),
      },
    });
    const ownHistory = await createCashUpRoutes(deps).listOwn(
      request('GET', '/api/v1/cash-ups?take=1'),
    );
    const reviewedHistory = await createReviewRoutes(deps).reviewed(
      request('GET', '/api/v1/review/cash-ups/reviewed?take=1'),
    );

    expect(await json(ownHistory)).toEqual({ data: [cashUp], page: { nextCursor: null } });
    expect(await json(reviewedHistory)).toEqual({ data: [cashUp], page: { nextCursor: null } });
  });

  it('returns a null cursor for an empty own or reviewed history page', async () => {
    const deps = makeDependencies({
      queries: {
        listOwn: jest.fn(async () => []),
        listReviewed: jest.fn(async () => []),
      },
    });
    const ownHistory = await createCashUpRoutes(deps).listOwn(
      request('GET', '/api/v1/cash-ups?take=1'),
    );
    const reviewedHistory = await createReviewRoutes(deps).reviewed(
      request('GET', '/api/v1/review/cash-ups/reviewed?take=1'),
    );
    expect(await json(ownHistory)).toEqual({ data: [], page: { nextCursor: null } });
    expect(await json(reviewedHistory)).toEqual({ data: [], page: { nextCursor: null } });
  });

  it('returns own cash-up detail with its sales summary', async () => {
    const deps = makeDependencies();
    const context: RouteContext = { params: Promise.resolve({ id: cashUpId }) };
    const response = await createCashUpRoutes(deps).getOwn(
      request('GET', `/api/v1/cash-ups/${cashUpId}`),
      context,
    );
    expect(response.status).toBe(200);
    const body = await json(response);
    expect(body).toEqual({ data: ownDetail });
    expect(JSON.stringify(body)).not.toMatch(/businessId|userId/);
    expect(deps.queries.getOwn).toHaveBeenCalledWith(actor, cashUpId);
  });

  it('submits the actor cash-up', async () => {
    const deps = makeDependencies();
    const response = await createCashUpRoutes(deps).submit(
      request('POST', `/api/v1/cash-ups/${cashUpId}/submit`),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ data: cashUp });
    expect(deps.lifecycle.submit).toHaveBeenCalledWith(actor, cashUpId);
  });
});

describe('staff sale and cash-out routes', () => {
  const key = '8e2a72f2-39fb-4df5-b0dc-521dccac9658';
  const saleInput = {
    status: 'DELIVERED',
    businessAmount: '10',
    totalCollected: '10',
    currency: 'USD',
    method: 'CASH',
  };
  const saleBody = JSON.stringify(saleInput);

  it('creates a sale using the required persistence idempotency key', async () => {
    const deps = makeDependencies();
    const response = await createSaleRoutes(deps).create(
      request('POST', `/api/v1/cash-ups/${cashUpId}/sales`, saleBody, {
        'idempotency-key': key,
      }),
      { params: Promise.resolve({ id: cashUpId }) },
    );

    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(
      `/api/v1/cash-ups/${cashUpId}/sales/${saleLineId}`,
    );
    expect(await json(response)).toEqual({
      data: { saleId: saleLineId, sale: saleLine, salesSummary },
    });
    expect(deps.sales.create).toHaveBeenCalledWith(
      actor,
      cashUpId,
      expect.objectContaining({ businessAmount: '10.00', deliveryFee: '0.00' }),
      key,
    );
  });

  it('returns persistent replays as 200 without using the in-memory store', async () => {
    const deps = makeDependencies({
      sales: {
        create: jest.fn(async () => ({
          saleId: saleLineId,
          sale: saleLine,
          salesSummary,
          replayed: true,
        })),
      },
    });
    const begin = jest.spyOn(deps.idempotencyStore, 'begin');
    const response = await createSaleRoutes(deps).create(
      request('POST', `/api/v1/cash-ups/${cashUpId}/sales`, saleBody, {
        'idempotency-key': key,
      }),
      { params: Promise.resolve({ id: cashUpId }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Idempotent-Replayed')).toBe('true');
    expect(begin).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'not-a-uuid'],
  ] as const)(
    'rejects a %s sale idempotency key',
    async (_label, header) => {
      const deps = makeDependencies();
      const response = await createSaleRoutes(deps).create(
        request(
          'POST',
          `/api/v1/cash-ups/${cashUpId}/sales`,
          saleBody,
          header ? { 'idempotency-key': header } : {},
        ),
        { params: Promise.resolve({ id: cashUpId }) },
      );
      expect(response.status).toBe(400);
      const body = await json(response);
      expect(body).toMatchObject({
        error: {
          details: [{ path: ['header', 'Idempotency-Key'] }],
        },
      });
      if (header !== undefined) {
        expect(JSON.stringify(body)).not.toContain(header);
      }
      expect(deps.sales.create).not.toHaveBeenCalled();
    },
  );

  it('authenticates every staff mutation before calling its service', async () => {
    const deps = makeDependencies({
      sessionProvider: {
        getSession: jest.fn(async () => {
          throw new UnauthenticatedError();
        }),
      },
    });
    const sales = createSaleRoutes(deps);
    const cashOuts = createCashOutRoutes(deps);
    const saleParams = { params: Promise.resolve({ id: cashUpId, saleId: saleLineId }) };
    const responses = await Promise.all([
      sales.create(
        request('POST', '/sales', saleBody, { 'idempotency-key': key }),
        { params: Promise.resolve({ id: cashUpId }) },
      ),
      sales.edit(request('PATCH', '/sale', '{"note":"checked"}'), saleParams),
      sales.confirmDelivery(
        request('POST', '/confirm', '{"totalCollected":"10","currency":"USD","method":"CASH"}'),
        saleParams,
      ),
      sales.cancel(request('POST', '/cancel', '{"reason":"Cancelled"}'), saleParams),
      cashOuts.create(
        request('POST', '/cash-outs', '{"amount":"2","currency":"USD","reason":"Supplies"}', {
          'idempotency-key': key,
        }),
        { params: Promise.resolve({ id: cashUpId }) },
      ),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([401, 401, 401, 401, 401]);
    expect(deps.sales.create).not.toHaveBeenCalled();
    expect(deps.sales.edit).not.toHaveBeenCalled();
    expect(deps.sales.confirmDelivery).not.toHaveBeenCalled();
    expect(deps.sales.cancel).not.toHaveBeenCalled();
    expect(deps.cashOuts.create).not.toHaveBeenCalled();
  });

  it('rejects malformed cash-up, sale, and cash-out path ids', async () => {
    const deps = makeDependencies();
    const sales = createSaleRoutes(deps);
    const saleCreate = await sales.create(
      request('POST', '/sales', saleBody, { 'idempotency-key': key }),
      { params: Promise.resolve({ id: 'bad' }) },
    );
    const saleEdit = await sales.edit(
      request('PATCH', '/sale', '{"note":"checked"}'),
      { params: Promise.resolve({ id: cashUpId, saleId: 'bad' }) },
    );
    const cashOut = await createCashOutRoutes(deps).create(
      request(
        'POST',
        '/cash-outs',
        '{"amount":"2","currency":"USD","reason":"Supplies"}',
        { 'idempotency-key': key },
      ),
      { params: Promise.resolve({ id: 'bad' }) },
    );
    expect([saleCreate.status, saleEdit.status, cashOut.status]).toEqual([400, 400, 400]);
    expect(deps.sales.create).not.toHaveBeenCalled();
    expect(deps.sales.edit).not.toHaveBeenCalled();
    expect(deps.cashOuts.create).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown identity body key', { businessId: 'private-value' }],
    ['status update body key', { status: 'APPROVED' }],
  ])('rejects %s without echoing submitted data', async (_label, extra) => {
    const deps = makeDependencies();
    const response = await createSaleRoutes(deps).create(
      request(
        'POST',
        `/api/v1/cash-ups/${cashUpId}/sales`,
        JSON.stringify({ ...saleInput, ...extra }),
        { 'idempotency-key': key },
      ),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(response.status).toBe(400);
    expect(JSON.stringify(await json(response))).not.toContain('private-value');
    expect(deps.sales.create).not.toHaveBeenCalled();
  });

  it('routes edit, delivery confirmation, and cancellation to their services', async () => {
    const deps = makeDependencies();
    const routes = createSaleRoutes(deps);
    const params = Promise.resolve({ id: cashUpId, saleId: saleLineId });

    expect(
      (
        await routes.edit(
          request('PATCH', `/api/v1/cash-ups/${cashUpId}/sales/${saleLineId}`, '{"note":"checked"}'),
          { params },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await routes.confirmDelivery(
          request(
            'POST',
            `/api/v1/cash-ups/${cashUpId}/sales/${saleLineId}/confirm-delivery`,
            '{"totalCollected":"10","currency":"USD","method":"CASH"}',
          ),
          { params },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await routes.cancel(
          request(
            'POST',
            `/api/v1/cash-ups/${cashUpId}/sales/${saleLineId}/cancel`,
            '{"reason":"Customer cancelled"}',
          ),
          { params },
        )
      ).status,
    ).toBe(200);
    expect(deps.sales.edit).toHaveBeenCalledWith(actor, cashUpId, saleLineId, { note: 'checked' });
    expect(deps.sales.confirmDelivery).toHaveBeenCalledWith(actor, cashUpId, saleLineId, {
      totalCollected: '10.00',
      currency: 'USD',
      method: 'CASH',
    });
    expect(deps.sales.cancel).toHaveBeenCalledWith(
      actor,
      cashUpId,
      saleLineId,
      'Customer cancelled',
    );
  });

  it('creates cash-outs with the header key and maps service conflicts', async () => {
    const deps = makeDependencies();
    const response = await createCashOutRoutes(deps).create(
      request(
        'POST',
        `/api/v1/cash-ups/${cashUpId}/cash-outs`,
        '{"amount":"2","currency":"USD","reason":"Drawer expense"}',
        { 'idempotency-key': key },
      ),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toContain(cashOut.id);
    expect(deps.cashOuts.create).toHaveBeenCalledWith(
      actor,
      cashUpId,
      { amount: '2.00', currency: 'USD', reason: 'Drawer expense' },
      key,
    );

    const conflictDeps = makeDependencies({
      cashOuts: {
        create: jest.fn(async () => {
          throw new ConflictError();
        }),
      },
    });
    const conflict = await createCashOutRoutes(conflictDeps).create(
      request(
        'POST',
        `/api/v1/cash-ups/${cashUpId}/cash-outs`,
        '{"amount":"2","currency":"USD","reason":"Drawer expense"}',
        { 'idempotency-key': key },
      ),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(conflict.status).toBe(409);

    const replayDeps = makeDependencies({
      cashOuts: {
        create: jest.fn(async () => ({ cashOut, replayed: true })),
      },
    });
    const replay = await createCashOutRoutes(replayDeps).create(
      request(
        'POST',
        `/api/v1/cash-ups/${cashUpId}/cash-outs`,
        '{"amount":"2","currency":"USD","reason":"Drawer expense"}',
        { 'idempotency-key': key },
      ),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(replay.status).toBe(200);
    expect(replay.headers.get('Idempotent-Replayed')).toBe('true');
  });

  it('keeps internal business and user identity fields out of staff response contracts', async () => {
    const deps = makeDependencies();
    const cashUpRoutes = createCashUpRoutes(deps);
    const saleRoutes = createSaleRoutes(deps);
    const cashOutRoutes = createCashOutRoutes(deps);
    const countRoutes = createCountRoutes(deps);
    const cashUpParams = { params: Promise.resolve({ id: cashUpId }) };
    const saleParams = {
      params: Promise.resolve({ id: cashUpId, saleId: saleLineId }),
    };
    const responses = await Promise.all([
      cashUpRoutes.open(request('POST', '/api/v1/cash-ups', '{"floatUsd":"10"}')),
      cashUpRoutes.getOwn(
        request('GET', `/api/v1/cash-ups/${cashUpId}`),
        cashUpParams,
      ),
      cashUpRoutes.submit(
        request('POST', `/api/v1/cash-ups/${cashUpId}/submit`),
        cashUpParams,
      ),
      saleRoutes.create(
        request('POST', `/api/v1/cash-ups/${cashUpId}/sales`, saleBody, {
          'idempotency-key': key,
        }),
        cashUpParams,
      ),
      saleRoutes.edit(
        request('PATCH', `/api/v1/cash-ups/${cashUpId}/sales/${saleLineId}`, '{"note":"checked"}'),
        saleParams,
      ),
      saleRoutes.confirmDelivery(
        request(
          'POST',
          `/api/v1/cash-ups/${cashUpId}/sales/${saleLineId}/confirm-delivery`,
          '{"totalCollected":"10","currency":"USD","method":"CASH"}',
        ),
        saleParams,
      ),
      saleRoutes.cancel(
        request(
          'POST',
          `/api/v1/cash-ups/${cashUpId}/sales/${saleLineId}/cancel`,
          '{"reason":"Cancelled"}',
        ),
        saleParams,
      ),
      cashOutRoutes.create(
        request(
          'POST',
          `/api/v1/cash-ups/${cashUpId}/cash-outs`,
          '{"amount":"2","currency":"USD","reason":"Supplies"}',
          { 'idempotency-key': key },
        ),
        cashUpParams,
      ),
      cashOutRoutes.cancel(
        request(
          'POST',
          `/api/v1/cash-ups/${cashUpId}/cash-outs/${cashOut.id}/cancel`,
          '{"reason":"Returned"}',
        ),
        { params: Promise.resolve({ id: cashUpId, cashOutId: cashOut.id }) },
      ),
      countRoutes.replace(
        request(
          'PUT',
          `/api/v1/cash-ups/${cashUpId}/count`,
          '{"lines":[{"currency":"USD","denomination":"5","quantity":1}]}',
        ),
        cashUpParams,
      ),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([
      201, 200, 200, 201, 200, 200, 200, 201, 200, 200,
    ]);
    const bodies = await Promise.all(responses.map(json));
    expect(JSON.stringify(bodies)).not.toMatch(/businessId|userId/);
  });
});

describe('review controller routes', () => {
  it('returns open summaries unchanged and never reads review detail', async () => {
    const deps = makeDependencies();
    const response = await createReviewRoutes(deps).open(
      request('GET', '/api/v1/review/cash-ups/open'),
    );
    expect(response.status).toBe(200);
    const body = await json(response);
    expect(body).toEqual({ data: [openSummary] });
    expect(deps.queries.listOpenSummaries).toHaveBeenCalledWith(actor);
    expect(deps.queries.getReviewDetail).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toMatch(
      /float|expected|counted|gap|amount|total|businessId|userId|membershipId/i,
    );
  });

  it('lists submitted cash-ups', async () => {
    const deps = makeDependencies();
    const response = await createReviewRoutes(deps).submitted(
      request('GET', '/api/v1/review/cash-ups/submitted'),
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ data: [cashUp] });
    expect(deps.queries.listSubmitted).toHaveBeenCalledWith(actor);
  });

  it('lists reviewed history with cursor paging and strict filters', async () => {
    const deps = makeDependencies();
    const response = await createReviewRoutes(deps).reviewed(
      request('GET', '/api/v1/review/cash-ups/reviewed?take=1&from=2026-11-01'),
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({
      data: [cashUp],
      page: { nextCursor: cashUpId },
    });
    expect(deps.queries.listReviewed).toHaveBeenCalledWith(actor, {
      take: 2,
      from: '2026-11-01',
    });
  });

  it('returns review detail with the existing service DTO', async () => {
    const deps = makeDependencies();
    const response = await createReviewRoutes(deps).getReviewDetail(
      request('GET', `/api/v1/review/cash-ups/${cashUpId}`),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ data: reviewDetail });
    expect(deps.queries.getReviewDetail).toHaveBeenCalledWith(actor, cashUpId);
  });

  it('approves a cash-up', async () => {
    const deps = makeDependencies();
    const response = await createReviewRoutes(deps).approve(
      request('POST', `/api/v1/review/cash-ups/${cashUpId}/approve`),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ data: cashUp });
    expect(deps.lifecycle.approve).toHaveBeenCalledWith(actor, cashUpId);
  });

  it('returns a cash-up with the normalized reason', async () => {
    const deps = makeDependencies();
    const response = await createReviewRoutes(deps).returnToOpen(
      request('POST', `/api/v1/review/cash-ups/${cashUpId}/return`, '{"reason":"  recount  "}'),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ data: cashUp });
    expect(deps.lifecycle.returnToOpen).toHaveBeenCalledWith(actor, cashUpId, 'recount');
  });
});

describe('route pipeline validation and authentication', () => {
  it('authenticates before reading malformed input', async () => {
    const sessionProvider: SessionProvider = {
      getSession: jest.fn(async () => {
        throw new UnauthenticatedError();
      }),
    };
    const actorResolver = { resolve: jest.fn(async () => actor) };
    const deps = makeDependencies({ sessionProvider, actorResolver });
    const req = request('POST', '/api/v1/cash-ups', '{"bad":');
    const response = await createCashUpRoutes(deps).open(req);
    const body = await json(response);

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    expect(req.bodyUsed).toBe(false);
    expect(actorResolver.resolve).not.toHaveBeenCalled();
    expect(deps.lifecycle.open).not.toHaveBeenCalled();
  });

  it('validates input before resolving an actor', async () => {
    const actorResolver = {
      resolve: jest.fn(async () => {
        throw new ForbiddenError();
      }),
    };
    const deps = makeDependencies({ actorResolver });
    const response = await createCashUpRoutes(deps).open(
      request('POST', '/api/v1/cash-ups', '{"businessId":"attacker"}'),
    );
    expect(response.status).toBe(400);
    expect(actorResolver.resolve).not.toHaveBeenCalled();
  });

  it('resolves actor identity only from the session', async () => {
    const actorResolver = { resolve: jest.fn(async () => actor) };
    const sessionProvider: SessionProvider = {
      getSession: jest.fn(async () => ({ userId, businessId })),
    };
    const deps = makeDependencies({ actorResolver, sessionProvider });
    await createCashUpRoutes(deps).listOwn(
      request('GET', '/api/v1/cash-ups?take=1', undefined, {
        'x-dev-user-id': 'attacker-user',
        'x-dev-business-id': 'attacker-business',
      }),
    );
    expect(actorResolver.resolve).toHaveBeenCalledWith(userId, businessId);
  });

  it.each([
    ['cash-up body', '{"floatUsd":"1.00","businessId":"attacker"}'],
    ['user identity body', '{"floatUsd":"1.00","userId":"attacker"}'],
    ['actor identity body', '{"floatUsd":"1.00","actorId":"attacker"}'],
    ['role body', '{"floatUsd":"1.00","role":"OWNER"}'],
    ['status body', '{"floatUsd":"1.00","status":"APPROVED"}'],
  ])('rejects unknown %s keys without calling the service', async (_label, body) => {
    const deps = makeDependencies();
    const response = await createCashUpRoutes(deps).open(
      request('POST', '/api/v1/cash-ups', body),
    );
    const responseBody = await json(response);
    expect(response.status).toBe(400);
    expect(JSON.stringify(responseBody)).not.toContain('attacker');
    expect(deps.lifecycle.open).not.toHaveBeenCalled();
  });

  it('rejects unknown query keys on a route with no query schema', async () => {
    const deps = makeDependencies();
    const response = await createReviewRoutes(deps).open(
      request('GET', '/api/v1/review/cash-ups/open?businessId=attacker'),
    );
    expect(response.status).toBe(400);
    expect(deps.queries.listOpenSummaries).not.toHaveBeenCalled();
  });

  it('rejects unknown review query keys and malformed ids', async () => {
    const deps = makeDependencies();
    const unknownQuery = await createReviewRoutes(deps).reviewed(
      request('GET', '/api/v1/review/cash-ups/reviewed?status=OPEN'),
    );
    const badId = await createCashUpRoutes(deps).getOwn(
      request('GET', '/api/v1/cash-ups/not-a-uuid'),
      { params: Promise.resolve({ id: 'not-a-uuid' }) },
    );
    expect(unknownQuery.status).toBe(400);
    expect(badId.status).toBe(400);
  });

  it('rejects a body on a command endpoint with no body schema', async () => {
    const deps = makeDependencies();
    const response = await createReviewRoutes(deps).approve(
      request('POST', `/api/v1/review/cash-ups/${cashUpId}/approve`, '{"status":"APPROVED"}'),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(response.status).toBe(400);
    expect(deps.lifecycle.approve).not.toHaveBeenCalled();
  });

  it('maps every service error and hides unknown error messages', async () => {
    const cases: Array<[Error, number, string]> = [
      [new ForbiddenError('REVIEW_NOT_ALLOWED'), 403, 'REVIEW_NOT_ALLOWED'],
      [new EntityNotFoundError(), 404, 'ENTITY_NOT_FOUND'],
      [new ConflictError('CASHUP_STATE_CONFLICT'), 409, 'CASHUP_STATE_CONFLICT'],
      [new BusinessRuleError('SALES_AWAITING_DELIVERY'), 422, 'SALES_AWAITING_DELIVERY'],
      [new Error('private database detail'), 500, 'INTERNAL_ERROR'],
    ];

    for (const [error, status, code] of cases) {
      const deps = makeDependencies({
        queries: { getOwn: jest.fn(async () => Promise.reject(error)) },
      });
      const response = await createCashUpRoutes(deps).getOwn(
        request('GET', `/api/v1/cash-ups/${cashUpId}`),
        { params: Promise.resolve({ id: cashUpId }) },
      );
      const body = await json(response);
      expect(response.status).toBe(status);
      expect(body).toMatchObject({ error: { code } });
      expect(JSON.stringify(body)).not.toContain('private database detail');
    }
  });

  it('returns request ids and no-store headers on errors', async () => {
    const deps = makeDependencies();
    const response = await createCashUpRoutes(deps).open(
      request('POST', '/api/v1/cash-ups', '{"businessId":"attacker"}', {
        'x-request-id': requestId,
      }),
    );
    expect(response.headers.get('x-request-id')).toBe(requestId);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await json(response)).toMatchObject({ error: { requestId } });
  });
});

describe('open-cash-up idempotency', () => {
  const body = '{"floatUsd":"1.00","floatLbp":"0.00"}';
  const key = 'token_12345';

  it('replays successful opens and rejects mismatched/in-progress requests', async () => {
    const store = new InMemoryIdempotencyStore();
    const deps = makeDependencies({ idempotencyStore: store });
    const routes = createCashUpRoutes(deps);
    const first = await routes.open(
      request('POST', '/api/v1/cash-ups', body, { 'idempotency-key': key }),
    );
    const replay = await routes.open(
      request('POST', '/api/v1/cash-ups', body, { 'idempotency-key': key }),
    );
    expect(first.status).toBe(201);
    expect(replay.headers.get('idempotent-replayed')).toBe('true');
    expect(await json(replay)).toEqual({ data: cashUp });
    expect(deps.lifecycle.open).toHaveBeenCalledTimes(1);

    const mismatch = await routes.open(
      request(
        'POST',
        '/api/v1/cash-ups',
        '{"floatUsd":"2.00","floatLbp":"0.00"}',
        { 'idempotency-key': key },
      ),
    );
    expect(mismatch.status).toBe(422);
    expect(await json(mismatch)).toMatchObject({
      error: { code: 'IDEMPOTENCY_KEY_MISMATCH' },
    });

    const parsedBody = openCashUpSchema.parse({ floatUsd: '3.00', floatLbp: '0.00' });
    await store.begin(
      `${businessId}:${userId}:POST:/api/v1/cash-ups`,
      'inflight_123',
      hashCanonicalBody(parsedBody),
    );
    const inProgress = await routes.open(
      request('POST', '/api/v1/cash-ups', '{"floatUsd":"3.00","floatLbp":"0.00"}', {
        'idempotency-key': 'inflight_123',
      }),
    );
    expect(inProgress.status).toBe(409);
    expect(await json(inProgress)).toMatchObject({
      error: { code: 'IDEMPOTENCY_IN_PROGRESS' },
    });
  });

  it('rejects malformed idempotency keys as validation errors', async () => {
    const deps = makeDependencies();
    const response = await createCashUpRoutes(deps).open(
      request('POST', '/api/v1/cash-ups', body, { 'idempotency-key': 'bad' }),
    );
    expect(response.status).toBe(400);
    const responseBody = await json(response);
    expect(responseBody).toMatchObject({
      error: {
        details: [{ path: ['header', 'Idempotency-Key'] }],
      },
    });
    expect(JSON.stringify(responseBody)).not.toContain('"bad"');
    expect(deps.lifecycle.open).not.toHaveBeenCalled();
  });

  it('abandons a failed create so the same key can be retried', async () => {
    const open = jest
      .fn()
      .mockRejectedValueOnce(new Error('private service detail'))
      .mockResolvedValue(cashUp);
    const deps = makeDependencies({
      lifecycle: { open },
      idempotencyStore: new InMemoryIdempotencyStore(),
    });
    const routes = createCashUpRoutes(deps);
    const first = await routes.open(
      request('POST', '/api/v1/cash-ups', body, { 'idempotency-key': key }),
    );
    const retry = await routes.open(
      request('POST', '/api/v1/cash-ups', body, { 'idempotency-key': key }),
    );

    expect(first.status).toBe(500);
    expect(retry.status).toBe(201);
    expect(open).toHaveBeenCalledTimes(2);
  });
});

describe('route file architecture', () => {
  it('limits route exports to HTTP methods/segment config and blocks lower-layer imports', () => {
    const apiRoot = path.resolve(process.cwd(), 'src/app/api');
    const routeFiles = findRouteFiles(apiRoot);
    expect(routeFiles.length).toBeGreaterThan(0);

    for (const file of routeFiles) {
      const content = readFileSync(file, 'utf8');
      const exports = Array.from(
        content.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z_$][\w$]*)/g),
        (match) => match[1],
      );
      expect(exports.every((name) =>
        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'dynamic', 'revalidate', 'runtime'].includes(name),
      )).toBe(true);
      expect(content).not.toMatch(/from\s+['"][^'"]*(?:persistence|domain|generated\/prisma)/);
    }
  });
});

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findRouteFiles(entryPath);
    return entry.name === 'route.ts' ? [entryPath] : [];
  });
}

const authenticationRouteCases = [
  {
    name: 'open',
    invoke: (deps: HttpDependencies) =>
      createCashUpRoutes(deps).open(
        request('POST', '/api/v1/cash-ups', '{"floatUsd":"1.00"}'),
      ),
  },
  {
    name: 'own history',
    invoke: (deps: HttpDependencies) =>
      createCashUpRoutes(deps).listOwn(request('GET', '/api/v1/cash-ups')),
  },
  {
    name: 'own detail',
    invoke: (deps: HttpDependencies) =>
      createCashUpRoutes(deps).getOwn(
        request('GET', `/api/v1/cash-ups/${cashUpId}`),
        { params: Promise.resolve({ id: cashUpId }) },
      ),
  },
  {
    name: 'submit',
    invoke: (deps: HttpDependencies) =>
      createCashUpRoutes(deps).submit(
        request('POST', `/api/v1/cash-ups/${cashUpId}/submit`),
        { params: Promise.resolve({ id: cashUpId }) },
      ),
  },
  {
    name: 'open review summaries',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).open(request('GET', '/api/v1/review/cash-ups/open')),
  },
  {
    name: 'submitted review list',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).submitted(request('GET', '/api/v1/review/cash-ups/submitted')),
  },
  {
    name: 'reviewed history',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).reviewed(request('GET', '/api/v1/review/cash-ups/reviewed')),
  },
  {
    name: 'review detail',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).getReviewDetail(
        request('GET', `/api/v1/review/cash-ups/${cashUpId}`),
        { params: Promise.resolve({ id: cashUpId }) },
      ),
  },
  {
    name: 'approve',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).approve(
        request('POST', `/api/v1/review/cash-ups/${cashUpId}/approve`),
        { params: Promise.resolve({ id: cashUpId }) },
      ),
  },
  {
    name: 'return',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).returnToOpen(
        request('POST', `/api/v1/review/cash-ups/${cashUpId}/return`, '{"reason":"return"}'),
        { params: Promise.resolve({ id: cashUpId }) },
      ),
  },
];

const invalidRouteCases = [
  {
    name: 'open body',
    invoke: (deps: HttpDependencies) =>
      createCashUpRoutes(deps).open(
        request('POST', '/api/v1/cash-ups', '{"businessId":"untrusted"}'),
      ),
  },
  {
    name: 'own history query',
    invoke: (deps: HttpDependencies) =>
      createCashUpRoutes(deps).listOwn(request('GET', '/api/v1/cash-ups?userId=untrusted')),
  },
  {
    name: 'own detail path',
    invoke: (deps: HttpDependencies) =>
      createCashUpRoutes(deps).getOwn(
        request('GET', '/api/v1/cash-ups/not-a-uuid'),
        { params: Promise.resolve({ id: 'not-a-uuid' }) },
      ),
  },
  {
    name: 'submit path',
    invoke: (deps: HttpDependencies) =>
      createCashUpRoutes(deps).submit(
        request('POST', '/api/v1/cash-ups/not-a-uuid/submit'),
        { params: Promise.resolve({ id: 'not-a-uuid' }) },
      ),
  },
  {
    name: 'open summaries query',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).open(
        request('GET', '/api/v1/review/cash-ups/open?businessId=untrusted'),
      ),
  },
  {
    name: 'submitted query',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).submitted(
        request('GET', '/api/v1/review/cash-ups/submitted?role=OWNER'),
      ),
  },
  {
    name: 'reviewed query',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).reviewed(
        request('GET', '/api/v1/review/cash-ups/reviewed?status=OPEN'),
      ),
  },
  {
    name: 'review detail path',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).getReviewDetail(
        request('GET', '/api/v1/review/cash-ups/not-a-uuid'),
        { params: Promise.resolve({ id: 'not-a-uuid' }) },
      ),
  },
  {
    name: 'approve path',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).approve(
        request('POST', '/api/v1/review/cash-ups/not-a-uuid/approve'),
        { params: Promise.resolve({ id: 'not-a-uuid' }) },
      ),
  },
  {
    name: 'return body',
    invoke: (deps: HttpDependencies) =>
      createReviewRoutes(deps).returnToOpen(
        request('POST', `/api/v1/review/cash-ups/${cashUpId}/return`, '{"reason":"valid","status":"OPEN"}'),
        { params: Promise.resolve({ id: cashUpId }) },
      ),
  },
];

describe('shared route behavior on every endpoint', () => {
  it.each(authenticationRouteCases)('$name returns 401 before actor/service calls', async ({ invoke }) => {
    const sessionProvider: SessionProvider = {
      getSession: jest.fn(async () => {
        throw new UnauthenticatedError();
      }),
    };
    const actorResolver = { resolve: jest.fn(async () => actor) };
    const deps = makeDependencies({ sessionProvider, actorResolver });

    const response = await invoke(deps);
    expect(response.status).toBe(401);
    expect(actorResolver.resolve).not.toHaveBeenCalled();
    for (const serviceMethod of [
      ...Object.values(deps.lifecycle),
      ...Object.values(deps.queries),
    ]) {
      expect(serviceMethod).not.toHaveBeenCalled();
    }
  });

  it.each(invalidRouteCases)('$name rejects invalid input before actor/service calls', async ({ invoke }) => {
    const actorResolver = { resolve: jest.fn(async () => actor) };
    const deps = makeDependencies({ actorResolver });

    const response = await invoke(deps);
    expect(response.status).toBe(400);
    expect(actorResolver.resolve).not.toHaveBeenCalled();
    for (const serviceMethod of [
      ...Object.values(deps.lifecycle),
      ...Object.values(deps.queries),
    ]) {
      expect(serviceMethod).not.toHaveBeenCalled();
    }
  });
});
