import type { TenantScope } from '../persistence';
import {
  AuditAction,
  AuditEntityType,
  CashUpStatus,
  DuplicateError,
} from '../persistence';
import type { OpenCashUpInput } from '../validation';
import type { Actor } from './actor';
import { canReview } from './cash-up-approval-policy';
import { AuditTrail } from './audit-trail';
import type { CashUpDto } from './dto';
import {
  BusinessRuleError,
  ConflictError,
  EntityNotFoundError,
  ForbiddenError,
} from './errors';
import { mapCashUp } from './mappers/cash-up.mapper';
import { assertCan } from './permissions';
import type { TransactionRepositories } from './ports';
import { buildCashUpSnapshot } from './submit-snapshot-builder';
import { UseCaseRunner } from './use-case-runner';

const CASH_UP_ENTITY = AuditEntityType.CASH_UP;

export class CashUpLifecycleService {
  constructor(
    private readonly runner: UseCaseRunner,
    private readonly audit: AuditTrail,
  ) {}

  open(actor: Actor, input: OpenCashUpInput): Promise<CashUpDto> {
    const scope: TenantScope = { businessId: actor.businessId };
    return this.runner.run(scope, async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.open', settings.isSolo);
      let opened;
      try {
        opened = await repos.cashUps.open({
          membershipId: actor.membershipId,
          floatUsd: input.floatUsd,
          floatLbp: input.floatLbp,
          referenceRate: input.referenceRate,
        });
      } catch (error) {
        if (error instanceof DuplicateError) throw new ConflictError('CASHUP_ALREADY_OPEN');
        throw error;
      }

      await this.audit.record(repos, actor, {
        action: AuditAction.CASHUP_OPENED,
        entityType: CASH_UP_ENTITY,
        entityId: opened.id,
      });
      return mapCashUp(await this.requireCashUp(repos, opened.id));
    });
  }

  submit(actor: Actor, cashUpId: string): Promise<CashUpDto> {
    const scope: TenantScope = { businessId: actor.businessId };
    return this.runner.run(scope, async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.submit', settings.isSolo);
      const locked = await repos.cashUps.lockForUpdate(cashUpId);
      const cashUp = await repos.cashUps.findOwn(cashUpId, actor.membershipId);
      if (!cashUp) throw new EntityNotFoundError();
      if (locked.status !== CashUpStatus.OPEN) {
        throw new BusinessRuleError('CASHUP_NOT_OPEN');
      }

      if ((await repos.sales.countAwaitingDelivery(cashUpId)) > 0) {
        throw new BusinessRuleError('SALES_AWAITING_DELIVERY');
      }
      const [awaitingRequests, flags] = await Promise.all([
        repos.requests.countAwaitingByCashUp(cashUpId),
        repos.sales.flagCounts(cashUpId),
      ]);
      if (awaitingRequests > 0 || flags.deletionAwaiting > 0) {
        throw new BusinessRuleError('REQUESTS_AWAITING_DECISION');
      }

      const snapshot = await buildCashUpSnapshot(repos, cashUp);
      await repos.cashUps.submit(cashUpId, snapshot);
      await this.audit.record(repos, actor, {
        action: AuditAction.CASHUP_SUBMITTED,
        entityType: CASH_UP_ENTITY,
        entityId: cashUpId,
        metadata: { gapUsd: String(snapshot.gapUsd), gapLbp: String(snapshot.gapLbp) },
      });
      return mapCashUp(await this.requireCashUp(repos, cashUpId));
    });
  }

  approve(actor: Actor, cashUpId: string): Promise<CashUpDto> {
    const scope: TenantScope = { businessId: actor.businessId };
    return this.runner.run(scope, async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.review', settings.isSolo);
      const locked = await repos.cashUps.lockForUpdate(cashUpId);
      if (locked.status === CashUpStatus.OPEN) throw new EntityNotFoundError();
      if (locked.status !== CashUpStatus.SUBMITTED) {
        throw new ConflictError('CASHUP_STATE_CONFLICT');
      }
      const cashUp = await this.requireCashUp(repos, cashUpId);
      const owner = await repos.memberships.findById(cashUp.membershipId);
      if (!owner) throw new EntityNotFoundError();
      const decision = canReview({
        reviewer: actor.role,
        reviewerMembershipId: actor.membershipId,
        cashUpOwner: owner.role,
        ownerMembershipId: owner.id,
        isSolo: settings.isSolo,
      });
      if (!decision.allowed) throw new ForbiddenError('REVIEW_NOT_ALLOWED');

      const approved = await repos.cashUps.approve(
        cashUpId,
        actor.membershipId,
        decision.selfApproved,
      );
      await this.audit.record(repos, actor, {
        action: decision.selfApproved
          ? AuditAction.CASHUP_SELF_APPROVED
          : AuditAction.CASHUP_APPROVED,
        entityType: CASH_UP_ENTITY,
        entityId: cashUpId,
      });
      return mapCashUp(await this.requireCashUp(repos, approved.id));
    });
  }

  returnToOpen(actor: Actor, cashUpId: string, reason: string): Promise<CashUpDto> {
    const scope: TenantScope = { businessId: actor.businessId };
    return this.runner.run(scope, async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.review', settings.isSolo);
      const locked = await repos.cashUps.lockForUpdate(cashUpId);
      if (locked.status === CashUpStatus.OPEN) throw new EntityNotFoundError();
      if (locked.status !== CashUpStatus.SUBMITTED) {
        throw new ConflictError('CASHUP_STATE_CONFLICT');
      }
      const cashUp = await this.requireCashUp(repos, cashUpId);
      const owner = await repos.memberships.findById(cashUp.membershipId);
      if (!owner) throw new EntityNotFoundError();
      this.assertReviewer(actor, owner.role, owner.id, settings.isSolo);

      const returned = await repos.cashUps.returnToOpen(cashUpId, reason);
      await this.audit.record(repos, actor, {
        action: AuditAction.CASHUP_RETURNED,
        entityType: CASH_UP_ENTITY,
        entityId: cashUpId,
        metadata: { reason },
      });
      return mapCashUp(await this.requireCashUp(repos, returned.id));
    });
  }

  private async requireBusiness(
    repos: TransactionRepositories,
  ): Promise<{ id: string; name: string; isSolo: boolean }> {
    const settings = await repos.businesses.findSettings();
    if (!settings) throw new EntityNotFoundError();
    return settings;
  }

  private async requireCashUp(repos: TransactionRepositories, id: string) {
    const cashUp = await repos.cashUps.findById(id);
    if (!cashUp) throw new EntityNotFoundError();
    return cashUp;
  }

  private assertReviewer(
    actor: Actor,
    ownerRole: typeof actor.role,
    ownerMembershipId: string,
    isSolo: boolean,
  ): void {
    const decision = canReview({
      reviewer: actor.role,
      reviewerMembershipId: actor.membershipId,
      cashUpOwner: ownerRole,
      ownerMembershipId,
      isSolo,
    });
    if (!decision.allowed) throw new ForbiddenError('REVIEW_NOT_ALLOWED');
  }
}
