import type {
  EmailOnlyInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '#shared';
import type { RequestHandler } from 'express';

import { authContext } from '../../middleware/requireAuth.js';
import { ApiError } from '../../utils/ApiError.js';
import { sendSuccess } from '../../utils/response.js';
import { toPublicUser } from '../users/user.serializer.js';
import * as authService from './auth.service.js';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './cookies.js';

export const register: RequestHandler<never, unknown, RegisterInput> = async (
  req,
  res,
) => {
  const user = await authService.registerUser(req.body);

  // 202: the account exists but cannot be used until the OTP is confirmed.
  sendSuccess(
    res,
    'Account created. Check your email for the verification code.',
    { email: user.email },
    202,
  );
};

export const verifyOtp: RequestHandler<
  never,
  unknown,
  VerifyEmailInput
> = async (req, res) => {
  const { user, tokens } = await authService.verifyEmail(req.body);

  // Verifying is the last step of signing up, so it also signs the user in.
  setAuthCookies(res, tokens);
  sendSuccess(res, 'Email verified', toPublicUser(user));
};

export const resendOtp: RequestHandler<never, unknown, EmailOnlyInput> = async (
  req,
  res,
) => {
  await authService.resendVerificationOtp(req.body);

  sendSuccess(
    res,
    'If that account needs verifying, a new code is on its way',
    null,
  );
};

export const forgotPassword: RequestHandler<
  never,
  unknown,
  EmailOnlyInput
> = async (req, res) => {
  await authService.requestPasswordReset(req.body);

  sendSuccess(res, 'If that account exists, a reset code is on its way', null);
};

export const resetPassword: RequestHandler<
  never,
  unknown,
  ResetPasswordInput
> = async (req, res) => {
  await authService.resetPassword(req.body);

  // Every session was revoked, so the browser must not keep a dead cookie pair.
  clearAuthCookies(res);
  sendSuccess(res, 'Password updated. Sign in with your new password.', null);
};

export const login: RequestHandler<never, unknown, LoginInput> = async (
  req,
  res,
) => {
  const { user, tokens } = await authService.loginUser(req.body);

  setAuthCookies(res, tokens);
  sendSuccess(res, 'Signed in', toPublicUser(user));
};

export const refresh: RequestHandler = async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Sign in to continue');
  }

  try {
    const { user, tokens } = await authService.rotateRefreshToken(refreshToken);

    setAuthCookies(res, tokens);
    sendSuccess(res, 'Session refreshed', toPublicUser(user));
  } catch (error) {
    // A failed rotation must not leave the browser holding a dead cookie pair,
    // or the web middleware retries the refresh on every navigation.
    clearAuthCookies(res);
    throw error;
  }
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logoutUser(req.cookies?.[REFRESH_COOKIE]);

  clearAuthCookies(res);
  sendSuccess(res, 'Signed out', null);
};

export const me: RequestHandler = async (req, res) => {
  const user = await authService.getUserById(authContext(req).id);

  sendSuccess(res, 'Current user', toPublicUser(user));
};
