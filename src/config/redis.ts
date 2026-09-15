import { Redis } from 'ioredis';

import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on('error', () => {
  // Avoid unhandled 'error' events crashing the process.
});

/**
 * lazyConnect leaves the client in `wait` until the first connect(). Hot reload
 * can re-enter bootstrap while status is already `connecting` / `connect` /
 * `ready` — calling connect() again throws and aborts startup.
 */
export async function connectRedis() {
  if (redis.status !== 'wait') return;
  await redis.connect();
}

export async function disconnectRedis() {
  await redis.quit();
}
