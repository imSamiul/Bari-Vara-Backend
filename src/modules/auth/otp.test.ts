import { ERROR_CODES } from '#shared';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { User } from '../../models/index.js';
import { TEST_PASSWORD, apiPath, readCookie } from '../../test/helpers.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './cookies.js';

interface SentMail {
  to: string;
  subject: string;
  text: string;
}

const { sentMails } = vi.hoisted(() => ({ sentMails: [] as SentMail[] }));

vi.mock('../../config/mailer.js', () => ({
  sendMail: async (message: SentMail) => {
    sentMails.push(message);
  },
}));

const app = createApp();
const EMAIL = 'nasrin@barivara.test';

const register = () =>
  request(app)
    .post(apiPath('/auth/register'))
    .send({ name: 'Nasrin Akter', email: EMAIL, password: TEST_PASSWORD });

const verify = (otp: string, email = EMAIL) =>
  request(app).post(apiPath('/auth/verify-otp')).send({ email, otp });

/** Codes only exist in the delivered email, which is what the real user sees. */
function latestOtp() {
  const mail = sentMails.at(-1);
  const match = /\b(\d{6})\b/.exec(mail?.text ?? '');

  if (!match?.[1]) {
    throw new Error(
      `No code found in the last email: ${mail?.text ?? 'none sent'}`,
    );
  }

  return match[1];
}

beforeEach(() => {
  sentMails.length = 0;
});

describe('email verification', () => {
  it('emails a code on register and signs the user in once it is confirmed', async () => {
    await register();

    expect(sentMails).toHaveLength(1);
    expect(sentMails[0]?.to).toBe(EMAIL);
    expect(sentMails[0]?.subject).toContain('verification code');

    const response = await verify(latestOtp());

    expect(response.status).toBe(200);
    expect(response.body.data.isEmailVerified).toBe(true);
    expect(readCookie(response, ACCESS_COOKIE)).toBeDefined();
    expect(readCookie(response, REFRESH_COOKIE)).toBeDefined();
  });

  it('lets the user sign in only after verifying', async () => {
    await register();

    const beforeVerify = await request(app)
      .post(apiPath('/auth/login'))
      .send({ email: EMAIL, password: TEST_PASSWORD });
    expect(beforeVerify.body.code).toBe(ERROR_CODES.emailNotVerified);

    await verify(latestOtp());

    const afterVerify = await request(app)
      .post(apiPath('/auth/login'))
      .send({ email: EMAIL, password: TEST_PASSWORD });
    expect(afterVerify.status).toBe(200);
  });

  it('rejects a code that was never issued as expired', async () => {
    await register();
    await User.updateOne({ email: EMAIL }, { isEmailVerified: false });

    const response = await verify('000000', 'stranger@barivara.test');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(ERROR_CODES.otpExpired);
  });

  it('counts down wrong attempts and then discards the code', async () => {
    await register();
    const correctOtp = latestOtp();
    const wrongOtp = correctOtp === '111111' ? '222222' : '111111';

    for (let attempt = 1; attempt < env.OTP_MAX_ATTEMPTS; attempt += 1) {
      const response = await verify(wrongOtp);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(ERROR_CODES.invalidOtp);
    }

    const capped = await verify(wrongOtp);
    expect(capped.status).toBe(429);
    expect(capped.body.code).toBe(ERROR_CODES.otpAttemptsExceeded);

    // The code was discarded with the last attempt, so even the right one fails.
    const afterCap = await verify(correctOtp);
    expect(afterCap.body.code).toBe(ERROR_CODES.otpExpired);
  });

  it('throttles resend while the cooldown is open', async () => {
    await register();

    const response = await request(app)
      .post(apiPath('/auth/resend-otp'))
      .send({ email: EMAIL });

    expect(response.status).toBe(429);
    expect(response.body.code).toBe('OTP_RESEND_TOO_SOON');
    expect(sentMails).toHaveLength(1);
  });

  it('does not reveal whether an unknown address has an account', async () => {
    const response = await request(app)
      .post(apiPath('/auth/resend-otp'))
      .send({ email: 'stranger@barivara.test' });

    expect(response.status).toBe(200);
    expect(sentMails).toHaveLength(0);
  });
});

describe('password reset', () => {
  const NEW_PASSWORD = 'BrandNew123';

  beforeEach(async () => {
    await register();
    await verify(latestOtp());
    sentMails.length = 0;
  });

  it('resets the password and revokes every existing session', async () => {
    const loginBefore = await request(app)
      .post(apiPath('/auth/login'))
      .send({ email: EMAIL, password: TEST_PASSWORD });
    const oldRefresh = readCookie(loginBefore, REFRESH_COOKIE);

    const forgot = await request(app)
      .post(apiPath('/auth/forgot-password'))
      .send({ email: EMAIL });
    expect(forgot.status).toBe(200);
    expect(sentMails.at(-1)?.subject).toContain('password reset code');

    const reset = await request(app)
      .post(apiPath('/auth/reset-password'))
      .send({ email: EMAIL, otp: latestOtp(), password: NEW_PASSWORD });
    expect(reset.status).toBe(200);

    const staleRefresh = await request(app)
      .post(apiPath('/auth/refresh'))
      .set('Cookie', oldRefresh ?? '');
    expect(staleRefresh.status).toBe(401);

    const withOldPassword = await request(app)
      .post(apiPath('/auth/login'))
      .send({ email: EMAIL, password: TEST_PASSWORD });
    expect(withOldPassword.status).toBe(401);

    const withNewPassword = await request(app)
      .post(apiPath('/auth/login'))
      .send({ email: EMAIL, password: NEW_PASSWORD });
    expect(withNewPassword.status).toBe(200);
  });

  it('stays quiet about unknown addresses', async () => {
    const response = await request(app)
      .post(apiPath('/auth/forgot-password'))
      .send({ email: 'stranger@barivara.test' });

    expect(response.status).toBe(200);
    expect(sentMails).toHaveLength(0);
  });

  it('will not accept a verification code as a reset code', async () => {
    await User.updateOne({ email: EMAIL }, { isEmailVerified: false });
    await request(app).post(apiPath('/auth/resend-otp')).send({ email: EMAIL });
    const verificationOtp = latestOtp();

    await request(app)
      .post(apiPath('/auth/forgot-password'))
      .send({ email: EMAIL });

    const response = await request(app)
      .post(apiPath('/auth/reset-password'))
      .send({ email: EMAIL, otp: verificationOtp, password: NEW_PASSWORD });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(ERROR_CODES.invalidOtp);
  });
});
