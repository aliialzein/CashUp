import {
  AuditAction,
  AuditEntityType,
  SaleStatus,
} from '../persistence';
import {
  checkSaleBalance,
  compare,
  computeDeliveryFlags,
} from '../domain/money';
import type { ConfirmDelivery, CreateSale, EditSale } from '../validation';
import type { Actor } from './actor';
import { AuditTrail } from './audit-trail';
import type { SaleCreateResultDto, SaleMutationDto } from './dto';
import { BusinessRuleError, ConflictError, EntityNotFoundError } from './errors';
import { mapSaleLine } from './mappers/sale.mapper';
import { PermissionMatrix } from './permissions';
import type { TransactionRepositories } from './ports';
import { lockOwnOpenCashUp, tenantScope } from './staff-cash-up';
import { UseCaseRunner } from './use-case-runner';
import { validateMergedSale } from '../validation';

const SALE_ENTITY = AuditEntityType.SALE;

export class SaleService {
  constructor(
    private readonly runner: UseCaseRunner,
    private readonly permissions: PermissionMatrix,
    private readonly audit: AuditTrail,
  ) {}

  create(
    actor: Actor,
    cashUpId: string,
    input: CreateSale,
    idempotencyKey: string,
  ): Promise<SaleCreateResultDto> {
    return this.runner.run(tenantScope(actor), async (repos) => {
      await lockOwnOpenCashUp(repos, this.permissions, actor, cashUpId);
      const balance = checkSaleBalance(input);
      if (!balance.balanced) throw new BusinessRuleError('SALE_NOT_BALANCED');

      const result = await repos.sales.create({
        ...input,
        cashUpId,
        idempotencyKey,
        mixedChange: balance.mixedChange,
      });
      if (
        !result.created &&
        !sameSaleInput(result.sale, input, cashUpId, balance.mixedChange)
      ) {
        throw new ConflictError('IDEMPOTENCY_KEY_REUSED');
      }
      if (result.created) {
        await this.audit.record(repos, actor, {
          action: AuditAction.SALE_CREATED,
          entityType: SALE_ENTITY,
          entityId: result.sale.id,
        });
      }
      return {
        saleId: result.sale.id,
        sale: mapSaleLine(result.sale),
        salesSummary: await salesSummary(repos, cashUpId),
        replayed: !result.created,
      };
    });
  }

  edit(
    actor: Actor,
    cashUpId: string,
    saleId: string,
    input: EditSale,
  ): Promise<SaleMutationDto> {
    return this.runner.run(tenantScope(actor), async (repos) => {
      const beforeLock = await repos.sales.findById(saleId);
      if (!beforeLock || beforeLock.cashUpId !== cashUpId) throw new EntityNotFoundError();
      await lockOwnOpenCashUp(repos, this.permissions, actor, cashUpId);

      const current = await repos.sales.findById(saleId);
      if (!current || current.cashUpId !== cashUpId) throw new EntityNotFoundError();
      if (current.status === SaleStatus.DELETED) {
        throw new ConflictError('SALE_ALREADY_CANCELLED');
      }
      if (current.deletionAwaiting) throw new ConflictError();

      const merged = validateMergedSale(
        {
          businessAmount: current.businessAmount.toString(),
          deliveryFee: current.deliveryFee.toString(),
          tip: current.tip?.toString() ?? null,
          discount: current.discount?.toString() ?? null,
          totalCollected: current.totalCollected.toString(),
          currency: current.currency,
          method: current.method,
          changeGiven: current.changeGiven?.toString() ?? null,
          changeCurrency: current.changeCurrency,
          clientNumber: current.clientNumber,
          note: current.note,
        },
        input,
      );
      if (!merged.success) throw new BusinessRuleError('SALE_NOT_BALANCED');
      const balance = checkSaleBalance(merged.data);
      if (!balance.balanced) throw new BusinessRuleError('SALE_NOT_BALANCED');

      const updated = await repos.sales.edit(
        saleId,
        { ...input, mixedChange: balance.mixedChange },
        actor.membershipId,
      );
      if (saleChanged(current, updated)) {
        await this.audit.record(repos, actor, {
          action: AuditAction.SALE_EDITED,
          entityType: SALE_ENTITY,
          entityId: saleId,
        });
      }
      return {
        saleId,
        sale: mapSaleLine(updated),
        salesSummary: await salesSummary(repos, cashUpId),
      };
    });
  }

