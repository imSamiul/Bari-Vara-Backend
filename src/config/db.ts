import mongoose from 'mongoose';

import { env, isProduction } from './env.js';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

/**
 * Indexes are built explicitly on boot in production rather than implicitly on
 * every model call, which is why autoIndex is disabled there.
 */
export async function connectDatabase(uri: string = env.MONGODB_URI) {
  await mongoose.connect(uri, { autoIndex: !isProduction });
  logger.info('MongoDB connected');

  if (isProduction) {
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.syncIndexes()),
    );
    logger.info('MongoDB indexes synced');
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
