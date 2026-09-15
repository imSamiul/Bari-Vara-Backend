import mongoose from 'mongoose';

import { env, isProduction } from './env.js';

mongoose.set('strictQuery', true);

/**
 * Indexes are built explicitly on boot in production rather than implicitly on
 * every model call, which is why autoIndex is disabled there.
 */
export async function connectDatabase(uri: string = env.MONGODB_URI) {
  await mongoose.connect(uri, { autoIndex: !isProduction });

  if (isProduction) {
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.syncIndexes()),
    );
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
