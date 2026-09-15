import type { FlatSummary } from '#shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { Booking, Flat, Review } from '../../models/index.js';
import {
  apiPath,
  createTestFlat,
  createTestUser,
  flatPayload,
  signIn,
} from '../../test/helpers.js';
import { AREA_CENTROIDS } from './geocode.js';

const app = createApp();

let ownerId: string;
let ownerCookie: string;

beforeEach(async () => {
  const owner = await createTestUser({
    email: 'owner@barivara.test',
    role: 'owner',
  });

  ownerId = String(owner._id);
  ownerCookie = await signIn(app, 'owner@barivara.test');
});

const titlesOf = (body: { data: FlatSummary[] }) =>
  body.data.map((flat) => flat.title);

describe('GET /flats', () => {
  beforeEach(async () => {
    await createTestFlat(ownerId, {
      title: 'Dhanmondi lakeside family flat',
      address: {
        line1: 'House 12, Road 4',
        area: 'Dhanmondi',
        city: 'Dhaka',
        division: 'Dhaka',
      },
      coordinates: AREA_CENTROIDS.Dhanmondi,
      monthlyRent: 32_000,
      bedrooms: 2,
      amenities: ['lift', 'parking'],
    });

    await createTestFlat(ownerId, {
      title: 'Gulshan bachelor studio with rooftop',
      category: 'bachelor',
      address: {
        line1: 'House 42, Road 11',
        area: 'Gulshan',
        city: 'Dhaka',
        division: 'Dhaka',
      },
      coordinates: AREA_CENTROIDS.Gulshan,
      monthlyRent: 78_000,
      bedrooms: 1,
      amenities: ['lift'],
    });
  });

  it('paginates and reports the total', async () => {
    const response = await request(app).get(apiPath('/flats?limit=1'));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('filters by area', async () => {
    const response = await request(app).get(apiPath('/flats?area=Gulshan'));

    expect(titlesOf(response.body)).toEqual([
      'Gulshan bachelor studio with rooftop',
    ]);
  });

  it('filters by category, rent range and bedrooms together', async () => {
    const response = await request(app).get(
      apiPath('/flats?category=family&minRent=20000&maxRent=50000&bedrooms=2'),
    );

    expect(titlesOf(response.body)).toEqual(['Dhanmondi lakeside family flat']);
  });

  it('filters by amenities, requiring all of them', async () => {
    const both = await request(app).get(apiPath('/flats?amenities=lift,parking'));
    expect(titlesOf(both.body)).toEqual(['Dhanmondi lakeside family flat']);

    const liftOnly = await request(app).get(apiPath('/flats?amenities=lift'));
    expect(liftOnly.body.data).toHaveLength(2);
  });

  it('searches the title text index', async () => {
    const response = await request(app).get(apiPath('/flats?search=rooftop'));

    expect(titlesOf(response.body)).toEqual([
      'Gulshan bachelor studio with rooftop',
    ]);
  });

  it('sorts by rent', async () => {
    const response = await request(app).get(apiPath('/flats?sort=price'));

    expect(titlesOf(response.body)).toEqual([
      'Dhanmondi lakeside family flat',
      'Gulshan bachelor studio with rooftop',
    ]);
  });

  it('returns only listings inside the search radius', async () => {
    const [lng, lat] = AREA_CENTROIDS.Gulshan;

    const nearby = await request(app).get(
      apiPath(`/flats?lng=${lng}&lat=${lat}&radiusKm=2`),
    );
    expect(titlesOf(nearby.body)).toEqual([
      'Gulshan bachelor studio with rooftop',
    ]);

    const wide = await request(app).get(
      apiPath(`/flats?lng=${lng}&lat=${lat}&radiusKm=20`),
    );
    expect(wide.body.data).toHaveLength(2);
  });

  it('rejects a rent range that cannot match anything', async () => {
    const response = await request(app).get(
      apiPath('/flats?minRent=90000&maxRent=10000'),
    );

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects half a coordinate pair', async () => {
    const response = await request(app).get(apiPath('/flats?lat=23.79'));

    expect(response.status).toBe(422);
  });
});

describe('GET /flats/:id', () => {
  it('returns the long copy and the owner card', async () => {
    const flat = await createTestFlat(ownerId);

    const response = await request(app).get(apiPath(`/flats/${flat._id}`));

    expect(response.status).toBe(200);
    expect(response.body.data.description).toContain('cross ventilation');
    expect(response.body.data.owner).toMatchObject({
      id: ownerId,
      name: 'Test Person',
    });
  });

  it('rejects a malformed id and 404s an unknown one', async () => {
    expect((await request(app).get(apiPath('/flats/not-an-id'))).status).toBe(422);
    expect(
      (await request(app).get(apiPath('/flats/507f1f77bcf86cd799439011'))).status,
    ).toBe(404);
  });
});

describe('POST /flats', () => {
  it('publishes a listing for an owner', async () => {
    const response = await request(app)
      .post(apiPath('/flats'))
      .set('Cookie', ownerCookie)
      .send(flatPayload());

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('available');
  });

  it('uses the area centre when no coordinates are given', async () => {
    const { coordinates: _ignored, ...payload } = flatPayload({
      address: {
        line1: 'House 42, Road 11',
        area: 'Gulshan',
        city: 'Dhaka',
        division: 'Dhaka',
      },
    });

    const response = await request(app)
      .post(apiPath('/flats'))
      .set('Cookie', ownerCookie)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.coordinates).toEqual(AREA_CENTROIDS.Gulshan);
  });

  it('refuses a tenant and an anonymous caller', async () => {
    await createTestUser({ email: 'tenant@barivara.test' });
    const tenantCookie = await signIn(app, 'tenant@barivara.test');

    const asTenant = await request(app)
      .post(apiPath('/flats'))
      .set('Cookie', tenantCookie)
      .send(flatPayload());
    expect(asTenant.status).toBe(403);

    const anonymous = await request(app)
      .post(apiPath('/flats'))
      .send(flatPayload());
    expect(anonymous.status).toBe(401);
  });

  it('reports every invalid field at once', async () => {
    const response = await request(app)
      .post(apiPath('/flats'))
      .set('Cookie', ownerCookie)
      .send({ ...flatPayload(), title: 'Tiny', monthlyRent: 5, images: [] });

    expect(response.status).toBe(422);
    expect(response.body.details.map((issue: { field: string }) => issue.field))
      .toEqual(expect.arrayContaining(['title', 'monthlyRent', 'images']));
  });
});

describe('PATCH and DELETE /flats/:id', () => {
  it('lets the owner edit their own listing', async () => {
    const flat = await createTestFlat(ownerId);

    const response = await request(app)
      .patch(apiPath(`/flats/${flat._id}`))
      .set('Cookie', ownerCookie)
      .send({ monthlyRent: 41_000 });

    expect(response.status).toBe(200);
    expect(response.body.data.monthlyRent).toBe(41_000);
  });

  it('stops one owner editing another owner listing', async () => {
    const flat = await createTestFlat(ownerId);
    await createTestUser({ email: 'other@barivara.test', role: 'owner' });
    const otherCookie = await signIn(app, 'other@barivara.test');

    const response = await request(app)
      .patch(apiPath(`/flats/${flat._id}`))
      .set('Cookie', otherCookie)
      .send({ monthlyRent: 1_000_000 });

    expect(response.status).toBe(403);
  });

  it('lets an admin edit any listing', async () => {
    const flat = await createTestFlat(ownerId);
    await createTestUser({ email: 'admin@barivara.test', role: 'admin' });
    const adminCookie = await signIn(app, 'admin@barivara.test');

    const response = await request(app)
      .patch(apiPath(`/flats/${flat._id}`))
      .set('Cookie', adminCookie)
      .send({ status: 'booked' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('booked');
  });

  it('takes the reviews and requests down with the listing', async () => {
    const flat = await createTestFlat(ownerId);
    const tenant = await createTestUser({ email: 'tenant@barivara.test' });

    await Review.create({
      flat: flat._id,
      author: tenant._id,
      owner: flat.owner,
      flatRating: 4,
      ownerRating: 5,
      comment: 'Good light and a helpful landlord.',
    });
    await Booking.create({
      flat: flat._id,
      tenant: tenant._id,
      owner: flat.owner,
      nid: '1234567890',
      visitDate: new Date(),
    });

    const response = await request(app)
      .delete(apiPath(`/flats/${flat._id}`))
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(200);
    expect(await Flat.countDocuments()).toBe(0);
    expect(await Review.countDocuments()).toBe(0);
    expect(await Booking.countDocuments()).toBe(0);
  });
});

describe('browse result caching', () => {
  it('serves a repeated query from Redis and drops it when a listing is published', async () => {
    await createTestFlat(ownerId, { title: 'The only listing so far' });

    const first = await request(app).get(apiPath('/flats?area=Dhanmondi'));
    expect(first.body.data).toHaveLength(1);

    // Inserted behind the API, so only a cache hit can still report one listing.
    await createTestFlat(ownerId, { title: 'Added without going through the API' });
    const cachedRead = await request(app).get(apiPath('/flats?area=Dhanmondi'));
    expect(cachedRead.body.data).toHaveLength(1);

    await request(app)
      .post(apiPath('/flats'))
      .set('Cookie', ownerCookie)
      .send(flatPayload({ title: 'Published through the API' }));

    const afterPublish = await request(app).get(apiPath('/flats?area=Dhanmondi'));
    expect(afterPublish.body.data).toHaveLength(3);
  });
});

describe('GET /flats/mine', () => {
  it('returns only the caller own listings', async () => {
    await createTestFlat(ownerId, { title: 'Mine and available' });
    const otherOwner = await createTestUser({
      email: 'other@barivara.test',
      role: 'owner',
    });
    await createTestFlat(String(otherOwner._id), { title: 'Somebody else' });

    const response = await request(app)
      .get(apiPath('/flats/mine'))
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(200);
    expect(titlesOf(response.body)).toEqual(['Mine and available']);
  });
});
