import type { AccessTokenPayload } from '../modules/auth/tokens.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth from the verified access token. */
      auth?: { id: string; role: AccessTokenPayload['role'] };
    }
  }
}
