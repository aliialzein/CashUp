import type { Account } from "@/types/account";

export const mockAccount: Account = {
    fullName: "Mohamad Ghanem",
    email: "mohamad@example.com",
    language: "en",
    currentBusinessId: "b-1",
    businesses: [
        { id: "b-1", name: "Ali's Deliveries", role: "Driver" },
        { id: "b-2", name: "Ali Express Shop", role: "Driver" },
    ],
};
