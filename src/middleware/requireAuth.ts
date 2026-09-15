import type { UserRole } from '#shared';
import type { RequestHandler } from 'express';

import { ACCESS_COOKIE } from '../modules/auth/cookies.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';
import { ApiError } from '../utils/ApiError.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];

  if (typeof token !== 'string' || token.length === 0) {
    next(ApiError.unauthorized('Sign in to continue'));
    return;
  }

  try {
    const { sub, role } = verifyAccessToken(token);
    req.auth = { id: sub, role };
    next();
  } catch {
    // The web middleware reacts to this code by attempting a silent refresh.
    next(ApiError.unauthorized('Session expired', 'ACCESS_TOKEN_INVALID'));
  }
};

/**
 * Narrows req.auth for controllers behind requireAuth, so they read the caller
 * without a non-null assertion.
 */
export function authContext(req: { auth?: { id: string; role: UserRole } }) {
  if (!req.auth) {
    throw ApiError.unauthorized('Sign in to continue');
  }

  return req.auth;
}

/** Must run after requireAuth. */
export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(ApiError.unauthorized('Sign in to continue'));
      return;
    }

    if (!allowed.includes(req.auth.role)) {
      next(ApiError.forbidden());
      return;
    }

    next();
  };
}
