import type { PublicUser } from '#shared';

import type { UserDocument } from '../../models/User.js';

/** The only shape user data leaves the API in. Never includes passwordHash. */
export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatar?.url ?? null,
    isEmailVerified: user.isEmailVerified,
    ownerRequestStatus: user.ownerRequestStatus,
    ownerRating: user.ownerRating.average,
    createdAt: user.createdAt.toISOString(),
  };
}
