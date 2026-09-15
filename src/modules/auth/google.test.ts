import { ERROR_CODES } from '#shared';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import { User } from '../../models/index.js';
import {
  TEST_PASSWORD,
  apiPath,
  createTestUser,
  readCookie,
} from '../../test/helpers.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './cookies.js';
import type { GoogleProfile } from './google.js';

const VALID_TOKEN = 'valid-google-token';

/** Tests never reach Google; the verifier is replaced with this stub. */
const google = vi.hoisted(() => ({
  configured: true,
  profile: {
    sub: '1234567890',
    email: 'nasrin@barivara.test',
    emailVerified: true,
    name: 'Nasrin Akter',
    picture: 'https://lh3.googleusercontent.com/a/photo',
  } as GoogleProfile,
}));

vi.mock('./google.js', () => ({
  get isGoogleConfigured() {
    return google.configured;
  },
  verifyGoogleIdToken: async (credential: string): Promise<GoogleProfile> => {
    if (credential !== VALID_TOKEN) throw new Error('invalid token');

    return { ...google.profile };
  },
}));

const app = createApp();

const googleLogin = (credential: string = VALID_TOKEN) =>
  request(app).post(apiPath('/auth/google')).send({ credential });

const passwordLogin = (email: string) =>
  request(app)
    .post(apiPath('/auth/login'))
    .send({ email, password: TEST_PASSWORD });

beforeEach(() => {
  google.configured = true;
  google.profile = {
    sub: '1234567890',
    email: 'nasrin@barivara.test',
    emailVerified: true,
    name: 'Nasrin Akter',
    picture: 'https://lh3.googleusercontent.com/a/photo',
  };
});

describe('POST /auth/google', () => {
  it('creates a verified account on first sign-in and sets both cookies', async () => {
    const response = await googleLogin();

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: 'nasrin@barivara.test',
      name: 'Nasrin Akter',
      isEmailVerified: true,
      avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
    });
    expect(readCookie(response, ACCESS_COOKIE)).toBeDefined();
    expect(readCookie(response, REFRESH_COOKIE)).toBeDefined();

    const created = await User.findOne({
      email: 'nasrin@barivara.test',
    }).select('+passwordHash');
    expect(created?.googleId).toBe('1234567890');
    expect(created?.authProvider).toBe('google');
    expect(created?.passwordHash).toBeUndefined();
  });

  it('signs the same account in again without duplicating it', async () => {
    const first = await googleLogin();
    const second = await googleLogin();

    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await User.countDocuments()).toBe(1);
  });

  it('links a verified password account and keeps its password working', async () => {
    await createTestUser({ email: 'nasrin@barivara.test' });

    const response = await googleLogin();

    expect(response.status).toBe(200);

    const linked = await User.findOne({ email: 'nasrin@barivara.test' });
    expect(linked?.googleId).toBe('1234567890');
    expect(linked?.authProvider).toBe('local');
    expect(await User.countDocuments()).toBe(1);

    const login = await passwordLogin('nasrin@barivara.test');
    expect(login.status).toBe(200);
  });

  it('drops the password of an unverified account it links to', async () => {
    // Someone may have registered this address before its real owner did.
    await createTestUser({
      email: 'nasrin@barivara.test',
      isEmailVerified: false,
    });

    const response = await googleLogin();

    expect(response.status).toBe(200);
    expect(response.body.data.isEmailVerified).toBe(true);

    const login = await passwordLogin('nasrin@barivara.test');
    expect(login.status).toBe(401);
    expect(login.body.code).toBe(ERROR_CODES.invalidCredentials);
  });

  it('refuses an email Google has not verified', async () => {
    google.profile.emailVerified = false;

    const response = await googleLogin();

    expect(response.status).toBe(403);
    expect(response.body.code).toBe(ERROR_CODES.googleEmailUnverified);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects a token Google does not recognise', async () => {
    const response = await googleLogin('garbage');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe(ERROR_CODES.googleTokenInvalid);
    expect(readCookie(response, ACCESS_COOKIE)).toBeUndefined();
  });

  it('validates that a credential is present', async () => {
    const response = await request(app).post(apiPath('/auth/google')).send({});

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'credential' })]),
    );
  });

  it('answers 503 when no client id is configured', async () => {
    google.configured = false;

    const response = await googleLogin();

    expect(response.status).toBe(503);
    expect(response.body.code).toBe(ERROR_CODES.googleNotConfigured);
  });
});
