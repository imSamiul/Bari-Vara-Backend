import { Redis } from 'ioredis';

import { env } from './env.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on('error', (error: Error) => {
  logger.error({ err: error }, 'Redis error');
});

export async function connectRedis() {
  if (redis.status === 'ready' || redis.status === 'connecting') return;
  await redis.connect();
  logger.info('Redis connected');
}

export async function disconnectRedis() {
  await redis.quit();
  logger.info('Redis disconnected');
}
