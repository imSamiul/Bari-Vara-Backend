import { Schema, model, type Model, type Types } from 'mongoose';

import { baseSchemaOptions } from './schemaOptions.js';

export const OTP_PURPOSES = ['verify-email', 'reset-password'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/**
 * Dev/test mirror of live OTP codes. Verification still uses the Redis digest;
 * this collection exists so you can look up a code by email or name in Compass.
 * Never written in production.
 */
export interface OtpDocument {
  _id: Types.ObjectId;
  email: string;
  name: string;
  purpose: OtpPurpose;
  /** Plain 6-digit code — only stored outside production. */
  code: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<OtpDocument, Model<OtpDocument>>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, index: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    code: { type: String, required: true, minlength: 6, maxlength: 6 },
    expiresAt: { type: Date, required: true },
  },
  baseSchemaOptions,
);

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
// Mongo drops the row once expiresAt passes — same window as Redis OTP TTL.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = model<OtpDocument>('Otp', otpSchema);
