import type { UnitOfWork } from '../persistence';
import { ActorResolver } from './actor-resolver';
import { AuditTrail } from './audit-trail';
import { CashUpApprovalPolicy } from './cash-up-approval-policy';
import { CashUpLifecycleService } from './cash-up-lifecycle.service';
import { CashUpQueryService } from './cash-up-query.service';
import { PermissionMatrix } from './permissions';
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
  };
}
