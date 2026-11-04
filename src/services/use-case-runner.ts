import type { TenantScope } from '../persistence';
import { markTransactionRepositories, type TransactionRepositories, type TransactionRunner } from './ports';
import { translatePersistenceError } from './translate-persistence-error';

export class UseCaseRunner {
  constructor(private readonly transactions: TransactionRunner) {}

  async run<T>(
    scope: TenantScope,
    fn: (repos: TransactionRepositories) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.transactions.run(scope, (repos) => fn(markTransactionRepositories(repos)));
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }
}
