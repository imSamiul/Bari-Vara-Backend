import type { Response } from 'express';
import type { PaginationMeta } from '#shared';

export function sendSuccess<TData>(
  res: Response,
  message: string,
  data: TData,
  statusCode = 200,
  pagination?: PaginationMeta,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  });
}

export function buildPagination(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
