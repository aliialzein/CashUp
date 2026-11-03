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
    businesses: { findSettings: unused, ...overrides.businesses },
    memberships: {
      findActiveByUser: unused,
      findById: unused,
      listByRole: unused,
      ...overrides.memberships,
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
      ...overrides.cashUps,
    },
    sales: {
      list: unused,
      countAwaitingDelivery: unused,
      countByStatus: unused,
      flagCounts: unused,
      totalsByCurrencyAndMethod: unused,
      changeGivenByCurrency: unused,
      ...overrides.sales,
    },
    cashOuts: {
      listByCashUp: unused,
      totalsByCurrency: unused,
      ...overrides.cashOuts,
    },
    counts: {
      listByCashUp: unused,
      countedTotals: unused,
      ...overrides.counts,
    },
    audit: { append: unused, list: unused, ...overrides.audit },
    requests: { countAwaitingByCashUp: unused, ...overrides.requests },
  };
}
