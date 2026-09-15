/* eslint-disable no-console */
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

async function bootstrap() {
  await connectDatabase();
  await connectRedis();

  const server = createApp().listen(env.PORT, () => {
    console.log(
      `API listening on http://localhost:${env.PORT}${env.API_PREFIX}`,
    );
  });

  const shutdown = async (_signal: string) => {
    server.close(async () => {
      await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
