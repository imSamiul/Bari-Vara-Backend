import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/requireAuth.js';
import { uploadImageArray, uploadSingleImage } from '../../middleware/upload.js';
import * as uploadController from './upload.controller.js';

export const uploadRoutes = Router();

// Only accounts that can own listings have a reason to push images to our CDN.
uploadRoutes.use(requireAuth, requireRole('owner', 'admin'));

uploadRoutes.post('/image', uploadSingleImage, uploadController.uploadOne);
uploadRoutes.post('/images', uploadImageArray, uploadController.uploadMany);
