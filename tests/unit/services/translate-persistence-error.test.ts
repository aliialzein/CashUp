import {
  DuplicateError,
  NotFoundError,
  NotInTransactionError,
  StaleStateError,
} from '../../../src/persistence';
import {
  ConflictError,
  EntityNotFoundError,
} from '../../../src/services/errors';
import { translatePersistenceError } from '../../../src/services/translate-persistence-error';

describe('translatePersistenceError', () => {
  it('maps not-found, stale-state, and duplicate errors', () => {
    expect(translatePersistenceError(new NotFoundError('Cash-up'))).toBeInstanceOf(
      EntityNotFoundError,
    );
    expect(translatePersistenceError(new StaleStateError('Cash-up'))).toBeInstanceOf(
      ConflictError,
    );
    expect(translatePersistenceError(new DuplicateError('Cash-up'))).toBeInstanceOf(
      ConflictError,
    );
  });

  it('leaves transaction-programming and unknown errors untouched', () => {
    const transactionError = new NotInTransactionError();
    const unknownError = new Error('programmer error');
    expect(translatePersistenceError(transactionError)).toBe(transactionError);
    expect(translatePersistenceError(unknownError)).toBe(unknownError);
  });
});
