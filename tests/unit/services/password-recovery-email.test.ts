import { sendResetCode } from '../../../src/modules/auth/password-recovery.email';

const fetchMock = jest.fn();
beforeEach(() => {
  jest.replaceProperty(process, 'env', { ...process.env, RESEND_API_KEY: 'test-only-key', EMAIL_FROM: 'CashUp <test@example.test>' });
  jest.spyOn(global, 'fetch').mockImplementation(fetchMock);
  fetchMock.mockReset().mockResolvedValue({ ok: true });
});
afterEach(() => jest.restoreAllMocks());
it('sends plain text through Resend with a timeout and challenge idempotency', async () => {
  await sendResetCode('recipient@example.test', '012345', 'challenge');
  expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
    method: 'POST', signal: expect.any(AbortSignal), headers: expect.objectContaining({ Authorization: 'Bearer test-only-key', 'Idempotency-Key': 'password-reset/challenge' }),
  }));
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ to: ['recipient@example.test'], text: expect.stringContaining('012345') });
});
it.each(['RESEND_API_KEY', 'EMAIL_FROM'])('requires %s without making a network request', async key => {
  delete process.env[key];
  await expect(sendResetCode('recipient@example.test', '012345', 'challenge')).rejects.toThrow('not configured');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('does not read or propagate provider response bodies', async () => {
  const body = jest.fn(); fetchMock.mockResolvedValue({ ok: false, status: 429, text: body, json: body });
  await expect(sendResetCode('recipient@example.test', '012345', 'challenge')).rejects.toThrow('Recovery email rejected (429)');
  expect(body).not.toHaveBeenCalled();
});
