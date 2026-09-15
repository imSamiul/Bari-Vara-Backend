import type { RequestHandler } from 'express';

import { isTest } from '../config/env.js';

/**
 * Nest-style one-line access log: method, URL, status, duration.
 * Skipped in tests so suite output stays quiet.
 */
export const requestLog: RequestHandler = (req, res, next) => {
  if (isTest) {
    next();
    return;
  }

  const started = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - started;
    const status = res.statusCode;
    const ok = status < 400 ? 'OK' : 'ERR';
    console.log(`${req.method} ${req.originalUrl} ${status} ${ok} +${ms}ms`);
  });

  next();
};
