import type { FlatImage } from '#shared';
import type { UploadApiResponse } from 'cloudinary';
import { Readable } from 'node:stream';

import {
  CLOUDINARY_FOLDER,
  cloudinary,
  isCloudinaryConfigured,
} from '../../config/cloudinary.js';
import { logger } from '../../config/logger.js';
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

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
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

  return { url: result.secure_url, publicId: result.public_id };
}

export function uploadImages(files: Express.Multer.File[]) {
  return Promise.all(files.map(uploadImage));
}

/**
 * Best effort: a listing that has already been deleted from MongoDB must not be
 * resurrected by a Cloudinary failure, so the error is logged and swallowed.
 */
export async function destroyImages(publicIds: string[]) {
  if (!isCloudinaryConfigured || publicIds.length === 0) return;

  const results = await Promise.allSettled(
    publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)),
  );

  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      logger.warn(
        { err: result.reason, publicId: publicIds[index] },
        'Could not delete image from Cloudinary',
      );
    }
  }
}
