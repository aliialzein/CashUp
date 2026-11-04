import { Prisma } from '../../generated/prisma/client';
import type { CountEntry } from '../../generated/prisma/client';
import type { Currency } from '../../generated/prisma/enums';
import { TenantRepository } from '../base.repository';
import type { Money } from '../types';
import { CashUpRepository } from './cash-up.repository';

export interface CountLine {
  currency: Currency;
  /** Note value, e.g. 100 for a $100 bill or 100000 for a 100,000 LBP note. */
  denomination: Money;
  quantity: number;
}

export class CountEntryRepository extends TenantRepository {
  /**
   * Replaces the draft count working set atomically for this cash-up while OPEN.
   * Omitted lines are reset to zero rather than deleted, matching the count contract.
   */
  async saveLines(cashUpId: string, lines: CountLine[]): Promise<CountEntry[]> {
    await new CashUpRepository(this.db, this.scope, this.options).lockOpenForUpdate(cashUpId);

    const current = await this.db.countEntry.findMany({
      where: { cashUpId, cashUp: { businessId: this.businessId } },
    });
    const desired = new Map<string, CountLine>();
    for (const line of lines) {
      desired.set(`${line.currency}:${line.denomination.toString()}`, line);
    }

    const saved: CountEntry[] = [];
    for (const row of current) {
      const key = `${row.currency}:${row.denomination.toString()}`;
      const replacement = desired.get(key);
      if (!replacement) {
        saved.push(
          await this.db.countEntry.update({
            where: { id: row.id },
            data: { quantity: 0 },
          }),
        );
      } else if (replacement.quantity !== row.quantity) {
        saved.push(
          await this.db.countEntry.update({
            where: { id: row.id },
            data: { quantity: replacement.quantity },
          }),
        );
      } else {
        saved.push(row);
      }
      desired.delete(key);
    }

    for (const line of desired.values()) {
      saved.push(
        await this.db.countEntry.create({
          data: {
            cashUpId,
            currency: line.currency,
            denomination: line.denomination,
            quantity: line.quantity,
          },
        }),
      );
    }

    await this.db.cashUp.updateMany({
      where: {
        id: cashUpId,
        businessId: this.businessId,
        countStartedAt: null,
        status: 'OPEN',
      },
      data: { countStartedAt: new Date() },
    });

    return saved;
  }

  listByCashUp(cashUpId: string) {
    return this.db.countEntry.findMany({
      where: { cashUpId, cashUp: { businessId: this.businessId } },
      orderBy: [{ currency: 'asc' }, { denomination: 'desc' }],
    });
  }

  /** Counted cash per currency: sum of denomination x quantity. Never combined across currencies. */
  async countedTotals(cashUpId: string): Promise<Record<Currency, Prisma.Decimal>> {
    const entries = await this.listByCashUp(cashUpId);
    const totals: Record<Currency, Prisma.Decimal> = {
      USD: new Prisma.Decimal(0),
      LBP: new Prisma.Decimal(0),
    };
    for (const e of entries) {
      totals[e.currency] = totals[e.currency].plus(e.denomination.times(e.quantity));
    }
    return totals;
  }
}
