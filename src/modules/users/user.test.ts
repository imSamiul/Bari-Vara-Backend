import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { User } from '../../models/index.js';
import { REFRESH_COOKIE } from '../auth/cookies.js';
import {
  TEST_PASSWORD,
  apiPath,
  createTestUser,
  readCookie,
  signIn,
} from '../../test/helpers.js';

const app = createApp();

let adminCookie: string;

beforeEach(async () => {
  await createTestUser({
    name: 'Admin Person',
    email: 'admin@barivara.test',
    role: 'admin',
  });

  adminCookie = await signIn(app, 'admin@barivara.test');
});

describe('PATCH /users/me', () => {
  it('saves the fields the owner application needs', async () => {
    await createTestUser({ email: 'tenant@barivara.test' });
    const tenantCookie = await signIn(app, 'tenant@barivara.test');

    const response = await request(app)
      .patch(apiPath('/users/me'))
      .set('Cookie', tenantCookie)
      .send({ phone: '01711223344', address: 'House 9, Road 3, Uttara' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      phone: '01711223344',
      address: 'House 9, Road 3, Uttara',
    });
  });

  it('rejects a phone number that is not a Bangladeshi mobile', async () => {
    await createTestUser({ email: 'tenant@barivara.test' });
    const tenantCookie = await signIn(app, 'tenant@barivara.test');

    const response = await request(app)
      .patch(apiPath('/users/me'))
      .set('Cookie', tenantCookie)
      .send({ phone: '0123' });

    expect(response.status).toBe(422);
  });
});

describe('GET /users', () => {
  it('lists and filters accounts for an admin', async () => {
    await createTestUser({ email: 'owner@barivara.test', role: 'owner' });
    await createTestUser({ email: 'tenant@barivara.test' });

    const all = await request(app)
      .get(apiPath('/users'))
      .set('Cookie', adminCookie);
    expect(all.body.pagination.total).toBe(3);

    const owners = await request(app)
      .get(apiPath('/users?role=owner'))
      .set('Cookie', adminCookie);
    expect(owners.body.data).toHaveLength(1);
  });

  it('never leaks the password hash', async () => {
    const response = await request(app)
      .get(apiPath('/users'))
      .set('Cookie', adminCookie);

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('is closed to everyone but admins', async () => {
    await createTestUser({ email: 'owner@barivara.test', role: 'owner' });
    const ownerCookie = await signIn(app, 'owner@barivara.test');

    const response = await request(app)
      .get(apiPath('/users'))
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(403);
  });
});

describe('PATCH /users/:id/role', () => {
  it('promotes an account and marks it as an approved owner', async () => {
    const tenant = await createTestUser({ email: 'tenant@barivara.test' });

    const response = await request(app)
      .patch(apiPath(`/users/${tenant._id}/role`))
      .set('Cookie', adminCookie)
      .send({ role: 'owner' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      role: 'owner',
      ownerRequestStatus: 'approved',
    });
  });

  it('cuts the existing sessions loose so the new role has to be re-issued', async () => {
    const tenant = await createTestUser({ email: 'tenant@barivara.test' });
    const login = await request(app)
      .post(apiPath('/auth/login'))
      .send({ email: 'tenant@barivara.test', password: TEST_PASSWORD });
    const refreshCookie = readCookie(login, REFRESH_COOKIE);

    await request(app)
      .patch(apiPath(`/users/${tenant._id}/role`))
      .set('Cookie', adminCookie)
      .send({ role: 'owner' });

    const refresh = await request(app)
      .post(apiPath('/auth/refresh'))
      .set('Cookie', refreshCookie ?? '');

    expect(refresh.status).toBe(401);
  });
});

describe('owner request flow', () => {
  it('needs a phone number and address first', async () => {
    await createTestUser({ email: 'tenant@barivara.test' });
    const tenantCookie = await signIn(app, 'tenant@barivara.test');

    const response = await request(app)
      .post(apiPath('/users/me/owner-request'))
      .set('Cookie', tenantCookie);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('PROFILE_INCOMPLETE');
  });

  it('goes pending, then approved, and leaves the account able to list', async () => {
    const tenant = await createTestUser({
      email: 'tenant@barivara.test',
      phone: '01711223344',
      address: 'House 9, Road 3, Uttara',
    });
    const tenantCookie = await signIn(app, 'tenant@barivara.test');

    const requested = await request(app)
      .post(apiPath('/users/me/owner-request'))
      .set('Cookie', tenantCookie);
    expect(requested.body.data.ownerRequestStatus).toBe('pending');

    const pending = await request(app)
      .get(apiPath('/users?ownerRequestStatus=pending'))
      .set('Cookie', adminCookie);
    expect(pending.body.data).toHaveLength(1);

    const approved = await request(app)
      .patch(apiPath(`/users/${tenant._id}/owner-request`))
      .set('Cookie', adminCookie)
      .send({ decision: 'approved' });

    expect(approved.status).toBe(200);
    expect(approved.body.data.role).toBe('owner');
    expect((await User.findById(tenant._id))?.role).toBe('owner');
  });

  it('keeps a rejected applicant as a tenant', async () => {
    const tenant = await createTestUser({
      email: 'tenant@barivara.test',
      phone: '01711223344',
      address: 'House 9, Road 3, Uttara',
    });
    const tenantCookie = await signIn(app, 'tenant@barivara.test');

    await request(app)
      .post(apiPath('/users/me/owner-request'))
      .set('Cookie', tenantCookie);

    const response = await request(app)
      .patch(apiPath(`/users/${tenant._id}/owner-request`))
      .set('Cookie', adminCookie)
      .send({ decision: 'rejected' });

    expect(response.body.data).toMatchObject({
      role: 'user',
      ownerRequestStatus: 'rejected',
    });
  });

  it('refuses a second request while one is being reviewed', async () => {
    await createTestUser({
      email: 'tenant@barivara.test',
      phone: '01711223344',
      address: 'House 9, Road 3, Uttara',
    });
    const tenantCookie = await signIn(app, 'tenant@barivara.test');

    await request(app)
      .post(apiPath('/users/me/owner-request'))
      .set('Cookie', tenantCookie);
    const second = await request(app)
      .post(apiPath('/users/me/owner-request'))
      .set('Cookie', tenantCookie);

    expect(second.status).toBe(409);
    expect(second.body.code).toBe('REQUEST_PENDING');
  });

  it('tells an existing owner there is nothing to apply for', async () => {
    await createTestUser({
      email: 'owner@barivara.test',
      role: 'owner',
      phone: '01711223344',
      address: 'House 9, Road 3, Uttara',
    });
    const ownerCookie = await signIn(app, 'owner@barivara.test');

    const response = await request(app)
      .post(apiPath('/users/me/owner-request'))
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ALREADY_OWNER');
  });

  it('refuses to decide a request that was never made', async () => {
    const tenant = await createTestUser({ email: 'tenant@barivara.test' });

    const response = await request(app)
      .patch(apiPath(`/users/${tenant._id}/owner-request`))
      .set('Cookie', adminCookie)
      .send({ decision: 'approved' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('NO_PENDING_REQUEST');
  });
});
