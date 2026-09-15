import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { connectRedis, disconnectRedis, redis } from '../config/redis.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDatabase(mongoServer.getUri('bari-vara-test'));

  // Text and unique indexes are queried by the very first test, so they are
  // built up front instead of racing the background build autoIndex starts.
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.syncIndexes()),
  );

  // Redis is real rather than mocked so refresh rotation is exercised against
  // the same commands production runs. Docker Compose provides it locally and a
  // service container provides it in CI.
  await connectRedis();

  // Test files run in parallel against one Redis server, so each worker takes a
  // database of its own. Database 0 is left to the dev server.
  const workerId = Number(process.env.VITEST_WORKER_ID ?? 1);
  await redis.select(1 + (workerId % 15));
});

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );

  await redis.flushdb();
});

afterAll(async () => {
  await disconnectDatabase();
  await disconnectRedis();
  await mongoServer.stop();
});
