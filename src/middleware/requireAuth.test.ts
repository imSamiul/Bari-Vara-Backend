import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { ACCESS_COOKIE } from '../modules/auth/cookies.js';
import { signAccessToken } from '../modules/auth/tokens.js';
import { errorHandler } from './errorHandler.js';
import { requireAuth, requireRole } from './requireAuth.js';

/** A minimal app so the guards are tested without depending on domain routes. */
const app = express();
app.use(cookieParser());
app.get('/admin-only', requireAuth, requireRole('admin'), (_req, res) => {
  res.json({ success: true });
});
app.use(errorHandler);

const asRole = (role: 'user' | 'owner' | 'admin') =>
  request(app)
    .get('/admin-only')
    .set(
      'Cookie',
      `${ACCESS_COOKIE}=${signAccessToken('507f1f77bcf86cd799439011', role)}`,
    );

describe('requireRole', () => {
  it('lets the allowed role through', async () => {
    const response = await asRole('admin');

    expect(response.status).toBe(200);
  });

  it('returns 403 for an authenticated caller with the wrong role', async () => {
    const response = await asRole('owner');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('returns 401 rather than 403 when nobody is signed in', async () => {
    const response = await request(app).get('/admin-only');

    expect(response.status).toBe(401);
  });
});
