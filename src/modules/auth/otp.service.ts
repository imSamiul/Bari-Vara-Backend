import { ERROR_CODES } from '#shared';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { env } from '../../config/env.js';
import { redis } from '../../config/redis.js';
import { ApiError } from '../../utils/ApiError.js';

export type OtpPurpose = 'verify-email' | 'reset-password';

const otpKey = (purpose: OtpPurpose, email: string) =>
  `auth:otp:${purpose}:${email}`;

const cooldownKey = (purpose: OtpPurpose, email: string) =>
  `auth:otp-cooldown:${purpose}:${email}`;

/**
 * Only the digest is stored, so a Redis dump never exposes live codes. The
 * purpose and email are folded into the message, which stops a code minted for
 * verification from being replayed against the password reset endpoint.
 */
function digest(purpose: OtpPurpose, email: string, otp: string) {
  return createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`${purpose}:${email}:${otp}`)
    .digest('hex');
}

/**
 * Generates a code, stores its digest with a TTL, and opens the resend cooldown.
 * Returns the plain code for the caller to email; it is never persisted.
 */
export async function issueOtp(purpose: OtpPurpose, email: string) {
  const cooldown = cooldownKey(purpose, email);
  const secondsLeft = await redis.ttl(cooldown);

  if (secondsLeft > 0) {
    throw ApiError.tooManyRequests(
      `Wait ${secondsLeft} seconds before requesting another code`,
      'OTP_RESEND_TOO_SOON',
    );
  }

  const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const key = otpKey(purpose, email);

  await redis
    .multi()
    .del(key)
    .hset(key, 'digest', digest(purpose, email, otp), 'attempts', 0)
    .expire(key, env.OTP_TTL_SECONDS)
    .set(cooldown, '1', 'EX', env.OTP_RESEND_COOLDOWN_SECONDS)
    .exec();

  return otp;
}

/**
 * Consumes the code on success. A wrong code burns one attempt, and exhausting
 * the cap deletes the code so the caller has to request a fresh one.
 */
export async function verifyOtp(
  purpose: OtpPurpose,
  email: string,
  otp: string,
) {
  const key = otpKey(purpose, email);
  const stored = await redis.hget(key, 'digest');

  if (!stored) {
    throw ApiError.badRequest(
      'That code has expired. Request a new one.',
      ERROR_CODES.otpExpired,
    );
  }

  if (matches(stored, digest(purpose, email, otp))) {
    await redis.del(key, cooldownKey(purpose, email));
    return;
  }

  const attempts = await redis.hincrby(key, 'attempts', 1);

  if (attempts >= env.OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    throw ApiError.tooManyRequests(
      'Too many incorrect attempts. Request a new code.',
      ERROR_CODES.otpAttemptsExceeded,
    );
  }

  throw ApiError.badRequest(
    `That code is not right. ${env.OTP_MAX_ATTEMPTS - attempts} attempts left.`,
    ERROR_CODES.invalidOtp,
  );
}

function matches(storedDigest: string, candidateDigest: string) {
  const stored = Buffer.from(storedDigest, 'hex');
  const candidate = Buffer.from(candidateDigest, 'hex');

  return (
    stored.length === candidate.length && timingSafeEqual(stored, candidate)
  );
}
