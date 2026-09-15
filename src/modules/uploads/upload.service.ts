import type { FlatImage } from '#shared';
import type { UploadApiResponse } from 'cloudinary';
import { Readable } from 'node:stream';

import {
  CLOUDINARY_FOLDER,
  cloudinary,
  isCloudinaryConfigured,
} from '../../config/cloudinary.js';
import { ApiError } from '../../utils/ApiError.js';

/** Only the returned secure_url and public_id are ever stored in MongoDB. */
export async function uploadImage(
  file: Express.Multer.File,
): Promise<FlatImage> {
  if (!isCloudinaryConfigured) {
    throw new ApiError(
      503,
      'Image uploads are not configured on this environment',
      'UPLOADS_UNAVAILABLE',
    );
  }

  let result: UploadApiResponse;

  try {
    result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: CLOUDINARY_FOLDER, resource_type: 'image' },
        (error, response) => {
          if (error || !response) {
            reject(error ?? new Error('Cloudinary returned no response'));
            return;
          }

          resolve(response);
        },
      );

      Readable.from(file.buffer).pipe(stream);
    });
  } catch (error) {
    const message =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : 'Cloudinary upload failed';

    throw new ApiError(502, message, 'CLOUDINARY_UPLOAD_FAILED');
  }

  return { url: result.secure_url, publicId: result.public_id };
}

export function uploadImages(files: Express.Multer.File[]) {
  return Promise.all(files.map(uploadImage));
}

/**
 * Best effort: listing deletes must succeed even when Cloudinary is down, so
 * destroy errors never throw. Only ids under our upload folder are accepted so
 * callers cannot wipe arbitrary assets.
 *
 * Prefer the batch Admin API (with CDN invalidate); fall back to per-asset
 * destroy when the batch call fails.
 */
export async function destroyImages(publicIds: string[]) {
  if (!isCloudinaryConfigured || publicIds.length === 0) return;

  const allowed = [
    ...new Set(
      publicIds.filter(
        (publicId) =>
          publicId === CLOUDINARY_FOLDER ||
          publicId.startsWith(`${CLOUDINARY_FOLDER}/`),
      ),
    ),
  ];

  if (allowed.length === 0) return;

  try {
    await cloudinary.api.delete_resources(allowed, {
      resource_type: 'image',
      type: 'upload',
      invalidate: true,
    });
  } catch (batchError) {
    const results = await Promise.allSettled(
      allowed.map((publicId) =>
        cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
          invalidate: true,
        }),
      ),
    );

    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      console.error(
        `[cloudinary] Failed to destroy ${failed.length}/${allowed.length} images`,
        batchError,
      );
    }
  }
}
