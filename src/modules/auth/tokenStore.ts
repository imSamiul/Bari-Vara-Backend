import { refreshTokenTtlSeconds } from '../../config/env.js';
import { redis } from '../../config/redis.js';

/**
 * One hash per user, field per live refresh token. Rotation deletes the field it
 * consumed, so replaying an already-rotated token finds nothing and is treated
 * as theft. Expired fields linger until the hash TTL lapses, which is harmless
 * because the JWT signature check rejects them first.
 */
const sessionsKey = (userId: string) => `auth:refresh:${userId}`;

export async function rememberRefreshToken(userId: string, jti: string) {
  const key = sessionsKey(userId);

  await redis
    .multi()
    .hset(key, jti, Date.now())
    .expire(key, refreshTokenTtlSeconds)
    .exec();
}

/**
 * Deletes and reports whether the token was still live. A false result means the
 * token was already rotated, revoked, or belongs to a wiped session family.
 */
export async function consumeRefreshToken(userId: string, jti: string) {
  const removed = await redis.hdel(sessionsKey(userId), jti);
  return removed === 1;
}

/** Used when a rotated token is replayed: assume theft and end every session. */
export async function revokeAllRefreshTokens(userId: string) {
  await redis.del(sessionsKey(userId));
}
