import { ActorResolver } from './actor-resolver';
import { AuditTrail } from './audit-trail';
import { BusinessSetupService } from './business-setup.service';
import { CashUpLifecycleService } from './cash-up-lifecycle.service';
import { CashUpQueryService } from './cash-up-query.service';
import { CashOutService } from './cash-out.service';
import { CountService } from './count.service';
import { SaleService } from './sale.service';
import { UseCaseRunner } from './use-case-runner';
import type { BusinessSetupPersistence, RepositoryProvider, TransactionRunner } from './ports';

export interface ServiceOverrides {
  readonly audit?: AuditTrail;
}

export function createServices(
  uow: TransactionRunner & RepositoryProvider & BusinessSetupPersistence,
  overrides: ServiceOverrides = {},
) {
  const runner = new UseCaseRunner(uow);
  const audit = overrides.audit ?? new AuditTrail();

  return {
    actorResolver: new ActorResolver(uow),
    businessSetup: new BusinessSetupService(runner, uow),
    lifecycle: new CashUpLifecycleService(runner, audit),
    queries: new CashUpQueryService(runner),
    sales: new SaleService(runner, audit),
    cashOuts: new CashOutService(runner, audit),
    counts: new CountService(runner, audit),
  };
}
