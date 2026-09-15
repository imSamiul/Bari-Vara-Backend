import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '#shared';
import type { CookieOptions, Response } from 'express';

import {
  accessTokenTtlSeconds,
  env,
  isProduction,
  refreshTokenTtlSeconds,
} from '../../config/env.js';

export {
  ACCESS_TOKEN_COOKIE as ACCESS_COOKIE,
  REFRESH_TOKEN_COOKIE as REFRESH_COOKIE,
};

/**
 * The web app runs on a different origin than the API in production, so cookies
 * must be sameSite=none, which browsers only accept alongside secure. Locally
 * both run on localhost over http, where lax works and secure would be dropped.
 */
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: accessTokenTtlSeconds * 1000,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: refreshTokenTtlSeconds * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions);
}
