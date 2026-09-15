import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/requireAuth.js';
import { sendSuccess } from '../../utils/response.js';
import { getOverview } from './stats.service.js';

export const statsRoutes = Router();

statsRoutes.get(
  '/overview',
  requireAuth,
  requireRole('admin'),
  async (_req, res) => {
    sendSuccess(res, 'Platform overview', await getOverview());
  },
);
