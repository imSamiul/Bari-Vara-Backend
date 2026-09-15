import { Router } from 'express';

import { authRoutes } from './modules/auth/auth.routes.js';
import { bookingRoutes } from './modules/bookings/booking.routes.js';
import { flatRoutes } from './modules/flats/flat.routes.js';
import { statsRoutes } from './modules/stats/stats.routes.js';
import { uploadRoutes } from './modules/uploads/upload.routes.js';
import { userRoutes } from './modules/users/user.routes.js';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/users', userRoutes);
routes.use('/flats', flatRoutes);
routes.use('/bookings', bookingRoutes);
routes.use('/uploads', uploadRoutes);
routes.use('/stats', statsRoutes);
