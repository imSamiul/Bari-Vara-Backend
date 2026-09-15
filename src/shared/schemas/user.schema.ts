import { z } from 'zod';

import {
  OWNER_REQUEST_STATUSES,
  USER_ROLES,
  type OwnerRequestStatus,
  type UserRole,
} from '../constants.js';
import { imageSchema, phoneSchema } from './common.schema.js';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phoneSchema.nullable().optional(),
  address: z.string().trim().min(4).max(200).nullable().optional(),
  avatar: imageSchema.nullable().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export const reviewOwnerRequestSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
});

export const userQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  role: z.enum(USER_ROLES).optional(),
  ownerRequestStatus: z.enum(OWNER_REQUEST_STATUSES).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type ReviewOwnerRequestInput = z.infer<typeof reviewOwnerRequestSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  address: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  ownerRequestStatus: OwnerRequestStatus;
  ownerRating: number;
  createdAt: string;
}
