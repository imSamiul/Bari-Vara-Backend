import type { CreateFlatInput, UserRole } from '#shared';
import dayjs from 'dayjs';
import type { Express } from 'express';
import request, { type Response } from 'supertest';

import { env } from '../config/env.js';
import { Flat, User } from '../models/index.js';
import { ACCESS_COOKIE } from '../modules/auth/cookies.js';
import { hashPassword } from '../modules/auth/password.js';

export const TEST_PASSWORD = 'Password123';

export const apiPath = (path: string) => `${env.API_PREFIX}${path}`;

/** Creates an already-verified account so tests can skip the OTP round trip. */
export async function createTestUser(
  overrides: {
    name?: string;
    email?: string;
    role?: UserRole;
    isEmailVerified?: boolean;
    phone?: string;
    address?: string;
  } = {},
) {
  return User.create({
    name: overrides.name ?? 'Test Person',
    email: overrides.email ?? 'person@barivara.test',
    passwordHash: await hashPassword(TEST_PASSWORD),
    role: overrides.role ?? 'user',
    isEmailVerified: overrides.isEmailVerified ?? true,
    ...(overrides.phone ? { phone: overrides.phone } : {}),
    ...(overrides.address ? { address: overrides.address } : {}),
  });
}

/** Returns the `name=value` pair, ready to be sent back in a Cookie header. */
export function readCookie(response: Response, name: string) {
  const setCookie = response.headers['set-cookie'] as string[] | undefined;
  const match = setCookie?.find((cookie) => cookie.startsWith(`${name}=`));

  return match?.split(';')[0];
}

/** Signs in and hands back the access cookie for use as a Cookie header. */
export async function signIn(app: Express, email: string) {
  const response = await request(app)
    .post(apiPath('/auth/login'))
    .send({ email, password: TEST_PASSWORD });

  const cookie = readCookie(response, ACCESS_COOKIE);

  if (!cookie) {
    throw new Error(
      `Could not sign in as ${email}: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return cookie;
}

export function flatPayload(
  overrides: Partial<CreateFlatInput> = {},
): CreateFlatInput {
  return {
    title: 'Bright two bedroom beside Dhanmondi lake',
    description:
      'A quiet corner flat with cross ventilation, a south facing balcony and a lift that actually works.',
    category: 'family',
    monthlyRent: 32_000,
    serviceCharge: 2_000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    areaSqft: 1_100,
    availableFrom: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    amenities: ['lift', 'parking'],
    address: {
      line1: 'House 12, Road 4',
      area: 'Dhanmondi',
      city: 'Dhaka',
      division: 'Dhaka',
    },
    coordinates: [90.3742, 23.7461],
    images: [
      { url: 'https://images.unsplash.com/photo-test', publicId: 'seed/test' },
    ],
    ...overrides,
  };
}

/** Inserts a listing directly, for tests that are not about listing creation. */
export async function createTestFlat(
  ownerId: string,
  overrides: Partial<CreateFlatInput> = {},
) {
  const payload = flatPayload(overrides);

  return Flat.create({
    ...payload,
    availableFrom: new Date(payload.availableFrom),
    location: {
      type: 'Point' as const,
      coordinates: payload.coordinates ?? [90.3742, 23.7461],
    },
    owner: ownerId,
  });
}
