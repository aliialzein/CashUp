import { closeHttpDeps, getHttpDeps } from '../../../src/server/composition';
import { createCashUpRoutes } from '../../../src/http/routes/cashUps';
import { createReviewRoutes } from '../../../src/http/routes/review';
import { prisma, resetDatabase, seedBusinesses } from '../persistence/test-support';
import type { BusinessFixture } from '../persistence/test-support';

function sessionHeaders(userId?: string, businessId?: string): HeadersInit {
  const headers = new Headers();
  if (userId) headers.set('x-dev-user-id', userId);
  if (businessId) headers.set('x-dev-business-id', businessId);
  return headers;
}

function makeRequest(
  method: string,
  path: string,
  userId?: string,
  businessId?: string,
  body?: unknown,
): Request {
  const headers = new Headers(sessionHeaders(userId, businessId));
  if (body !== undefined) headers.set('content-type', 'application/json');
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('CashUp HTTP routes with the real composition', () => {
  let business: BusinessFixture;
  let summaryBusiness: BusinessFixture;

  beforeAll(async () => {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL;
    if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL must be configured.');
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.CASHUP_DEV_AUTH = '1';

    await resetDatabase();
    const fixtures = await seedBusinesses();
    business = fixtures.businessA;
    summaryBusiness = fixtures.businessB;
  });

  afterAll(async () => {
    await closeHttpDeps();
    await prisma.$disconnect();
  });

  it('opens, reads, submits, and approves a Staff cash-up through HTTP', async () => {
    const staff = business.members.staff1;
    const manager = business.members.manager;
    const routes = createCashUpRoutes(getHttpDeps());
    const reviewerRoutes = createReviewRoutes(getHttpDeps());

    const opened = await routes.open(
      makeRequest('POST', '/api/v1/cash-ups', staff.userId, business.id, {
        floatUsd: '10.00',
        floatLbp: '0.00',
      }),
    );
    expect(opened.status).toBe(201);
    const openedBody = await opened.json();
    const cashUpId = openedBody.data.id as string;

    const ownDetail = await routes.getOwn(
      makeRequest('GET', `/api/v1/cash-ups/${cashUpId}`, staff.userId, business.id),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(ownDetail.status).toBe(200);
    expect((await ownDetail.json()).data.id).toBe(cashUpId);

    const submitted = await routes.submit(
      makeRequest('POST', `/api/v1/cash-ups/${cashUpId}/submit`, staff.userId, business.id),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(submitted.status).toBe(200);

    const approved = await reviewerRoutes.approve(
      makeRequest(
        'POST',
        `/api/v1/review/cash-ups/${cashUpId}/approve`,
        manager.userId,
        business.id,
      ),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(approved.status).toBe(200);
    expect((await approved.json()).data.status).toBe('APPROVED');
  });

  it('returns a cash-up with a reason and lets Staff see it reopened', async () => {
    const staff = business.members.staff1;
    const manager = business.members.manager;
    const routes = createCashUpRoutes(getHttpDeps());
    const reviewerRoutes = createReviewRoutes(getHttpDeps());

    const opened = await routes.open(
      makeRequest('POST', '/api/v1/cash-ups', staff.userId, business.id, {}),
    );
    const cashUpId = (await opened.json()).data.id as string;
    await routes.submit(
      makeRequest('POST', `/api/v1/cash-ups/${cashUpId}/submit`, staff.userId, business.id),
      { params: Promise.resolve({ id: cashUpId }) },
    );

    const returned = await reviewerRoutes.returnToOpen(
      makeRequest(
        'POST',
        `/api/v1/review/cash-ups/${cashUpId}/return`,
        manager.userId,
        business.id,
        { reason: 'Please recount the float.' },
      ),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(returned.status).toBe(200);
    expect((await returned.json()).data.returnReason).toBe('Please recount the float.');

    const ownDetail = await routes.getOwn(
      makeRequest('GET', `/api/v1/cash-ups/${cashUpId}`, staff.userId, business.id),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect((await ownDetail.json()).data.status).toBe('OPEN');
  });

  it('does not let one Staff member read another Staff member cash-up', async () => {
    const owner = business.members.staff2;
    const otherStaff = business.members.staff1;
    const routes = createCashUpRoutes(getHttpDeps());
    const opened = await routes.open(
      makeRequest('POST', '/api/v1/cash-ups', owner.userId, business.id, {}),
    );
    const cashUpId = (await opened.json()).data.id as string;

    const response = await routes.getOwn(
      makeRequest('GET', `/api/v1/cash-ups/${cashUpId}`, otherStaff.userId, business.id),
      { params: Promise.resolve({ id: cashUpId }) },
    );
    expect(response.status).toBe(404);
  });


it('lists open summaries without cash-up amount fields', async () => {
  const staff = summaryBusiness.members.staff1;
  const routes = createCashUpRoutes(getHttpDeps());
  const reviewerRoutes = createReviewRoutes(getHttpDeps());

  await routes.open(
    makeRequest('POST', '/api/v1/cash-ups', staff.userId, summaryBusiness.id, {
      floatUsd: '99.00',
      floatLbp: '0.00',
    }),
  );

  const response = await reviewerRoutes.open(
    makeRequest(
      'GET',
      '/api/v1/review/cash-ups/open',
      summaryBusiness.members.manager.userId,
      summaryBusiness.id,
    ),
  );

  expect(response.status).toBe(200);

  const body = await response.json();

  expect(Array.isArray(body.data)).toBe(true);
  expect(body.data.length).toBeGreaterThan(0);

  for (const cashUp of body.data) {
    // Financial amounts and detailed sales must not be exposed.
    expect(cashUp).not.toHaveProperty('floatUsd');
    expect(cashUp).not.toHaveProperty('floatLbp');
    expect(cashUp).not.toHaveProperty('expectedUsd');
    expect(cashUp).not.toHaveProperty('gapUsd');
    expect(cashUp).not.toHaveProperty('sales');

    // Summary information is allowed.
    expect(cashUp).toHaveProperty('salesCount');
    expect(cashUp).toHaveProperty('requestsCount');
  }
});


  it('returns 401 when the development session headers are missing', async () => {
    const response = await createCashUpRoutes(getHttpDeps()).listOwn(
      makeRequest('GET', '/api/v1/cash-ups'),
    );
    expect(response.status).toBe(401);
  });
});
