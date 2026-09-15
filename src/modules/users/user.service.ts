import type {
  PaginationQuery,
  ReviewOwnerRequestInput,
  UpdateProfileInput,
  UpdateUserRoleInput,
  UserQuery,
} from '#shared';
import type { QueryFilter } from 'mongoose';

import { User } from '../../models/index.js';
import type { UserDocument } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { revokeAllRefreshTokens } from '../auth/tokenStore.js';

export async function listUsers(query: UserQuery & PaginationQuery) {
  const filter: QueryFilter<UserDocument> = {};

  if (query.role) filter.role = query.role;
  if (query.ownerRequestStatus) {
    filter.ownerRequestStatus = query.ownerRequestStatus;
  }
  if (query.search) filter.$text = { $search: query.search };

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    User.countDocuments(filter),
  ]);

  return { users, total };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await findUser(userId);
  const { avatar, ...rest } = input;

  user.set(rest);

  // Explicit null clears the photo; undefined leaves it alone.
  if (avatar !== undefined) user.avatar = avatar ?? null;

  await user.save();

  return user;
}

export async function updateUserRole(
  userId: string,
  input: UpdateUserRoleInput,
) {
  const user = await findUser(userId);

  if (user.role === input.role) return user;

  user.role = input.role;
  // Owner status and role are two views of the same fact, so they move together.
  user.ownerRequestStatus = input.role === 'owner' ? 'approved' : 'none';
  await user.save();

  // The access token carries the old role, so every session has to be re-issued.
  await revokeAllRefreshTokens(userId);

  return user;
}

export async function requestOwnerAccess(userId: string) {
  const user = await findUser(userId);

  if (user.role === 'owner' || user.role === 'admin') {
    throw ApiError.conflict('You can already publish listings', 'ALREADY_OWNER');
  }

  if (user.ownerRequestStatus === 'pending') {
    throw ApiError.conflict(
      'Your request is already being reviewed',
      'REQUEST_PENDING',
    );
  }

  // Owners are expected to be reachable by phone before they can list.
  if (!user.phone || !user.address) {
    throw ApiError.badRequest(
      'Add your phone number and address before requesting owner access',
      'PROFILE_INCOMPLETE',
    );
  }

  user.ownerRequestStatus = 'pending';
  await user.save();

  return user;
}

export async function reviewOwnerRequest(
  userId: string,
  input: ReviewOwnerRequestInput,
) {
  const user = await findUser(userId);

  if (user.ownerRequestStatus !== 'pending') {
    throw ApiError.conflict(
      'That account has no request waiting',
      'NO_PENDING_REQUEST',
    );
  }

  user.ownerRequestStatus = input.decision;

  if (input.decision === 'approved') {
    user.role = 'owner';
    await user.save();
    await revokeAllRefreshTokens(userId);
    return user;
  }

  await user.save();

  return user;
}

async function findUser(userId: string) {
  const user = await User.findById(userId);

  if (!user) throw ApiError.notFound('That account no longer exists');

  return user;
}
