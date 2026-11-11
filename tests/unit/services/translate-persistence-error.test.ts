import { DuplicateError, NotFoundError, NotInTransactionError, StaleStateError } from '../../../src/shared/errors/persistence-errors';
import { BusinessRuleError, ConflictError, EntityNotFoundError } from '../../../src/shared/errors/service-errors';
import { translatePersistenceError } from '../../../src/shared/errors/translate-persistence-error';
describe('translatePersistenceError', () => {
    it('maps not-found, stale-state, and duplicate errors', () => {
        expect(translatePersistenceError(new NotFoundError('Cash-up'))).toBeInstanceOf(EntityNotFoundError);
        expect(translatePersistenceError(new StaleStateError('Cash-up'))).toBeInstanceOf(ConflictError);
        expect(translatePersistenceError(new DuplicateError('Cash-up'))).toBeInstanceOf(ConflictError);
    });
    it('preserves the registered delivered-sale business-rule code through error translation', () => {
        const error = new BusinessRuleError('SALE_ALREADY_DELIVERED');
        expect(translatePersistenceError(error)).toBe(error);
        expect(translatePersistenceError(error)).toMatchObject({ code: 'SALE_ALREADY_DELIVERED' });
    });
    it('leaves transaction-programming and unknown errors untouched', () => {
        const transactionError = new NotInTransactionError();
        const unknownError = new Error('programmer error');
        expect(translatePersistenceError(transactionError)).toBe(transactionError);
        expect(translatePersistenceError(unknownError)).toBe(unknownError);
    });
});
