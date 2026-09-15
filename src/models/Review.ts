import { Schema, model, type Model, type Types } from 'mongoose';

import { baseSchemaOptions } from './schemaOptions.js';

export interface ReviewDocument {
  _id: Types.ObjectId;
  flat: Types.ObjectId;
  author: Types.ObjectId;
  /** Denormalised so owner rating rollups do not need to join through flats. */
  owner: Types.ObjectId;
  flatRating: number;
  ownerRating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument, Model<ReviewDocument>>(
  {
    flat: {
      type: Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true,
    },
    author: {
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
    flatRating: { type: Number, required: true, min: 1, max: 5 },
    ownerRating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  baseSchemaOptions,
);

// One review per flat per person; editing replaces the existing one.
reviewSchema.index({ flat: 1, author: 1 }, { unique: true });
reviewSchema.index({ flat: 1, createdAt: -1 });

export const Review = model<ReviewDocument>('Review', reviewSchema);
