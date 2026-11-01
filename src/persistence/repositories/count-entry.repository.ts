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
   * FR13: saves the counted notes as the user types. Each (currency, denomination) pair is
   * upserted, so sending the same line twice is harmless. Only while the cash-up is OPEN.
   * Also stamps `countStartedAt` the first time (server time, used by the pilot summary FR29).
   * Call inside a transaction.
   */
  async saveLines(cashUpId: string, lines: CountLine[]): Promise<CountEntry[]> {
    await new CashUpRepository(this.db, this.scope, this.options).lockOpenForUpdate(cashUpId);

    const saved: CountEntry[] = [];
    for (const line of lines) {
      saved.push(
        await this.db.countEntry.upsert({
          where: {
            cashUpId_currency_denomination: {
              cashUpId,
              currency: line.currency,
              denomination: line.denomination,
            },
          },
          create: {
            cashUpId,
            currency: line.currency,
            denomination: line.denomination,
            quantity: line.quantity,
          },
          update: { quantity: line.quantity },
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
