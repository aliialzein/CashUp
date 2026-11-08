import { assertTestDatabase, defaultTestUrl } from '../../integration/persistence/database-safety.cjs';

describe('integration database isolation', () => {
  it('accepts the disposable Compose and CI service', () => {
    expect(() => assertTestDatabase(defaultTestUrl)).not.toThrow();
    expect(() => assertTestDatabase(defaultTestUrl.replace('127.0.0.1', 'localhost'))).not.toThrow();
  });

  it.each([
    defaultTestUrl.replace('127.0.0.1', 'db.example.com'),
    defaultTestUrl.replace('55432', '5432'),
    defaultTestUrl.replace('/cashup_test', '/cashup'),
    defaultTestUrl.replace('/cashup_test', '/shared_test'),
    defaultTestUrl.replace('cashup_test:cashup_test@', 'postgres:password@'),
    `${defaultTestUrl}?host=db.example.com`,
    `${defaultTestUrl}?schema=public`,
    `${defaultTestUrl}#fragment`,
    'invalid-url',
  ])('rejects unsafe connection target %s', connectionString => {
    expect(() => assertTestDatabase(connectionString)).toThrow();
  });
});
