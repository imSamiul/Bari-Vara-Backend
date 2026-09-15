import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

import { isProduction } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

type NormalizedError = {
  statusCode: number;
  message: string;
  code: string;
  details?: unknown;
};

function normalize(error: unknown): NormalizedError {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 422,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    };
  }

  if (error instanceof MulterError) {
    return {
      statusCode: error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'That image is larger than 5 MB'
          : error.message,
      code: error.code,
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      message: `Invalid value for ${error.path}`,
      code: 'INVALID_ID',
    };
  }

  // Duplicate key violations surface as driver errors, not mongoose errors.
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  ) {
    const keyPattern = (error as { keyPattern?: Record<string, unknown> })
      .keyPattern;
    const field = keyPattern ? Object.keys(keyPattern)[0] : undefined;

    return {
      statusCode: 409,
      message: field
        ? `A record with this ${field} already exists`
        : 'Duplicate record',
      code: 'DUPLICATE_KEY',
    };
  }

  return {
    statusCode: 500,
    message: 'Something went wrong',
    code: 'INTERNAL_ERROR',
  };
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const { statusCode, message, code, details } = normalize(error);

  if (statusCode >= 500) {
    logger.error(
      { err: error, method: req.method, url: req.originalUrl },
      'Unhandled request error',
    );
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(details ? { details } : {}),
    ...(isProduction || !(error instanceof Error)
      ? {}
      : { stack: error.stack }),
  });
};
