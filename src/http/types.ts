import type { ActorResolver } from '../services';
import type { CashUpLifecycleService } from '../services/cash-up-lifecycle.service';
import type { CashUpQueryService } from '../services/cash-up-query.service';
import type { CashOutService } from '../services/cash-out.service';
import type { CountService } from '../services/count.service';
import type { SaleService } from '../services/sale.service';
import type { BusinessSetupService } from '../services/business-setup.service';
import type { IdempotencyStore } from './idempotency';
import type { InternalErrorReporter } from './errorMapper';
import type { SessionProvider } from './session';

export interface HttpDependencies {
  readonly sessionProvider: SessionProvider;
  readonly actorResolver: Pick<ActorResolver, 'resolve'>;
  readonly lifecycle: Pick<
    CashUpLifecycleService,
    'open' | 'submit' | 'approve' | 'returnToOpen'
  >;
  readonly sales: Pick<SaleService, 'create' | 'edit' | 'confirmDelivery' | 'cancel'>;
  readonly cashOuts: Pick<CashOutService, 'create' | 'cancel'>;
  readonly counts: Pick<CountService, 'replace'>;
  readonly queries: Pick<
    CashUpQueryService,
    | 'getOwn'
    | 'listOwn'
    | 'listOpenSummaries'
    | 'listSubmitted'
    | 'listReviewed'
    | 'getReviewDetail'
  >;
  readonly businessSetup: Pick<
    BusinessSetupService,
    | 'createBusiness'
    | 'getBusiness'
    | 'listMembers'
    | 'deactivateMember'
    | 'replaceManager'
    | 'setBusinessSolo'
    | 'createJoinCode'
    | 'listJoinCodes'
    | 'revokeJoinCode'
    | 'redeemJoinCode'
  >;
  readonly idempotencyStore: IdempotencyStore;
  readonly reportInternalError?: InternalErrorReporter;
}
