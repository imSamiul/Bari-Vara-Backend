import {
  AUTH_PROVIDERS,
  OWNER_REQUEST_STATUSES,
  USER_ROLES,
  type AuthProvider,
  type OwnerRequestStatus,
  type UserRole,
} from '#shared';
import { Schema, model, type Model, type Types } from 'mongoose';

import { baseSchemaOptions } from './schemaOptions.js';

export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  email: string;
  /** Always a bcrypt digest. Hashing lives in modules/auth/password.ts. */
  passwordHash?: string;
  /** Google's stable subject id, set once the account is linked to Google. */
  googleId?: string;
  role: UserRole;
  authProvider: AuthProvider;
  phone: string | null;
  address: string | null;
  avatar: { url: string; publicId: string } | null;
  isEmailVerified: boolean;
  ownerRequestStatus: OwnerRequestStatus;
  ownerRating: { average: number; count: number };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument, Model<UserDocument>>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Absent for accounts created through a social provider.
    passwordHash: { type: String, select: false },
    // Sparse so the many accounts without one do not collide on null.
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: USER_ROLES, default: 'user', index: true },
    authProvider: { type: String, enum: AUTH_PROVIDERS, default: 'local' },
    phone: { type: String, default: null, trim: true },
    address: { type: String, default: null, trim: true },
    avatar: {
      type: new Schema(
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    isEmailVerified: { type: Boolean, default: false },
    ownerRequestStatus: {
      type: String,
      enum: OWNER_REQUEST_STATUSES,
      default: 'none',
      index: true,
    },
    ownerRating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
  },
  baseSchemaOptions,
);

// Supports the admin user list, which searches by name or email.
userSchema.index({ name: 'text', email: 'text' });

export const User = model<UserDocument>('User', userSchema);
