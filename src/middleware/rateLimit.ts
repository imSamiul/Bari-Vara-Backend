import { rateLimit } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';

import { isTest } from '../config/env.js';
import { redis } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const sendCommand = (command: string, ...args: string[]) =>
  redis.call(command, ...args) as Promise<RedisReply>;

/**
 * Counters live in Redis so the limit holds across every API instance. Tests run
 * without Redis and without limits, so they fall back to the in-memory store and
 * skip enforcement entirely.
 */
function createLimiter(prefix: string, limit: number) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    ...(isTest ? {} : { store: new RedisStore({ prefix, sendCommand }) }),
    handler: (_req, _res, next) => {
      next(
        ApiError.tooManyRequests(
          'Too many requests. Try again in a few minutes.',
        ),
      );
    },
  });
}

export const apiLimiter = createLimiter('rl:api:', 600);

/** Credential and OTP endpoints get a much tighter budget per IP. */
export const authLimiter = createLimiter('rl:auth:', 20);
