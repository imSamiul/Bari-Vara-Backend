import multer from 'multer';

import { ApiError } from '../utils/ApiError.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_REQUEST = 10;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

/**
 * Files are held in memory and streamed straight to Cloudinary, so nothing ever
 * touches the API's disk. Multer is pinned to 2.x; 1.x carries a published
 * vulnerability notice.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_REQUEST },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        ApiError.badRequest(
          `${file.mimetype} is not a supported image type`,
          'UNSUPPORTED_IMAGE_TYPE',
        ),
      );
      return;
    }

    callback(null, true);
  },
});

export const uploadSingleImage = upload.single('image');
export const uploadImageArray = upload.array('images', MAX_IMAGES_PER_REQUEST);
