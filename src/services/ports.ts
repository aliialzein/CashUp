import type { Repositories, TenantScope, UnitOfWork } from '../persistence';

export interface TransactionRunner {
  run<T>(scope: TenantScope, fn: (repos: ServiceRepositories) => Promise<T>): Promise<T>;
}

export interface RepositoryProvider {
  repos(scope: TenantScope): { readonly memberships: MembershipLookup };
}

export type BusinessSetupPersistence = Pick<
  UnitOfWork,
  'createBusinessWithOwner' | 'redeemJoinCodeByHash'
>;

type AwaitableMethods<T, K extends keyof T> = {
  readonly [P in K]: T[P] extends (...args: infer Args) => infer Result
    ? (...args: Args) => Promise<Awaited<Result>>
    : never;
};

export interface ServiceRepositories {
  readonly businesses: AwaitableMethods<
    Repositories['businesses'],
    'findSettings' | 'getBusiness' | 'lockBusiness' | 'setBusinessSolo'
  >;
  readonly memberships: AwaitableMethods<
    Repositories['memberships'],
    | 'findById'
    | 'getMember'
    | 'listMembers'
    | 'setMemberStatus'
    | 'replaceManager'
  >;
  readonly joinCodes: AwaitableMethods<
    Repositories['joinCodes'],
    'listJoinCodes' | 'createJoinCode' | 'revokeJoinCode'
  >;
  readonly cashUps: AwaitableMethods<
    Repositories['cashUps'],
    | 'open'
    | 'findOwn'
    | 'findForReview'
    | 'findById'
    | 'listOwn'
    | 'listOpenSummaries'
    | 'listSubmitted'
    | 'listReviewed'
    | 'lockForUpdate'
    | 'submit'
    | 'approve'
    | 'returnToOpen'
    | 'countUnresolvedCashUpsForUser'
  >;
  readonly sales: AwaitableMethods<
    Repositories['sales'],
    | 'create'
    | 'findById'
    | 'edit'
    | 'markDelivered'
    | 'cancelToDeliver'
    | 'list'
    | 'countAwaitingDelivery'
    | 'countByStatus'
    | 'flagCounts'
    | 'totalsByCurrencyAndMethod'
    | 'changeGivenByCurrency'
  >;
  readonly cashOuts: AwaitableMethods<
    Repositories['cashOuts'],
    'create' | 'findById' | 'listByCashUp' | 'cancel'
  >;
  readonly counts: AwaitableMethods<
    Repositories['counts'],
    'listByCashUp' | 'countedTotals' | 'saveLines'
  >;
  readonly audit: AwaitableMethods<Repositories['audit'], 'append'>;
  readonly requests: AwaitableMethods<Repositories['requests'], 'countAwaitingByCashUp'>;
}

export const TRANSACTION_CONTEXT: unique symbol = Symbol('CashUpTransactionContext');

/** Narrow repository groups without dropping the transaction-context requirement. */
export type TransactionRepositories<
  K extends keyof ServiceRepositories = keyof ServiceRepositories,
> = Pick<ServiceRepositories, K> & {
  readonly [TRANSACTION_CONTEXT]: true;
};

export function markTransactionRepositories(
  repositories: ServiceRepositories,
): TransactionRepositories {
  return Object.assign(repositories, { [TRANSACTION_CONTEXT]: true as const });
}

export interface ActorMembership {
  readonly id: string;
  readonly userId: string;
  readonly businessId: string;
  readonly role: import('../persistence').MembershipRole;
  readonly status: import('../persistence').MembershipStatus;
}

export interface MembershipLookup {
  findActiveByUser(userId: string): PromiseLike<ActorMembership | null>;
}
