import pino from 'pino';

import { env, isProduction, isTest } from './env.js';

export const logger = pino({
  level: isTest ? 'silent' : isProduction ? 'info' : 'debug',
  transport: isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true } },
  base: { env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.body.password',
      'req.body.otp',
    ],
    remove: true,
  },
});
