import {
  createReviewSchema,
  idParamSchema,
  paginationQuerySchema,
} from '#shared';
import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import * as reviewController from './review.controller.js';

/** Mounted under /flats/:id, so the flat id arrives through the parent params. */
export const flatReviewRoutes = Router({ mergeParams: true });

flatReviewRoutes.get(
  '/',
  validate({ params: idParamSchema, query: paginationQuerySchema }),
  reviewController.list,
);

flatReviewRoutes.post(
  '/',
  requireAuth,
  validate({ params: idParamSchema, body: createReviewSchema }),
  reviewController.save,
);
