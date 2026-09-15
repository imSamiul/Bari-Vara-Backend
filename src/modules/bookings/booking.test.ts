import dayjs from 'dayjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { Booking, Flat } from '../../models/index.js';
import {
  apiPath,
  createTestFlat,
  createTestUser,
  signIn,
} from '../../test/helpers.js';

const app = createApp();

let flatId: string;
let ownerCookie: string;
let tenantCookie: string;

const bookingPayload = () => ({
  flatId,
  nid: '1990123456789',
  visitDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
  message: 'Could I see the flat on Friday afternoon?',
});

beforeEach(async () => {
  const owner = await createTestUser({
    name: 'Owner Person',
    email: 'owner@barivara.test',
    role: 'owner',
  });
  await createTestUser({ name: 'Tenant Person', email: 'tenant@barivara.test' });

  const flat = await createTestFlat(String(owner._id));
  flatId = String(flat._id);

  ownerCookie = await signIn(app, 'owner@barivara.test');
  tenantCookie = await signIn(app, 'tenant@barivara.test');
});

const createBooking = () =>
  request(app)
    .post(apiPath('/bookings'))
    .set('Cookie', tenantCookie)
    .send(bookingPayload());

describe('POST /bookings', () => {
  it('opens a pending request carrying both parties', async () => {
    const response = await createBooking();

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: 'pending',
      flat: { id: flatId },
      tenant: { name: 'Tenant Person' },
      owner: { name: 'Owner Person' },
    });
  });

  it('refuses an owner requesting their own listing', async () => {
    const response = await request(app)
      .post(apiPath('/bookings'))
      .set('Cookie', ownerCookie)
      .send(bookingPayload());

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CANNOT_BOOK_OWN_FLAT');
  });

  it('refuses a second live request for the same listing', async () => {
    await createBooking();
    const response = await createBooking();

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('BOOKING_ALREADY_EXISTS');
  });

  it('lets a tenant apply again after being rejected', async () => {
    const first = await createBooking();
    await request(app)
      .patch(apiPath(`/bookings/${first.body.data.id}/status`))
      .set('Cookie', ownerCookie)
      .send({ status: 'rejected' });

    expect((await createBooking()).status).toBe(201);
  });

  it('refuses a listing that is already taken', async () => {
    await Flat.updateOne({ _id: flatId }, { status: 'booked' });

    const response = await createBooking();

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('FLAT_NOT_AVAILABLE');
  });

  it('rejects a malformed NID', async () => {
    const response = await request(app)
      .post(apiPath('/bookings'))
      .set('Cookie', tenantCookie)
      .send({ ...bookingPayload(), nid: '12345' });

    expect(response.status).toBe(422);
  });

  it('needs a signed-in caller', async () => {
    const response = await request(app)
      .post(apiPath('/bookings'))
      .send(bookingPayload());

    expect(response.status).toBe(401);
  });
});

describe('GET /bookings/me and /bookings/received', () => {
  it('shows the request to the tenant who made it and the owner who got it', async () => {
    await createBooking();

    const mine = await request(app)
      .get(apiPath('/bookings/me'))
      .set('Cookie', tenantCookie);
    expect(mine.body.data).toHaveLength(1);

    const received = await request(app)
      .get(apiPath('/bookings/received'))
      .set('Cookie', ownerCookie);
    expect(received.body.data).toHaveLength(1);
  });

  it('hides other people requests', async () => {
    await createBooking();
    await createTestUser({ email: 'stranger@barivara.test' });
    const strangerCookie = await signIn(app, 'stranger@barivara.test');

    const response = await request(app)
      .get(apiPath('/bookings/me'))
      .set('Cookie', strangerCookie);

    expect(response.body.data).toHaveLength(0);
  });

  it('filters by status', async () => {
    await createBooking();

    const response = await request(app)
      .get(apiPath('/bookings/me?status=approved'))
      .set('Cookie', tenantCookie);

    expect(response.body.data).toHaveLength(0);
  });

  it('keeps tenants out of the owner queue', async () => {
    const response = await request(app)
      .get(apiPath('/bookings/received'))
      .set('Cookie', tenantCookie);

    expect(response.status).toBe(403);
  });
});

describe('PATCH /bookings/:id/status', () => {
  let bookingId: string;

  beforeEach(async () => {
    bookingId = (await createBooking()).body.data.id;
  });

  it('takes the listing off the market when the owner approves', async () => {
    const response = await request(app)
      .patch(apiPath(`/bookings/${bookingId}/status`))
      .set('Cookie', ownerCookie)
      .send({ status: 'approved', ownerNote: 'See you at 4pm.' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: 'approved',
      ownerNote: 'See you at 4pm.',
    });
    expect((await Flat.findById(flatId))?.status).toBe('booked');
  });

  it('leaves the listing available when the owner rejects', async () => {
    await request(app)
      .patch(apiPath(`/bookings/${bookingId}/status`))
      .set('Cookie', ownerCookie)
      .send({ status: 'rejected' });

    expect((await Flat.findById(flatId))?.status).toBe('available');
  });

  it('refuses another owner', async () => {
    await createTestUser({ email: 'other@barivara.test', role: 'owner' });
    const otherCookie = await signIn(app, 'other@barivara.test');

    const response = await request(app)
      .patch(apiPath(`/bookings/${bookingId}/status`))
      .set('Cookie', otherCookie)
      .send({ status: 'approved' });

    expect(response.status).toBe(403);
  });

  it('refuses a second decision', async () => {
    await request(app)
      .patch(apiPath(`/bookings/${bookingId}/status`))
      .set('Cookie', ownerCookie)
      .send({ status: 'approved' });

    const response = await request(app)
      .patch(apiPath(`/bookings/${bookingId}/status`))
      .set('Cookie', ownerCookie)
      .send({ status: 'rejected' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('BOOKING_NOT_PENDING');
  });

  it('accepts only approved or rejected', async () => {
    const response = await request(app)
      .patch(apiPath(`/bookings/${bookingId}/status`))
      .set('Cookie', ownerCookie)
      .send({ status: 'cancelled' });

    expect(response.status).toBe(422);
  });
});

describe('DELETE /bookings/:id', () => {
  it('lets the tenant withdraw while the request is pending', async () => {
    const bookingId = (await createBooking()).body.data.id;

    const response = await request(app)
      .delete(apiPath(`/bookings/${bookingId}`))
      .set('Cookie', tenantCookie);

    expect(response.status).toBe(200);
    expect((await Booking.findById(bookingId))?.status).toBe('cancelled');
  });

  it('refuses once the owner has approved', async () => {
    const bookingId = (await createBooking()).body.data.id;
    await request(app)
      .patch(apiPath(`/bookings/${bookingId}/status`))
      .set('Cookie', ownerCookie)
      .send({ status: 'approved' });

    const response = await request(app)
      .delete(apiPath(`/bookings/${bookingId}`))
      .set('Cookie', tenantCookie);

    expect(response.status).toBe(409);
  });

  it('refuses someone else request', async () => {
    const bookingId = (await createBooking()).body.data.id;
    await createTestUser({ email: 'stranger@barivara.test' });
    const strangerCookie = await signIn(app, 'stranger@barivara.test');

    const response = await request(app)
      .delete(apiPath(`/bookings/${bookingId}`))
      .set('Cookie', strangerCookie);

    expect(response.status).toBe(403);
  });
});
