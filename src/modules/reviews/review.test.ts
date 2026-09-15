import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { Flat, Review, User } from '../../models/index.js';
import {
  apiPath,
  createTestFlat,
  createTestUser,
  signIn,
} from '../../test/helpers.js';

const app = createApp();

let ownerId: string;
let flatId: string;
let secondFlatId: string;
let tenantCookie: string;

const reviewPayload = {
  flatRating: 4,
  ownerRating: 5,
  comment: 'Bright rooms, quick to fix the geyser, would rent again.',
};

beforeEach(async () => {
  const owner = await createTestUser({
    email: 'owner@barivara.test',
    role: 'owner',
  });
  ownerId = String(owner._id);

  flatId = String(await createTestFlat(ownerId).then((flat) => flat._id));
  secondFlatId = String(
    await createTestFlat(ownerId, { title: 'Second listing by the same owner' }).then(
      (flat) => flat._id,
    ),
  );

  await createTestUser({ name: 'Tenant Person', email: 'tenant@barivara.test' });
  tenantCookie = await signIn(app, 'tenant@barivara.test');
});

const postReview = (
  targetFlatId: string,
  cookie: string,
  body: Partial<typeof reviewPayload> = {},
) =>
  request(app)
    .post(apiPath(`/flats/${targetFlatId}/reviews`))
    .set('Cookie', cookie)
    .send({ ...reviewPayload, ...body });

describe('POST /flats/:id/reviews', () => {
  it('publishes the review and rolls the ratings up', async () => {
    const response = await postReview(flatId, tenantCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.author).toMatchObject({ name: 'Tenant Person' });
    expect((await Flat.findById(flatId))?.rating).toMatchObject({
      average: 4,
      count: 1,
    });
    expect((await User.findById(ownerId))?.ownerRating).toMatchObject({
      average: 5,
      count: 1,
    });
  });

  it('averages the owner rating across all of their listings', async () => {
    await postReview(flatId, tenantCookie, { ownerRating: 5 });
    await postReview(secondFlatId, tenantCookie, { ownerRating: 2 });

    expect((await User.findById(ownerId))?.ownerRating).toMatchObject({
      average: 3.5,
      count: 2,
    });
  });

  it('replaces the caller earlier review rather than adding a second', async () => {
    await postReview(flatId, tenantCookie, { flatRating: 2 });
    const response = await postReview(flatId, tenantCookie, {
      flatRating: 5,
      comment: 'The landlord sorted the water pressure, revising my score.',
    });

    expect(response.status).toBe(200);
    expect(await Review.countDocuments({ flat: flatId })).toBe(1);
    expect((await Flat.findById(flatId))?.rating).toMatchObject({
      average: 5,
      count: 1,
    });
  });

  it('refuses the owner reviewing their own listing', async () => {
    const ownerCookie = await signIn(app, 'owner@barivara.test');

    const response = await postReview(flatId, ownerCookie);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CANNOT_REVIEW_OWN_FLAT');
  });

  it('needs a signed-in caller and a rating in range', async () => {
    const anonymous = await request(app)
      .post(apiPath(`/flats/${flatId}/reviews`))
      .send(reviewPayload);
    expect(anonymous.status).toBe(401);

    const outOfRange = await postReview(flatId, tenantCookie, { flatRating: 9 });
    expect(outOfRange.status).toBe(422);
  });
});

describe('GET /flats/:id/reviews', () => {
  it('lists newest first with a total', async () => {
    await postReview(flatId, tenantCookie);
    await createTestUser({ name: 'Other Tenant', email: 'other@barivara.test' });
    await postReview(flatId, await signIn(app, 'other@barivara.test'));

    const response = await request(app).get(
      apiPath(`/flats/${flatId}/reviews?limit=1`),
    );

    expect(response.status).toBe(200);
    expect(response.body.data[0].author.name).toBe('Other Tenant');
    expect(response.body.pagination.total).toBe(2);
  });

  it('is empty for a listing nobody has reviewed', async () => {
    const response = await request(app).get(
      apiPath(`/flats/${secondFlatId}/reviews`),
    );

    expect(response.body.data).toEqual([]);
  });
});
