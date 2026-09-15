import {
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '#shared';
import { Router } from 'express';

import { authLimiter } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import * as authController from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

authRoutes.post(
  '/verify-otp',
  authLimiter,
  validate({ body: verifyEmailSchema }),
  authController.verifyOtp,
);

authRoutes.post(
  '/resend-otp',
  authLimiter,
  validate({ body: emailOnlySchema }),
  authController.resendOtp,
);

authRoutes.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

authRoutes.post(
  '/forgot-password',
  authLimiter,
  validate({ body: emailOnlySchema }),
  authController.forgotPassword,
);

authRoutes.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', requireAuth, authController.me);
