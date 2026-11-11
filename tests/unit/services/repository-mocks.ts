import type { PrismaClient, Prisma } from '../../../src/generated/prisma/client';
import { BusinessRepository } from '../../../src/modules/business/business.repository';
import { CashUpRepository } from '../../../src/modules/cash-ups/cash-ups.repository';
import { SaleRepository } from '../../../src/modules/sales/sales.repository';
import { CashOutRepository } from '../../../src/modules/cash-outs/cash-outs.repository';
import { AuditRepository } from '../../../src/modules/audit/audit.repository';
type ConcreteRepositories = {
    businesses: BusinessRepository;
    memberships: BusinessRepository;
    joinCodes: BusinessRepository;
    cashUps: CashUpRepository;
    sales: SaleRepository;
    cashOuts: CashOutRepository;
    counts: CashUpRepository;
    audit: AuditRepository;
    requests: CashUpRepository;
};
type AwaitableMethods<T, K extends keyof T> = {
    readonly [P in K]: T[P] extends (...args: infer Args) => infer Result ? (...args: Args) => Promise<Awaited<Result>> : never;
};
export interface RepositoryMocks {
    readonly businesses: AwaitableMethods<ConcreteRepositories['businesses'], 'findSettings' | 'getBusiness' | 'lockBusiness' | 'setBusinessSolo'>;
    readonly memberships: AwaitableMethods<ConcreteRepositories['memberships'], 'findById' | 'getMember' | 'listMembers' | 'setMemberStatus' | 'replaceManager'>;
    readonly joinCodes: AwaitableMethods<ConcreteRepositories['joinCodes'], 'listJoinCodes' | 'createJoinCode' | 'revokeJoinCode'>;
    readonly cashUps: AwaitableMethods<ConcreteRepositories['cashUps'], 'pendingSaleAmendmentFields' | 'findOpenByMembership' | 'voidCashUp' | 'open' | 'findOwn' | 'findForReview' | 'findById' | 'listOwn' | 'listOpenSummaries' | 'listSubmitted' | 'listReviewed' | 'lockForUpdate' | 'submit' | 'approve' | 'returnToOpen' | 'countUnresolvedCashUpsForUser'>;
    readonly sales: AwaitableMethods<ConcreteRepositories['sales'], 'hasReplayChanges' | 'create' | 'findById' | 'edit' | 'markDelivered' | 'cancelToDeliver' | 'list' | 'countAwaitingDelivery' | 'countByStatus' | 'flagCounts' | 'totalsByCurrencyAndMethod' | 'changeGivenByCurrency'>;
    readonly cashOuts: AwaitableMethods<ConcreteRepositories['cashOuts'], 'create' | 'findById' | 'listByCashUp' | 'cancel'>;
    readonly counts: AwaitableMethods<ConcreteRepositories['counts'], 'listByCashUp' | 'countedTotals' | 'saveLines'>;
    readonly audit: AwaitableMethods<ConcreteRepositories['audit'], 'append'>;
    readonly requests: AwaitableMethods<ConcreteRepositories['requests'], 'countAwaitingByCashUp'>;
}
const unused = async () => {
    throw new Error('Unexpected repository call in test.');
};
export type RepositoryMockOverrides = {
    [K in keyof RepositoryMocks]?: Partial<RepositoryMocks[K]>;
};
export function mockRepositories(overrides: RepositoryMockOverrides = {}): RepositoryMocks {
    const mocks: RepositoryMocks = {
        businesses: {
            findSettings: unused,
            getBusiness: unused,
            lockBusiness: async () => null,
            setBusinessSolo: unused,
            ...overrides.businesses,
        },
        memberships: {
            findById: unused,
            getMember: unused,
            listMembers: unused,
            setMemberStatus: unused,
            replaceManager: unused,
            ...overrides.memberships,
        },
        joinCodes: {
            listJoinCodes: unused,
            createJoinCode: unused,
            revokeJoinCode: unused,
            ...overrides.joinCodes,
        },
        cashUps: {
            pendingSaleAmendmentFields: async () => [],
            findOpenByMembership: unused,
            voidCashUp: unused,
            open: unused,
            findOwn: unused,
            findForReview: unused,
            findById: unused,
            listOwn: unused,
            listOpenSummaries: unused,
            listSubmitted: unused,
            listReviewed: unused,
            lockForUpdate: unused,
            submit: unused,
            approve: unused,
            returnToOpen: unused,
            countUnresolvedCashUpsForUser: unused,
            ...overrides.cashUps,
        },
        sales: {
            hasReplayChanges: async () => false,
            create: unused,
            findById: unused,
            edit: unused,
            markDelivered: unused,
            cancelToDeliver: unused,
            list: unused,
            countAwaitingDelivery: unused,
            countByStatus: unused,
            flagCounts: unused,
            totalsByCurrencyAndMethod: unused,
            changeGivenByCurrency: unused,
            ...overrides.sales,
        },
        cashOuts: {
            create: unused,
            findById: unused,
            listByCashUp: unused,
            cancel: unused,
            ...overrides.cashOuts,
        },
        counts: {
            listByCashUp: unused,
            countedTotals: unused,
            saveLines: unused,
            ...overrides.counts,
        },
        audit: { append: unused, ...overrides.audit },
        requests: { countAwaitingByCashUp: unused, ...overrides.requests },
    };
    const prototypes = { businesses: BusinessRepository.prototype, memberships: BusinessRepository.prototype, joinCodes: BusinessRepository.prototype, cashUps: CashUpRepository.prototype, sales: SaleRepository.prototype, cashOuts: CashOutRepository.prototype, counts: CashUpRepository.prototype, audit: AuditRepository.prototype, requests: CashUpRepository.prototype };
    for (const key of Object.keys(mocks) as (keyof RepositoryMocks)[]) {
        for (const method of Object.keys(mocks[key])) {
            Object.defineProperty(prototypes[key], method, { configurable: true, writable: true, value: Reflect.get(mocks[key], method) });
        }
    }
    return mocks;
}
/** A transaction boundary fake; query behavior is mocked at concrete repository methods. */
export function testDatabase(saleFindFirst: () => Promise<unknown | null> = async () => null) {
    const tx = { sale: { findFirst: jest.fn(saleFindFirst) } } as unknown as Prisma.TransactionClient;
    return { $transaction: jest.fn(async (work: (client: Prisma.TransactionClient) => Promise<unknown>) => work(tx)) } as unknown as PrismaClient;
}
