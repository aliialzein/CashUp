// Only the disposable Docker/CI PostgreSQL service is allowed to run resetDatabase.
const defaultTestUrl = 'postgresql://cashup_test:cashup_test@127.0.0.1:55432/cashup_test';

/** @param {string} connectionString */
function assertTestDatabase(connectionString) {
  const url = new URL(connectionString);
  if (
    url.protocol !== 'postgresql:' ||
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '55432' || url.pathname !== '/cashup_test' ||
    url.username !== 'cashup_test' || url.password !== 'cashup_test' ||
    url.search !== '' || url.hash !== ''
  ) {
    throw new Error('Refusing integration tests: use only the disposable local cashup_test service on port 55432.');
  }
}

module.exports = { assertTestDatabase, defaultTestUrl };
