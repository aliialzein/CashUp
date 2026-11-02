export const routes = {
  driver: {
    today: "/today",
    history: "/history",
    account: "/account",
    sales: "/sales",
    addSale: "/sales/new",
    completeDelivery: (id: string) => `/sales/${id}/complete`,
    cashOuts: "/cash-outs",
    countCash: "/count-cash",
  },
} as const;
