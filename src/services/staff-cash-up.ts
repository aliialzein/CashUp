import { CashUpStatus, type TenantScope } from '../persistence';
import type { Actor } from './actor';
import { BusinessRuleError, EntityNotFoundError } from './errors';
import type { PermissionMatrix } from './permissions';
import type { TransactionRepositories } from './ports';

export async function lockOwnOpenCashUp(
  repos: TransactionRepositories,
  permissions: PermissionMatrix,
  actor: Actor,
  cashUpId: string,
): Promise<void> {
  const settings = await repos.businesses.findSettings();
  if (!settings) throw new EntityNotFoundError();
  permissions.assertCan(actor, 'cashUp.mutateOwn', settings.isSolo);

  const locked = await repos.cashUps.lockForUpdate(cashUpId);
  const cashUp = await repos.cashUps.findOwn(cashUpId, actor.membershipId);
  if (!cashUp) throw new EntityNotFoundError();
  if (locked.status !== CashUpStatus.OPEN) {
    throw new BusinessRuleError('CASHUP_NOT_OPEN');
  }
}

export function tenantScope(actor: Actor): TenantScope {
  return { businessId: actor.businessId };
}
