/** Fake logged-in user. The real one comes from the backend later. */
export const mockSession = {
    businessName: "Ali's Deliveries",
    userName: "Mohamad",
    // How a driver differs from a cashier is still an open question for the team.
    role: "DRIVER" as "DRIVER" | "CASHIER",
};
