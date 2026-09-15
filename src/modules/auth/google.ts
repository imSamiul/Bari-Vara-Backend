import { OAuth2Client } from 'google-auth-library';

import { env } from '../../config/env.js';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

export const isGoogleConfigured = Boolean(env.GOOGLE_CLIENT_ID);

const client = new OAuth2Client();

/**
 * Verifies the ID token's signature, expiry, issuer and audience against our
 * client id. Throws on any failure; the service maps every throw to a single
 * 401 so nothing about why the token was rejected leaks to the caller.
 *
 * Lives in its own module so tests can mock it and never reach Google.
 */
export async function verifyGoogleIdToken(
  credential: string,
): Promise<GoogleProfile> {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  // The Mongo driver serialises undefined as null, so a missing sub would make
  // findOne({ googleId }) match every account that has none.
  if (!payload?.sub || !payload.email) {
    throw new Error('Google token is missing sub or email');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}
