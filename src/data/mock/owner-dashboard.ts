import { HomeDashboardData } from "@/types/owner/home-dashboard";

export const mockHomeData: HomeDashboardData = {
  stats: {
    toReview: 2,
    requestsWaiting: 2,
    openNow: 2,
  },
  cashUpsToReview: {
    count: 2,
    names: ["Mohamad", "Rami"],
  },
  requests: {
    count: 2,
    description: "Delete a sale, void a cash-up",
  },
  openCashUps: [
    {
      id: "1",
      fullName: "Mohamad Ghanem",
      since: "08:30",
      salesCount: 3,
    },
    {
      id: "2",
      fullName: "Rami Haddad",
      since: "09:10",
      salesCount: 1,
    },
  ],
  approvedSummary: {
    title: "Approved cash-ups",
    subtitle: "Locked and final",
    status: "Approved",
  },
};
