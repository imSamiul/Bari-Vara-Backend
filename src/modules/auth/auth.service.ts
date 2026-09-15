import {
  ERROR_CODES,
  type EmailOnlyInput,
  type GoogleLoginInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type UserRole,
  type VerifyEmailInput,
} from '#shared';

import { sendMail } from '../../config/mailer.js';
import {
  buildPasswordResetEmail,
  buildVerificationEmail,
} from '../../emails/otpEmail.js';
import { User } from '../../models/index.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  isGoogleConfigured,
  verifyGoogleIdToken,
  type GoogleProfile,
} from './google.js';
import { issueOtp, verifyOtp } from './otp.service.js';
import { hashPassword, verifyPassword } from './password.js';
import {
  consumeRefreshToken,
  rememberRefreshToken,
  revokeAllRefreshTokens,
} from './tokenStore.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './tokens.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Also used by OTP verification and password reset, which sign the user in. */
export async function issueTokenPair(
  userId: string,
  role: UserRole,
): Promise<TokenPair> {
  const accessToken = signAccessToken(userId, role);
  const { token: refreshToken, jti } = signRefreshToken(userId);

  await rememberRefreshToken(userId, jti);

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email }).lean();

  if (existing) {
    throw ApiError.conflict('That email is already registered', 'EMAIL_TAKEN');
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });

  const otp = await issueOtp('verify-email', user.email, { name: user.name });
  await sendMail({
    to: user.email,
    ...buildVerificationEmail(user.name, otp),
  });

  return user;
}

export async function verifyEmail(input: VerifyEmailInput) {
  const user = await User.findOne({ email: input.email });

  if (!user) {
    throw ApiError.badRequest(
      'That code has expired. Request a new one.',
      ERROR_CODES.otpExpired,
    );
  }

  if (user.isEmailVerified) {
    throw ApiError.badRequest(
      'This email is already verified',
      'ALREADY_VERIFIED',
    );
  }

  await verifyOtp('verify-email', user.email, input.otp);

  user.isEmailVerified = true;
  await user.save();

  return { user, tokens: await issueTokenPair(String(user._id), user.role) };
}

/**
 * Silent about whether the address exists or is already verified, so the
 * endpoint cannot be used to enumerate accounts.
 */
export async function resendVerificationOtp(input: EmailOnlyInput) {
  const user = await User.findOne({ email: input.email });

  if (!user || user.isEmailVerified) return;

  const otp = await issueOtp('verify-email', user.email, { name: user.name });
  await sendMail({
    to: user.email,
    ...buildVerificationEmail(user.name, otp),
  });
}

/** Same non-enumerating contract as resendVerificationOtp. */
export async function requestPasswordReset(input: EmailOnlyInput) {
  const user = await User.findOne({ email: input.email });

  if (!user) return;

  const otp = await issueOtp('reset-password', user.email, { name: user.name });
  await sendMail({
    to: user.email,
    ...buildPasswordResetEmail(user.name, otp),
  });
}

export async function resetPassword(input: ResetPasswordInput) {
  const user = await User.findOne({ email: input.email });

  if (!user) {
    throw ApiError.badRequest(
      'That code has expired. Request a new one.',
      ERROR_CODES.otpExpired,
    );
  }

  await verifyOtp('reset-password', user.email, input.otp);

  user.passwordHash = await hashPassword(input.password);
  // Receiving the code proves control of the address, which is the same thing
  // the verification flow proves.
  user.isEmailVerified = true;
  await user.save();

  // A reset is the standard response to a compromised account, so no session
  // issued before it may survive.
  await revokeAllRefreshTokens(String(user._id));
}

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select(
    '+passwordHash',
  );

  // Social-only accounts have no hash, so they fail the same way as a bad
  // password rather than revealing that the email exists.
  const isValid =
    user?.passwordHash != null &&
    (await verifyPassword(input.password, user.passwordHash));

  if (!user || !isValid) {
    throw ApiError.unauthorized(
      'Email or password is incorrect',
      ERROR_CODES.invalidCredentials,
    );
  }

  if (!user.isEmailVerified) {
    throw ApiError.forbidden(
      'Verify your email before signing in',
      ERROR_CODES.emailNotVerified,
    );
  }

  return { user, tokens: await issueTokenPair(String(user._id), user.role) };
}

