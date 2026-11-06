import type { UnitOfWork } from '../persistence';
import { ActorResolver } from './actor-resolver';
import { AuditTrail } from './audit-trail';
import { BusinessSetupService } from './business-setup.service';
import { CashUpApprovalPolicy } from './cash-up-approval-policy';
import { CashUpLifecycleService } from './cash-up-lifecycle.service';
import { CashUpQueryService } from './cash-up-query.service';
import { CashOutService } from './cash-out.service';
import { CountService } from './count.service';
import { PermissionMatrix } from './permissions';
import { SaleService } from './sale.service';
import { SubmitSnapshotBuilder } from './submit-snapshot-builder';
import { UseCaseRunner } from './use-case-runner';

export interface ServiceOverrides {
  readonly audit?: AuditTrail;
}

export function createServices(uow: UnitOfWork, overrides: ServiceOverrides = {}) {
  const runner = new UseCaseRunner(uow);
  const permissions = new PermissionMatrix();
  const approvalPolicy = new CashUpApprovalPolicy();
  const snapshots = new SubmitSnapshotBuilder();
  const audit = overrides.audit ?? new AuditTrail();

  return {
    actorResolver: new ActorResolver(uow),
    businessSetup: new BusinessSetupService(runner, permissions, uow),
    permissions,
    approvalPolicy,
    lifecycle: new CashUpLifecycleService(
      runner,
      permissions,
      approvalPolicy,
      snapshots,
      audit,
    ),
    queries: new CashUpQueryService(runner, permissions, approvalPolicy),
    sales: new SaleService(runner, permissions, audit),
    cashOuts: new CashOutService(runner, permissions, audit),
    counts: new CountService(runner, permissions, audit),
  };
}
