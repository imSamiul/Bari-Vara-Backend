import { Writable } from 'node:stream';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cloudinary } from '../../config/cloudinary.js';
import { createApp } from '../../app.js';
import { MAX_IMAGE_BYTES } from '../../middleware/upload.js';
import { apiPath, createTestUser, signIn } from '../../test/helpers.js';
import { destroyImages } from './upload.service.js';

/**
 * Cloudinary is stubbed rather than called, so the suite covers the request
 * contract without depending on credentials or the network.
 */
const cloudinaryStub = vi.hoisted(() => ({ isConfigured: true }));

vi.mock('../../config/cloudinary.js', () => ({
  get isCloudinaryConfigured() {
    return cloudinaryStub.isConfigured;
  },
  CLOUDINARY_FOLDER: 'bari-vara/flats',
  cloudinary: {
    uploader: {
      upload_stream: (
        _options: unknown,
        callback: (
          error: Error | null,
          result: { secure_url: string; public_id: string },
        ) => void,
      ) =>
        new Writable({
          write: (_chunk, _encoding, done) => done(),
          final(done) {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/demo/room.webp',
              public_id: 'bari-vara/flats/room',
            });
            done();
          },
        }),
      destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
    },
    api: {
      delete_resources: vi.fn().mockResolvedValue({ deleted: {} }),
    },
  },
}));

const app = createApp();

let ownerCookie: string;

beforeEach(async () => {
  cloudinaryStub.isConfigured = true;
  await createTestUser({ email: 'owner@barivara.test', role: 'owner' });
  ownerCookie = await signIn(app, 'owner@barivara.test');
});

const postImage = (
  buffer: Buffer,
  filename = 'room.webp',
  contentType = 'image/webp',
) =>
  request(app)
    .post(apiPath('/uploads/image'))
    .set('Cookie', ownerCookie)
    .attach('image', buffer, { filename, contentType });

describe('POST /uploads/image', () => {
  it('returns just the URL and public id that get stored', async () => {
    const response = await postImage(Buffer.alloc(64));

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      url: 'https://res.cloudinary.com/demo/room.webp',
      publicId: 'bari-vara/flats/room',
    });
  });

  it('rejects a file that is not an allowed image type', async () => {
    const response = await postImage(
      Buffer.from('not really an image'),
      'lease.pdf',
      'application/pdf',
    );

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('UNSUPPORTED_IMAGE_TYPE');
  });

  it('rejects an image over the size limit', async () => {
    const response = await postImage(
      Buffer.alloc(MAX_IMAGE_BYTES + 1),
      'huge.png',
      'image/png',
    );

    expect(response.status).toBe(413);
    expect(response.body.code).toBe('LIMIT_FILE_SIZE');
  });

  it('asks for a file when the field is missing', async () => {
    const response = await request(app)
      .post(apiPath('/uploads/image'))
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('NO_FILE');
  });

  it('says so plainly when Cloudinary is not configured', async () => {
    cloudinaryStub.isConfigured = false;

    const response = await postImage(Buffer.alloc(64));

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('UPLOADS_UNAVAILABLE');
  });

  it('is closed to tenants and anonymous callers', async () => {
    await createTestUser({ email: 'tenant@barivara.test' });
    const tenantCookie = await signIn(app, 'tenant@barivara.test');

    const asTenant = await request(app)
      .post(apiPath('/uploads/image'))
      .set('Cookie', tenantCookie)
      .attach('image', Buffer.alloc(64), {
        filename: 'room.webp',
        contentType: 'image/webp',
      });
    expect(asTenant.status).toBe(403);

    const anonymous = await request(app).post(apiPath('/uploads/image'));
    expect(anonymous.status).toBe(401);
  });
});

describe('POST /uploads/images', () => {
  it('uploads a batch and keeps the order', async () => {
    const response = await request(app)
      .post(apiPath('/uploads/images'))
      .set('Cookie', ownerCookie)
      .attach('images', Buffer.alloc(64), {
        filename: 'one.webp',
        contentType: 'image/webp',
      })
      .attach('images', Buffer.alloc(64), {
        filename: 'two.webp',
        contentType: 'image/webp',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveLength(2);
  });
});

describe('destroyImages', () => {
  beforeEach(() => {
    cloudinaryStub.isConfigured = true;
    vi.mocked(cloudinary.api.delete_resources).mockClear();
    vi.mocked(cloudinary.uploader.destroy).mockClear();
    vi.mocked(cloudinary.api.delete_resources).mockResolvedValue({
      deleted: {},
    } as never);
  });

  it('batch-deletes only assets under the upload folder', async () => {
    await destroyImages([
      'bari-vara/flats/a',
      'bari-vara/flats/a',
      'seed/unsplash',
      'someone-else/x',
    ]);

    expect(cloudinary.api.delete_resources).toHaveBeenCalledWith(
      ['bari-vara/flats/a'],
      expect.objectContaining({
        resource_type: 'image',
        type: 'upload',
        invalidate: true,
      }),
    );
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it('falls back to per-asset destroy when the batch API fails', async () => {
    vi.mocked(cloudinary.api.delete_resources).mockRejectedValueOnce(
      new Error('batch failed'),
    );

    await destroyImages(['bari-vara/flats/room']);

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      'bari-vara/flats/room',
      expect.objectContaining({
        resource_type: 'image',
        invalidate: true,
      }),
    );
  });

  it('no-ops when Cloudinary is not configured', async () => {
    cloudinaryStub.isConfigured = false;

    await destroyImages(['bari-vara/flats/room']);

    expect(cloudinary.api.delete_resources).not.toHaveBeenCalled();
  });
});
