/** Fake logged-in user. The real one comes from the backend later. */
export const mockSession = {
    businessId: "mock-business",
    businessName: "Ali's Deliveries",
    userName: "Mohamad",
    email: "driver@example.com",
    // How a driver differs from a cashier is still an open question for the team.
    role: "DRIVER" as "DRIVER" | "CASHIER",
};
