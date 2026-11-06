import { AuditAction, AuditEntityType } from '../persistence';
import { toMoneyString } from '../domain/money';
import type { SaveCountLines } from '../validation';
import type { Actor } from './actor';
import { AuditTrail } from './audit-trail';
import type { CountDto } from './dto';
import { EntityNotFoundError } from './errors';
import { PermissionMatrix } from './permissions';
import { lockOwnOpenCashUp, tenantScope } from './staff-cash-up';
import { UseCaseRunner } from './use-case-runner';

export class CountService {
  constructor(
    private readonly runner: UseCaseRunner,
    private readonly permissions: PermissionMatrix,
    private readonly audit: AuditTrail,
  ) {}

  replace(actor: Actor, cashUpId: string, input: SaveCountLines): Promise<CountDto> {
    return this.runner.run(tenantScope(actor), async (repos) => {
      const settings = await repos.businesses.findSettings();
      if (!settings) throw new EntityNotFoundError();
      this.permissions.assertCan(actor, 'cashUp.mutateOwn', settings.isSolo);
      await lockOwnOpenCashUp(repos, this.permissions, actor, cashUpId);

      const rows = await repos.counts.saveLines(
        cashUpId,
        input.lines.map(({ currency, denomination, quantity }) => ({
          currency,
          denomination,
          quantity,
        })),
      );
      const totals = await repos.counts.countedTotals(cashUpId);
      const entries = rows.map((row) => ({
        currency: row.currency,
        denomination: toMoneyString(row.denomination),
        quantity: row.quantity,
      }));

      await this.audit.record(repos, actor, {
        action: AuditAction.COUNT_UPDATED,
        entityType: AuditEntityType.COUNT_ENTRY,
        entityId: cashUpId,
        metadata: { lines: entries.length },
      });

      return {
        cashUpId,
        lines: entries.map((line) => ({
          currency: line.currency,
          denomination: line.denomination,
          quantity: line.quantity,
        })),
        countedTotals: {
          USD: toMoneyString(totals.USD),
          LBP: toMoneyString(totals.LBP),
        },
      };
    });
  }
}
