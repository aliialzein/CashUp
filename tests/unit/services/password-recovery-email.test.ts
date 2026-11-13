import { sendResetCode } from '../../../src/modules/auth/password-recovery.email';
import nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));
const sendMail = jest.fn();
beforeEach(() => {
  jest.replaceProperty(process, 'env', { ...process.env,
    SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '465', SMTP_USER: 'sender@gmail.com', SMTP_PASS: 'test-app-password',
    EMAIL_FROM: 'CashUp <sender@gmail.com>' });
  sendMail.mockReset().mockResolvedValue({ accepted: ['recipient@example.test'] });
  jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
});
afterEach(() => jest.restoreAllMocks());
it('sends the unchanged plain text through authenticated Gmail SMTP with verified TLS and logging disabled', async () => {
  await sendResetCode('recipient@example.test', '012345', 'challenge');
  expect(nodemailer.createTransport).toHaveBeenCalledWith({
    host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: 'sender@gmail.com', pass: 'test-app-password' },
    tls: { rejectUnauthorized: true }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000,
    logger: false, debug: false,
  });
  expect(sendMail).toHaveBeenCalledTimes(1);
  expect(sendMail).toHaveBeenCalledWith({ from: 'CashUp <sender@gmail.com>', to: ['recipient@example.test'], subject: 'Your CashUp reset code',
    text: 'Your CashUp password reset code is 012345. It expires in 10 minutes. If you did not request this, ignore this email.' });
});
it.each(['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'])('requires %s without creating a transport', async key => {
  delete process.env[key];
  await expect(sendResetCode('recipient@example.test', '012345', 'challenge')).rejects.toThrow('not configured');
  expect(nodemailer.createTransport).not.toHaveBeenCalled();
  expect(sendMail).not.toHaveBeenCalled();
});
it.each(['587', 'invalid'])('rejects a port other than the configured implicit TLS port: %s', async port => {
  process.env.SMTP_PORT = port;
  await expect(sendResetCode('recipient@example.test', '012345', 'challenge')).rejects.toThrow('not configured');
  expect(nodemailer.createTransport).not.toHaveBeenCalled();
});
it('awaits sendMail before reporting completion', async () => {
  let finish!: () => void;
  sendMail.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  const settled = jest.fn();
  const sending = sendResetCode('recipient@example.test', '012345', 'challenge').then(settled);
  await Promise.resolve();
  expect(settled).not.toHaveBeenCalled();
  finish(); await sending;
  expect(settled).toHaveBeenCalledTimes(1);
});
it('preserves sanitized underlying SMTP diagnostics without private details or retries', async () => {
  sendMail.mockRejectedValue(Object.assign(new Error('Invalid login: SMTP_PASS=secret code=012345 recipient@example.test'), {
    code: 'EAUTH', command: 'AUTH PLAIN private-base64', responseCode: 535,
  }));
  await expect(sendResetCode('recipient@example.test', '012345', 'challenge')).rejects.toMatchObject({
    name: 'Error', message: 'Invalid login', code: 'EAUTH', command: 'AUTH', responseCode: 535,
  });
  expect(sendMail).toHaveBeenCalledTimes(1);
});
