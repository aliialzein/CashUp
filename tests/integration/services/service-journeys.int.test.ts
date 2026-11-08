import { prisma, resetDatabase, seedBusinesses, services, prepareForSubmission } from './service-test-support';
import type { BusinessFixture } from '../persistence/test-support';
import { getOwnOpenCashUp } from '../../../src/modules/cash-ups/cash-ups.service';
import { sessionCookieJar, withSessionCookies } from '../../support/session-cookies';

// Business assertions preserved from the removed mixed HTTP integration suite.
let business: BusinessFixture;
beforeEach(async () => { await resetDatabase(); business = (await seedBusinesses()).businessA; });
afterAll(async () => { await prisma.$disconnect(); });
async function members() {
  return {
    staff: await services.memberFor(business.members.staff1.userId, business.id),
    manager: await services.memberFor(business.members.manager.userId, business.id),
  };
}
it('opens, reads, submits and approves a staff cash-up through services', async () => {
  const { staff, manager } = await members();
  const opened = await services.lifecycle.open(staff, { floatUsd: '10.00', floatLbp: '0.00' });
  expect(await services.queries.getOwn(staff, opened.id)).toMatchObject({ id: opened.id, floatUsd: '10.00' });
  await prepareForSubmission(staff, opened.id);
  expect((await services.lifecycle.submit(staff, opened.id)).status).toBe('SUBMITTED');
  expect((await services.lifecycle.approve(manager, opened.id)).status).toBe('APPROVED');
});
it('returns a cash-up with its reason and lets staff read the reopened record', async () => {
  const { staff, manager } = await members();
  const opened = await services.lifecycle.open(staff, {});
  await prepareForSubmission(staff, opened.id);
  await services.lifecycle.submit(staff, opened.id);
  expect(await services.lifecycle.returnToOpen(manager, opened.id, 'Please recount the float.')).toMatchObject({ returnReason: 'Please recount the float.' });
  expect((await services.queries.getOwn(staff, opened.id)).status).toBe('OPEN');
});
it('hides another member cash-up instead of revealing its existence', async () => {
  const { staff } = await members();
  const other = await services.memberFor(business.members.staff2.userId, business.id);
  const opened = await services.lifecycle.open(other, {});
  await expect(services.queries.getOwn(staff, opened.id)).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
});
it('returns amount-free open summaries with sales/request counts', async () => {
  const { staff, manager } = await members();
  await services.lifecycle.open(staff, { floatUsd: '99.00', floatLbp: '0.00' });
  const rows = await services.queries.listOpenSummaries(manager);
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    for (const field of ['floatUsd', 'floatLbp', 'expectedUsd', 'gapUsd', 'sales']) expect(row).not.toHaveProperty(field);
    expect(row).toHaveProperty('salesCount');
    expect(row).toHaveProperty('requestsCount');
  }
});
it('requires a real cookie identity for direct service reads', async () => {
  await withSessionCookies(sessionCookieJar().jar, async () => {
    await expect(getOwnOpenCashUp()).rejects.toMatchObject({ name: 'UnauthenticatedError' });
  });
});
