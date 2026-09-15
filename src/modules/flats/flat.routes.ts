import {
  createFlatSchema,
  flatQuerySchema,
  idParamSchema,
  updateFlatSchema,
} from '#shared';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { flatReviewRoutes } from '../reviews/review.routes.js';
import * as flatController from './flat.controller.js';

export const flatRoutes = Router();

// Must be declared before /:id or "mine" is read as an id.
flatRoutes.get(
  '/mine',
  requireAuth,
  requireRole('owner', 'admin'),
  validate({ query: flatQuerySchema }),
  flatController.listMine,
);

flatRoutes.get('/', validate({ query: flatQuerySchema }), flatController.list);

flatRoutes.post(
  '/',
  requireAuth,
  requireRole('owner', 'admin'),
  validate({ body: createFlatSchema }),
  flatController.create,
);

flatRoutes.get(
  '/:id',
  validate({ params: idParamSchema }),
  flatController.detail,
);

flatRoutes.patch(
  '/:id',
  requireAuth,
  requireRole('owner', 'admin'),
  validate({ params: idParamSchema, body: updateFlatSchema }),
  flatController.update,
);

flatRoutes.delete(
  '/:id',
  requireAuth,
  requireRole('owner', 'admin'),
  validate({ params: idParamSchema }),
  flatController.remove,
);

flatRoutes.use('/:id/reviews', flatReviewRoutes);
