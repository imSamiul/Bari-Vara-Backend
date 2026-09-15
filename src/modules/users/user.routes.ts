import {
  idParamSchema,
  paginationQuerySchema,
  reviewOwnerRequestSchema,
  updateProfileSchema,
  updateUserRoleSchema,
  userQuerySchema,
} from '#shared';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import * as userController from './user.controller.js';

export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  userController.updateMyProfile,
);

userRoutes.post('/me/owner-request', userController.requestOwnerAccess);

userRoutes.get(
  '/',
  requireRole('admin'),
  validate({ query: userQuerySchema.extend(paginationQuerySchema.shape) }),
  userController.list,
);

userRoutes.patch(
  '/:id/role',
  requireRole('admin'),
  validate({ params: idParamSchema, body: updateUserRoleSchema }),
  userController.updateRole,
);

userRoutes.patch(
  '/:id/owner-request',
  requireRole('admin'),
  validate({ params: idParamSchema, body: reviewOwnerRequestSchema }),
  userController.reviewOwnerRequest,
);
