import { createHash } from 'node:crypto';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { redis } from '../config/redis.js';

const versionKey = (namespace: string) => `cache:${namespace}:version`;

/**
 * Keys carry the namespace version, so invalidation is a single INCR rather than
 * a SCAN sweep: bumping the version orphans every existing entry at once and the
 * orphans fall out on their own TTL.
 */
function entryKey(namespace: string, version: string, parts: unknown) {
  const fingerprint = createHash('sha1')
    .update(JSON.stringify(parts))
    .digest('base64url');

  return `cache:${namespace}:${version}:${fingerprint}`;
}

/**
 * Cache-aside read. Redis is an optimisation on this path, so any cache failure
 * degrades to a database read instead of failing the request.
 */
export async function cached<T>(
  namespace: string,
  parts: unknown,
  loader: () => Promise<T>,
  ttlSeconds: number = env.FLAT_CACHE_TTL_SECONDS,
): Promise<T> {
  let key: string | null;

  try {
    const version = (await redis.get(versionKey(namespace))) ?? '0';
    key = entryKey(namespace, version, parts);

    const hit = await redis.get(key);

    if (hit) return JSON.parse(hit) as T;
  } catch (error) {
    key = null;
    logger.warn({ err: error, namespace }, 'Cache read failed');
  }

  const value = await loader();

  if (key) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      logger.warn({ err: error, namespace }, 'Cache write failed');
    }
  }

  return value;
}

/** Retires every entry in the namespace. Stale reads are capped by the TTL. */
export async function invalidate(namespace: string) {
  try {
    await redis.incr(versionKey(namespace));
  } catch (error) {
    logger.warn({ err: error, namespace }, 'Cache invalidation failed');
  }
}
