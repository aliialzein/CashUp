export interface HomeDashboardData {
  stats: {
    toReview: number;
    requestsWaiting: number;
    openNow: number;
  };
  cashUpsToReview: {
    count: number;
    names: string[];
  };
  requests: {
    count: number;
    description: string;
  };
  openCashUps: {
    id: string;
    fullName: string;
    since: string;
    salesCount: number;
  }[];
  approvedSummary: {
    title: string;
    subtitle: string;
    status: string;
  };
}
