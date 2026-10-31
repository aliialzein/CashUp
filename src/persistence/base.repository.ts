import type { Db, TenantScope } from './types';

/**
 * Every repository extends this. The business scope lives here and nowhere else, so a
 * query cannot be written without going through `this.businessId` (NFR15).
 *
 * Tables that carry `businessId` filter on it directly. Child tables without it
 * (cash_outs, count_entries, sale_edits) filter through their cash-up / sale parent.
 */
export abstract class TenantRepository {
  constructor(
    protected readonly db: Db,
    protected readonly scope: TenantScope,
  ) {
    if (!scope.businessId) {
      throw new Error('A repository cannot be created without a businessId');
    }
  }

  protected get businessId(): string {
    return this.scope.businessId;
  }
}
