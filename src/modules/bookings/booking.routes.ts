import {
  bookingQuerySchema,
  createBookingSchema,
  idParamSchema,
  updateBookingStatusSchema,
} from '#shared';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import * as bookingController from './booking.controller.js';

export const bookingRoutes = Router();

bookingRoutes.use(requireAuth);

bookingRoutes.post(
  '/',
  validate({ body: createBookingSchema }),
  bookingController.create,
);

bookingRoutes.get(
  '/me',
  validate({ query: bookingQuerySchema }),
  bookingController.listMine,
);

bookingRoutes.get(
  '/received',
  requireRole('owner', 'admin'),
  validate({ query: bookingQuerySchema }),
  bookingController.listReceived,
);

bookingRoutes.patch(
  '/:id/status',
  requireRole('owner', 'admin'),
  validate({ params: idParamSchema, body: updateBookingStatusSchema }),
  bookingController.decide,
);

bookingRoutes.delete(
  '/:id',
  validate({ params: idParamSchema }),
  bookingController.cancel,
);
