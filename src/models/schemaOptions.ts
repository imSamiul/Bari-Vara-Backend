import type { SchemaOptions } from 'mongoose';

/**
 * Every model serialises `_id` as `id` and drops internal fields, so controllers
 * can return documents directly and still match the shared response schemas.
 */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  },
};