  confirmDelivery(
    actor: Actor,
    cashUpId: string,
    saleId: string,
    input: ConfirmDelivery,
  ): Promise<SaleMutationDto> {
    return this.runner.run(tenantScope(actor), async (repos) => {
      const beforeLock = await repos.sales.findById(saleId);
      if (!beforeLock || beforeLock.cashUpId !== cashUpId) throw new EntityNotFoundError();
      await lockOwnOpenCashUp(repos, this.permissions, actor, cashUpId);

      const current = await repos.sales.findById(saleId);
      if (!current || current.cashUpId !== cashUpId) throw new EntityNotFoundError();
      if (current.status !== SaleStatus.TO_DELIVER) {
        throw new BusinessRuleError('SALE_NOT_AWAITING_DELIVERY');
      }
      const flags = computeDeliveryFlags(
        {
          totalCollected: current.totalCollected.toString(),
          currency: current.currency,
          method: current.method,
        },
        input,
      );
      const updated = await repos.sales.markDelivered(saleId, {
        ...input,
        ...flags,
      });
      await this.audit.record(repos, actor, {
        action: AuditAction.SALE_DELIVERED,
        entityType: SALE_ENTITY,
        entityId: saleId,
      });
      return {
        saleId,
        sale: mapSaleLine(updated),
        salesSummary: await salesSummary(repos, cashUpId),
      };
    });
  }

  cancel(
    actor: Actor,
    cashUpId: string,
    saleId: string,
    reason: string,
  ): Promise<SaleMutationDto> {
    return this.runner.run(tenantScope(actor), async (repos) => {
      const beforeLock = await repos.sales.findById(saleId);
      if (!beforeLock || beforeLock.cashUpId !== cashUpId) throw new EntityNotFoundError();
      await lockOwnOpenCashUp(repos, this.permissions, actor, cashUpId);

      const current = await repos.sales.findById(saleId);
      if (!current || current.cashUpId !== cashUpId) throw new EntityNotFoundError();
      if (current.status === SaleStatus.DELETED) {
        throw new ConflictError('SALE_ALREADY_CANCELLED');
      }
      if (current.status !== SaleStatus.TO_DELIVER) {
        throw new BusinessRuleError('SALE_CANNOT_BE_CANCELLED');
      }
      const cancelled = await repos.sales.cancelToDeliver(saleId, reason);
      await this.audit.record(repos, actor, {
        action: AuditAction.SALE_CANCELLED,
        entityType: SALE_ENTITY,
        entityId: saleId,
        metadata: { reason },
      });
      return {
        saleId,
        sale: mapSaleLine(cancelled),
        salesSummary: await salesSummary(repos, cashUpId),
      };
    });
  }
}

async function salesSummary(
  repos: TransactionRepositories,
  cashUpId: string,
): Promise<SaleMutationDto['salesSummary']> {
  return repos.sales.countByStatus(cashUpId);
}

function sameSaleInput(
  sale: NonNullable<Awaited<ReturnType<TransactionRepositories['sales']['findById']>>>,
  input: CreateSale,
  cashUpId: string,
  mixedChange: boolean,
): boolean {
  return (
    sale.cashUpId === cashUpId &&
    sale.status === input.status &&
    sameMoney(sale.businessAmount.toString(), input.businessAmount) &&
    sameMoney(sale.deliveryFee.toString(), input.deliveryFee) &&
    sameNullableMoney(sale.tip?.toString() ?? null, input.tip ?? null) &&
    sameNullableMoney(sale.discount?.toString() ?? null, input.discount ?? null) &&
    sameMoney(sale.totalCollected.toString(), input.totalCollected) &&
    sale.currency === input.currency &&
    sale.method === input.method &&
    sameNullableMoney(sale.changeGiven?.toString() ?? null, input.changeGiven ?? null) &&
    sale.changeCurrency === (input.changeCurrency ?? null) &&
    sale.clientNumber === (input.clientNumber ?? null) &&
    sale.note === (input.note ?? null) &&
    sale.mixedChange === mixedChange
  );
}

function saleChanged(
  before: NonNullable<Awaited<ReturnType<TransactionRepositories['sales']['findById']>>>,
  after: NonNullable<Awaited<ReturnType<TransactionRepositories['sales']['findById']>>>,
): boolean {
  return (
    !sameMoney(before.businessAmount.toString(), after.businessAmount.toString()) ||
    !sameMoney(before.deliveryFee.toString(), after.deliveryFee.toString()) ||
    !sameNullableMoney(before.tip?.toString() ?? null, after.tip?.toString() ?? null) ||
    !sameNullableMoney(before.discount?.toString() ?? null, after.discount?.toString() ?? null) ||
    !sameMoney(before.totalCollected.toString(), after.totalCollected.toString()) ||
    before.currency !== after.currency ||
    before.method !== after.method ||
    !sameNullableMoney(before.changeGiven?.toString() ?? null, after.changeGiven?.toString() ?? null) ||
    before.changeCurrency !== after.changeCurrency ||
    before.clientNumber !== after.clientNumber ||
    before.note !== after.note ||
    before.mixedChange !== after.mixedChange
  );
}

function sameMoney(left: string, right: string): boolean {
  return compare(left, right) === 0;
}

function sameNullableMoney(left: string | null, right: string | null): boolean {
  return left === null || right === null
    ? left === right
    : sameMoney(left, right);
}
