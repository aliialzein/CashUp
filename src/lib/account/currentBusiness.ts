import type { Account, Business } from "@/types/account";

/** The business the user is working in right now. */
export function getCurrentBusiness(account: Account): Business {
    return account.businesses.find((business) => business.id === account.currentBusinessId) ?? account.businesses[0];
}
