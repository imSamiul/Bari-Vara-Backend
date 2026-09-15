import type { StatsOverview } from '#shared';
import dayjs from 'dayjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { Booking } from '../../models/index.js';
import {
  apiPath,
  createTestFlat,
  createTestUser,
  signIn,
} from '../../test/helpers.js';

const app = createApp();

let adminCookie: string;

beforeEach(async () => {
  await createTestUser({ email: 'admin@barivara.test', role: 'admin' });
  const owner = await createTestUser({
    email: 'owner@barivara.test',
    role: 'owner',
  });
  const tenant = await createTestUser({ email: 'tenant@barivara.test' });

  const flat = await createTestFlat(String(owner._id), { monthlyRent: 30_000 });
  await createTestFlat(String(owner._id), {
    monthlyRent: 50_000,
    category: 'bachelor',
    address: {
      line1: 'House 42, Road 11',
      area: 'Gulshan',
      city: 'Dhaka',
      division: 'Dhaka',
    },
  });

  await Booking.create({
    flat: flat._id,
    tenant: tenant._id,
    owner: owner._id,
    nid: '1990123456789',
    visitDate: new Date(),
  });

  adminCookie = await signIn(app, 'admin@barivara.test');
});

describe('GET /stats/overview', () => {
  it('counts the platform in one response', async () => {
    const response = await request(app)
      .get(apiPath('/stats/overview'))
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);

    const stats = response.body.data as StatsOverview;

    expect(stats.totals).toMatchObject({
      users: 3,
      owners: 1,
      flats: 2,
      availableFlats: 2,
      bookings: 1,
      pendingBookings: 1,
      reviews: 0,
      averageRent: 40_000,
    });
  });

  it('reports every status, category and area, zeroes included', async () => {
    const response = await request(app)
      .get(apiPath('/stats/overview'))
      .set('Cookie', adminCookie);

    const stats = response.body.data as StatsOverview;

    expect(
      stats.bookingsByStatus.find((bucket) => bucket.status === 'pending')?.count,
    ).toBe(1);
    expect(
      stats.bookingsByStatus.find((bucket) => bucket.status === 'approved')?.count,
    ).toBe(0);
    expect(
      stats.flatsByCategory.find((bucket) => bucket.category === 'bachelor')
        ?.count,
    ).toBe(1);
    expect(
      stats.flatsByArea.find((bucket) => bucket.area === 'Gulshan'),
    ).toMatchObject({ count: 1, averageRent: 50_000 });
  });

  it('returns a full twelve month axis ending on the current month', async () => {
    const response = await request(app)
      .get(apiPath('/stats/overview'))
      .set('Cookie', adminCookie);

    const { monthlyActivity } = response.body.data as StatsOverview;

    expect(monthlyActivity).toHaveLength(12);
    expect(monthlyActivity.at(-1)).toMatchObject({
      month: dayjs().format('YYYY-MM'),
      signups: 3,
      listings: 2,
      bookings: 1,
    });
  });

  it('is admin only', async () => {
    const ownerCookie = await signIn(app, 'owner@barivara.test');

    const asOwner = await request(app)
      .get(apiPath('/stats/overview'))
      .set('Cookie', ownerCookie);
    expect(asOwner.status).toBe(403);

    const anonymous = await request(app).get(apiPath('/stats/overview'));
    expect(anonymous.status).toBe(401);
  });
});
