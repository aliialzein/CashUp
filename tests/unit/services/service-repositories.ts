import type { ServiceRepositories } from '../../../src/services/ports';

const unused = async () => {
  throw new Error('Unexpected repository call in test.');
};

type ServiceRepositoryOverrides = {
  [K in keyof ServiceRepositories]?: Partial<ServiceRepositories[K]>;
};

export function serviceRepositories(
  overrides: ServiceRepositoryOverrides = {},
): ServiceRepositories {
  return {
    businesses: {
      findSettings: unused,
      getBusiness: unused,
      lockBusiness: unused,
      setBusinessSolo: unused,
      ...overrides.businesses,
    },
    memberships: {
      findActiveByUser: unused,
      findById: unused,
      getMember: unused,
      listMembers: unused,
      listByRole: unused,
      setMemberStatus: unused,
      replaceManager: unused,
      ...overrides.memberships,
    },
    joinCodes: {
      listJoinCodes: unused,
      createJoinCode: unused,
      revokeJoinCode: unused,
      ...overrides.joinCodes,
    },
    cashUps: {
      open: unused,
      findOwn: unused,
      findForReview: unused,
      findById: unused,
      listOwn: unused,
      listOpenSummaries: unused,
      listSubmitted: unused,
      listReviewed: unused,
      lockForUpdate: unused,
      lockOpenForUpdate: unused,
      submit: unused,
      approve: unused,
      returnToOpen: unused,
      countUnresolvedCashUpsForUser: unused,
      countUnresolvedCashUpsForBusiness: unused,
      ...overrides.cashUps,
    },
    sales: {
      create: unused,
      findById: unused,
      findByIdempotencyKey: unused,
      edit: unused,
      markDelivered: unused,
      cancelToDeliver: unused,
      list: unused,
      countAwaitingDelivery: unused,
      countByStatus: unused,
      flagCounts: unused,
      totalsByCurrencyAndMethod: unused,
      changeGivenByCurrency: unused,
      ...overrides.sales,
    },
    cashOuts: {
      create: unused,
      findById: unused,
      listByCashUp: unused,
      cancel: unused,
      ...overrides.cashOuts,
    },
    counts: {
      listByCashUp: unused,
      countedTotals: unused,
      saveLines: unused,
      ...overrides.counts,
    },
    audit: { append: unused, list: unused, ...overrides.audit },
    requests: { countAwaitingByCashUp: unused, ...overrides.requests },
  };
}
