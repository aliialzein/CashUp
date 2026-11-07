import type { TenantScope } from '../persistence';
import { CashUpStatus, SaleStatus } from '../persistence';
import { computeExpectedAndGap, summarizeSales, walletTotals } from '../domain/money';
import type { CashUpHistoryQuery, PageQuery } from '../validation';
import type { Actor } from './actor';
import { canReview } from './cash-up-approval-policy';
import type {
  CashUpDto,
  CashUpOwnDto,
  CashUpReviewDto,
  OpenCashUpSummaryDto,
} from './dto';
import { EntityNotFoundError } from './errors';
import { mapCashUp, mapOpenCashUpSummary } from './mappers/cash-up.mapper';
import { mapCashOut } from './mappers/cash-out.mapper';
import { mapCountEntry } from './mappers/count-entry.mapper';
import { mapSaleLine } from './mappers/sale.mapper';
import { assertCan } from './permissions';
import type { TransactionRepositories } from './ports';
import { UseCaseRunner } from './use-case-runner';

const REVIEW_SCAN_BATCH = 100;

export class CashUpQueryService {
  constructor(private readonly runner: UseCaseRunner) {}

  getOwn(actor: Actor, id: string): Promise<CashUpOwnDto> {
    return this.runner.run(this.scope(actor), async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.readOwn', settings.isSolo);
      const cashUp = await repos.cashUps.findOwn(id, actor.membershipId);
      if (!cashUp) throw new EntityNotFoundError();
      const [sales, salesSummary, cashOuts] = await Promise.all([
        repos.sales.list(id, { statuses: Object.values(SaleStatus) }),
        repos.sales.countByStatus(id),
        repos.cashOuts.listByCashUp(id),
      ]);
      return {
        ...mapCashUp(cashUp),
        sales: sales.map(mapSaleLine),
        salesSummary,
        cashOuts: cashOuts.map(mapCashOut),
      };
    });
  }

  listOwn(actor: Actor, query: PageQuery): Promise<CashUpDto[]> {
    return this.runner.run(this.scope(actor), async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.listOwn', settings.isSolo);
      const rows = await repos.cashUps.listOwn(actor.membershipId, {
        take: query.take,
        cursorId: query.cursorId,
      });
      return rows.map(mapCashUp);
    });
  }

  listOpenSummaries(actor: Actor): Promise<OpenCashUpSummaryDto[]> {
    return this.runner.run(this.scope(actor), async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.listOpenSummaries', settings.isSolo);
      return (await repos.cashUps.listOpenSummaries()).map(mapOpenCashUpSummary);
    });
  }

  listSubmitted(actor: Actor): Promise<CashUpDto[]> {
    return this.runner.run(this.scope(actor), async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.listSubmitted', settings.isSolo);
      const submitted = await repos.cashUps.listSubmitted();
      const visible = await this.filterReviewable(repos, actor, submitted, settings.isSolo);
      return visible.map(mapCashUp);
    });
  }

  listReviewed(actor: Actor, query: CashUpHistoryQuery): Promise<CashUpDto[]> {
    return this.runner.run(this.scope(actor), async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.readReviewed', settings.isSolo);
      const filters = {
        from: query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined,
        to: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined,
        membershipId: query.membershipId,
      };
      let cursorId = query.cursorId;
      if (cursorId) {
        const anchor = await repos.cashUps.findById(cursorId);
        if (
          !anchor ||
          (anchor.status !== CashUpStatus.APPROVED && anchor.status !== CashUpStatus.VOID) ||
          (filters.membershipId && anchor.membershipId !== filters.membershipId) ||
          (filters.from && anchor.openedAt < filters.from) ||
          (filters.to && anchor.openedAt > filters.to)
        ) {
          return [];
        }
        const visibleAnchor = await this.filterReviewable(
          repos,
          actor,
          [anchor],
          settings.isSolo,
        );
        if (visibleAnchor.length === 0) return [];
      }

      const visible: Awaited<ReturnType<typeof repos.cashUps.listReviewed>> = [];
      while (visible.length < query.take) {
        const rows = await repos.cashUps.listReviewed({
          ...filters,
          take: REVIEW_SCAN_BATCH,
          cursorId,
        });
        if (rows.length === 0) break;
        visible.push(...(await this.filterReviewable(repos, actor, rows, settings.isSolo)));
        const lastRow = rows.at(-1);
        if (!lastRow) break;
        cursorId = lastRow.id;
        if (rows.length < REVIEW_SCAN_BATCH) break;
      }
      return visible.slice(0, query.take).map(mapCashUp);
    });
  }

  getReviewDetail(actor: Actor, id: string): Promise<CashUpReviewDto> {
    return this.runner.run(this.scope(actor), async (repos) => {
      const settings = await this.requireBusiness(repos);
      assertCan(actor, 'cashUp.readReviewed', settings.isSolo);
      const cashUp = await repos.cashUps.findForReview(id);
      if (!cashUp) throw new EntityNotFoundError();
      this.assertReviewable(
        actor,
        cashUp.membership.role,
        cashUp.membershipId,
        settings.isSolo,
      );

      const [sales, salesSummary, cashOuts, countEntries, flags, saleTotals, changes, counted] =
        await Promise.all([
          repos.sales.list(id, { statuses: Object.values(SaleStatus) }),
          repos.sales.countByStatus(id),
          repos.cashOuts.listByCashUp(id),
          repos.counts.listByCashUp(id),
          repos.sales.flagCounts(id),
          repos.sales.totalsByCurrencyAndMethod(id),
          repos.sales.changeGivenByCurrency(id),
          repos.counts.countedTotals(id),
        ]);
      return {
        ...mapCashUp(cashUp),
        sales: sales.map(mapSaleLine),
        salesSummary,
        cashOuts: cashOuts.map(mapCashOut),
        countEntries: countEntries.map(mapCountEntry),
        salesByCurrency: summarizeSales(saleTotals, changes),
        walletTotals: walletTotals(saleTotals),
        expectedAndGap: computeExpectedAndGap({
          floatUsd: cashUp.floatUsd.toString(),
          floatLbp: cashUp.floatLbp.toString(),
          sales: saleTotals,
          change: changes,
          cashOuts: cashOuts.map(({ currency, amount, status }) => ({
            currency,
            total: amount.toString(),
            status,
          })),
          counted: {
            USD: counted.USD.toString(),
            LBP: counted.LBP.toString(),
          },
        }),
        flags,
      };
    });
  }

  private scope(actor: Actor): TenantScope {
    return { businessId: actor.businessId };
  }

  private async requireBusiness(
    repos: TransactionRepositories,
  ): Promise<{ id: string; name: string; isSolo: boolean }> {
    const settings = await repos.businesses.findSettings();
    if (!settings) throw new EntityNotFoundError();
    return settings;
  }

  private async filterReviewable<T extends { membershipId: string }>(
    repos: TransactionRepositories,
    actor: Actor,
    cashUps: readonly T[],
    isSolo: boolean,
  ): Promise<T[]> {
    const visible: T[] = [];
    for (const cashUp of cashUps) {
      const owner = await repos.memberships.findById(cashUp.membershipId);
      if (!owner) continue;
      if (owner.id === actor.membershipId && actor.role === 'MANAGER') {
        visible.push(cashUp);
        continue;
      }
      const decision = canReview({
        reviewer: actor.role,
        reviewerMembershipId: actor.membershipId,
        cashUpOwner: owner.role,
        ownerMembershipId: owner.id,
        isSolo,
      });
      if (decision.allowed) visible.push(cashUp);
    }
    return visible;
  }

  private assertReviewable(
    actor: Actor,
    ownerRole: typeof actor.role,
    ownerMembershipId: string,
    isSolo: boolean,
  ): void {
    if (ownerMembershipId === actor.membershipId) throw new EntityNotFoundError();
    const decision = canReview({
      reviewer: actor.role,
      reviewerMembershipId: actor.membershipId,
      cashUpOwner: ownerRole,
      ownerMembershipId,
      isSolo,
    });
    if (!decision.allowed) throw new EntityNotFoundError();
  }
}
