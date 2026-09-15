import type { UserRole } from '#shared';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

import {
  accessTokenTtlSeconds,
  env,
  refreshTokenTtlSeconds,
} from '../../config/env.js';

/** The access token carries the role so route gating needs no database read. */
export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

/**
 * The refresh token carries only an id and a rotation handle. Roles are re-read
 * from the database on refresh so a demotion takes effect within one access TTL.
 */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(userId: string, role: UserRole) {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: accessTokenTtlSeconds,
  });
}

export function signRefreshToken(userId: string) {
  const jti = randomUUID();

  const token = jwt.sign({ sub: userId, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: refreshTokenTtlSeconds,
  });

  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  assertObjectPayload(payload);

  const { sub, role } = payload;
  if (typeof sub !== 'string' || typeof role !== 'string') {
    throw new jwt.JsonWebTokenError('Access token payload is malformed');
  }

  return { sub, role: role as UserRole };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  assertObjectPayload(payload);

  const { sub, jti } = payload;
  if (typeof sub !== 'string' || typeof jti !== 'string') {
    throw new jwt.JsonWebTokenError('Refresh token payload is malformed');
  }

  return { sub, jti };
}

function assertObjectPayload(
  payload: string | jwt.JwtPayload,
): asserts payload is jwt.JwtPayload {
  if (typeof payload === 'string') {
    throw new jwt.JsonWebTokenError('Token payload is not an object');
  }
}
