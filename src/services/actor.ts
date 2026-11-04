import type { MembershipRole } from '../persistence';

export const ACTOR_BRAND: unique symbol = Symbol('CashUpActor');

export type Actor = Readonly<{
  userId: string;
  membershipId: string;
  businessId: string;
  role: MembershipRole;
  [ACTOR_BRAND]: true;
}>;