/**
 * Signs in with a Google ID token, creating the account on first use or
 * linking to an existing account with the same email.
 */
export async function loginWithGoogle(input: GoogleLoginInput) {
  if (!isGoogleConfigured) {
    throw new ApiError(
      503,
      'Google sign-in is not configured',
      ERROR_CODES.googleNotConfigured,
    );
  }

  let profile: GoogleProfile;

  try {
    profile = await verifyGoogleIdToken(input.credential);
  } catch {
    throw ApiError.unauthorized(
      'Google sign-in failed. Try again.',
      ERROR_CODES.googleTokenInvalid,
    );
  }

  // Linking by email is only safe when Google itself vouches for the address.
  if (!profile.emailVerified) {
    throw ApiError.forbidden(
      'Verify this email with Google before using it to sign in',
      ERROR_CODES.googleEmailUnverified,
    );
  }

  const email = profile.email.toLowerCase();
  // Google photos have no Cloudinary id; the sentinel keeps the schema happy
  // and upload.service ignores anything outside its own folder on destroy.
  const avatar = profile.picture
    ? { url: profile.picture, publicId: `google:${profile.sub}` }
    : null;

  let user = await User.findOne({ googleId: profile.sub });

  if (!user) {
    user = await User.findOne({ email }).select('+passwordHash');

    if (user) {
      // A password on an address nobody has confirmed could have been set by
      // someone squatting on this email before its owner showed up, so it is
      // dropped rather than trusted. The owner can set one via forgot-password.
      if (!user.isEmailVerified) user.passwordHash = undefined;

      user.googleId = profile.sub;
      user.isEmailVerified = true;
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
    } else {
      user = await User.create({
        name: (profile.name ?? email.split('@')[0] ?? email).slice(0, 80),
        email,
        googleId: profile.sub,
        authProvider: 'google',
        isEmailVerified: true,
        avatar,
      });
    }
  }

  return { user, tokens: await issueTokenPair(String(user._id), user.role) };
}

/**
 * Rotates a refresh token. A token that verifies but is no longer in Redis was
 * already used or revoked, which means it leaked, so every session is dropped.
 */
export async function rotateRefreshToken(refreshToken: string) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Session expired', 'REFRESH_TOKEN_INVALID');
  }

  const wasLive = await consumeRefreshToken(payload.sub, payload.jti);

  if (!wasLive) {
    await revokeAllRefreshTokens(payload.sub);
    throw ApiError.unauthorized(
      'Session was revoked. Sign in again.',
      ERROR_CODES.refreshTokenReused,
    );
  }

  // Roles are re-read here so an admin demotion lands on the next rotation.
  const user = await User.findById(payload.sub);

  if (!user) {
    throw ApiError.unauthorized('Session expired', 'REFRESH_TOKEN_INVALID');
  }

  return { user, tokens: await issueTokenPair(String(user._id), user.role) };
}

export async function logoutUser(refreshToken: string | undefined) {
  if (!refreshToken) return;

  try {
    const { sub, jti } = verifyRefreshToken(refreshToken);
    await consumeRefreshToken(sub, jti);
  } catch {
    // An expired or tampered cookie still means the session is over, and the
    // controller clears it either way, so there is nothing to report.
  }
}

export async function getUserById(userId: string) {
  const user = await User.findById(userId);

  if (!user) {
    throw ApiError.unauthorized('Account no longer exists', 'ACCOUNT_MISSING');
  }

  return user;
}
