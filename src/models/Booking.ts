import { BOOKING_STATUSES, type BookingStatus } from '#shared';
import { Schema, model, type Model, type Types } from 'mongoose';

import { baseSchemaOptions } from './schemaOptions.js';

export interface BookingDocument {
  _id: Types.ObjectId;
  flat: Types.ObjectId;
  tenant: Types.ObjectId;
  /** Denormalised so owners can query their queue without joining through flats. */
  owner: Types.ObjectId;
  status: BookingStatus;
  nid: string;
  visitDate: Date;
  message?: string;
  ownerNote?: string;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<BookingDocument, Model<BookingDocument>>(
  {
    flat: {
      type: Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true,
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending',
      index: true,
    },
    nid: { type: String, required: true, trim: true },
    visitDate: { type: Date, required: true },
    message: { type: String, trim: true, maxlength: 1000 },
    ownerNote: { type: String, trim: true, maxlength: 500 },
    decidedAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

/**
 * A tenant may only have one live request per flat. Rejected and cancelled
 * requests are excluded so they can apply again later.
 */
bookingSchema.index(
  { flat: 1, tenant: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'approved'] } },
  },
);

// Owner queue and tenant history, both newest first.
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
bookingSchema.index({ tenant: 1, createdAt: -1 });

export const Booking = model<BookingDocument>('Booking', bookingSchema);
