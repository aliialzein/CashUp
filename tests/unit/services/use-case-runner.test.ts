import { NotFoundError, NotInTransactionError } from '../../../src/persistence';
import { EntityNotFoundError } from '../../../src/services/errors';
import type { TransactionRunner } from '../../../src/services/ports';
import { serviceRepositories } from './service-repositories';
import { UseCaseRunner } from '../../../src/services/use-case-runner';

describe('UseCaseRunner', () => {
  it('passes transaction repositories into the use case and returns its result', async () => {
    const repositories = serviceRepositories();
    const transactions: TransactionRunner = {
      run: (_scope, fn) => fn(repositories),
    };
    const runner = new UseCaseRunner(transactions);
    await expect(
      runner.run({ businessId: 'business-id' }, async (repos) => {
        expect(repos.businesses).toBe(repositories.businesses);
        return 'complete';
      }),
    ).resolves.toBe('complete');
  });

  it('translates persistence failures and leaves programmer errors untouched', async () => {
    const translatedRunner = new UseCaseRunner({
      run: async () => {
        throw new NotFoundError('Cash-up');
      },
    });
    await expect(
      translatedRunner.run({ businessId: 'business-id' }, async () => 'unused'),
    ).rejects.toBeInstanceOf(EntityNotFoundError);

    const programmerError = new NotInTransactionError();
    const untouchedRunner = new UseCaseRunner({
      run: async () => {
        throw programmerError;
      },
    });
    await expect(
      untouchedRunner.run({ businessId: 'business-id' }, async () => 'unused'),
    ).rejects.toBe(programmerError);
  });
});
