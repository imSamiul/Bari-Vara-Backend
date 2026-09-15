import { ERROR_CODES } from '#shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { User } from '../../models/index.js';
import {
  TEST_PASSWORD,
  apiPath,
  createTestUser,
  readCookie,
} from '../../test/helpers.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './cookies.js';

const app = createApp();

const login = (email = 'person@barivara.test', password = TEST_PASSWORD) =>
  request(app).post(apiPath('/auth/login')).send({ email, password });

describe('POST /auth/register', () => {
  it('creates an unverified account and asks for the emailed code', async () => {
    const response = await request(app).post(apiPath('/auth/register')).send({
      name: 'Nasrin Akter',
      email: 'nasrin@barivara.test',
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(202);
    expect(response.body.data).toEqual({ email: 'nasrin@barivara.test' });

    const created = await User.findOne({
      email: 'nasrin@barivara.test',
    }).select('+passwordHash');
    expect(created?.isEmailVerified).toBe(false);
    expect(created?.passwordHash).not.toBe(TEST_PASSWORD);
  });

  it('rejects a weak password with per-field details', async () => {
    const response = await request(app).post(apiPath('/auth/register')).send({
      name: 'Nasrin Akter',
      email: 'nasrin@barivara.test',
      password: 'short',
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'password' })]),
    );
  });

  it('rejects an email that is already registered', async () => {
    await createTestUser({ email: 'taken@barivara.test' });

    const response = await request(app).post(apiPath('/auth/register')).send({
      name: 'Someone Else',
      email: 'taken@barivara.test',
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('EMAIL_TAKEN');
  });
});

describe('POST /auth/login', () => {
  it('sets both token cookies and returns the caller', async () => {
    await createTestUser();

    const response = await login();

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe('person@barivara.test');
    expect(response.body.data).not.toHaveProperty('passwordHash');
    expect(readCookie(response, ACCESS_COOKIE)).toBeDefined();
    expect(readCookie(response, REFRESH_COOKIE)).toBeDefined();
  });

  it('rejects a wrong password without revealing which field failed', async () => {
    await createTestUser();

    const response = await login('person@barivara.test', 'WrongPassword1');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe(ERROR_CODES.invalidCredentials);
  });

  it('gives an unknown email the same answer as a wrong password', async () => {
    const response = await login('nobody@barivara.test');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe(ERROR_CODES.invalidCredentials);
  });

  it('blocks an unverified account with a code the web app can branch on', async () => {
    await createTestUser({ isEmailVerified: false });

    const response = await login();

    expect(response.status).toBe(403);
    expect(response.body.code).toBe(ERROR_CODES.emailNotVerified);
  });
});

describe('refresh rotation', () => {
  beforeEach(async () => {
    await createTestUser();
  });

  it('rotates the refresh token on every use', async () => {
    const loginResponse = await login();
    const firstRefresh = readCookie(loginResponse, REFRESH_COOKIE);

    const refreshResponse = await request(app)
      .post(apiPath('/auth/refresh'))
      .set('Cookie', firstRefresh ?? '');

    expect(refreshResponse.status).toBe(200);

    const secondRefresh = readCookie(refreshResponse, REFRESH_COOKIE);
    expect(secondRefresh).toBeDefined();
    expect(secondRefresh).not.toBe(firstRefresh);
  });

  it('rejects a replayed refresh token and revokes the whole session family', async () => {
    const loginResponse = await login();
    const firstRefresh = readCookie(loginResponse, REFRESH_COOKIE);

    const refreshResponse = await request(app)
      .post(apiPath('/auth/refresh'))
      .set('Cookie', firstRefresh ?? '');
    const secondRefresh = readCookie(refreshResponse, REFRESH_COOKIE);

    const replay = await request(app)
      .post(apiPath('/auth/refresh'))
      .set('Cookie', firstRefresh ?? '');

    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe(ERROR_CODES.refreshTokenReused);

    // The token issued by the legitimate rotation is invalidated too, because a
    // replay means the family is compromised.
    const afterRevocation = await request(app)
      .post(apiPath('/auth/refresh'))
      .set('Cookie', secondRefresh ?? '');

    expect(afterRevocation.status).toBe(401);
    expect(afterRevocation.body.code).toBe(ERROR_CODES.refreshTokenReused);
  });

  it('rejects a request with no refresh cookie', async () => {
    const response = await request(app).post(apiPath('/auth/refresh'));

    expect(response.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('clears the cookies and kills the refresh token', async () => {
    await createTestUser();
    const loginResponse = await login();
    const refreshCookie = readCookie(loginResponse, REFRESH_COOKIE);

    const logoutResponse = await request(app)
      .post(apiPath('/auth/logout'))
      .set('Cookie', refreshCookie ?? '');

    expect(logoutResponse.status).toBe(200);
    expect(readCookie(logoutResponse, ACCESS_COOKIE)).toBe(`${ACCESS_COOKIE}=`);

    const reuseAfterLogout = await request(app)
      .post(apiPath('/auth/refresh'))
      .set('Cookie', refreshCookie ?? '');

    expect(reuseAfterLogout.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns the signed-in user', async () => {
    await createTestUser({ role: 'owner' });
    const loginResponse = await login();

    const response = await request(app)
      .get(apiPath('/auth/me'))
      .set('Cookie', readCookie(loginResponse, ACCESS_COOKIE) ?? '');

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('owner');
  });

  it('rejects an anonymous caller', async () => {
    const response = await request(app).get(apiPath('/auth/me'));

    expect(response.status).toBe(401);
  });

  it('rejects a tampered access token', async () => {
    const response = await request(app)
      .get(apiPath('/auth/me'))
      .set('Cookie', `${ACCESS_COOKIE}=not-a-real-token`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('ACCESS_TOKEN_INVALID');
  });
});
