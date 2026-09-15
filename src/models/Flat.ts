import {
  BANGLADESH_DIVISIONS,
  DHAKA_AREAS,
  FLAT_AMENITIES,
  FLAT_CATEGORIES,
  FLAT_STATUSES,
  type BangladeshDivision,
  type DhakaArea,
  type FlatAmenity,
  type FlatCategory,
  type FlatStatus,
} from '#shared';
import { Schema, model, type Model, type Types } from 'mongoose';

import { baseSchemaOptions } from './schemaOptions.js';

export interface FlatDocument {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: FlatCategory;
  monthlyRent: number;
  serviceCharge: number;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  areaSqft: number;
  availableFrom: Date;
  amenities: FlatAmenity[];
  address: {
    line1: string;
    area: DhakaArea;
    city: string;
    division: BangladeshDivision;
    postcode?: string;
  };
  location: { type: 'Point'; coordinates: [number, number] };
  images: { url: string; publicId: string }[];
  owner: Types.ObjectId;
  status: FlatStatus;
  rating: { average: number; count: number };
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const flatSchema = new Schema<FlatDocument, Model<FlatDocument>>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    category: { type: String, enum: FLAT_CATEGORIES, required: true },
    monthlyRent: { type: Number, required: true, min: 0 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    bedrooms: { type: Number, required: true, min: 1 },
    bathrooms: { type: Number, required: true, min: 1 },
    balconies: { type: Number, default: 0, min: 0 },
    areaSqft: { type: Number, required: true, min: 0 },
    availableFrom: { type: Date, required: true },
    amenities: [{ type: String, enum: FLAT_AMENITIES }],
    address: {
      line1: { type: String, required: true, trim: true },
      area: { type: String, enum: DHAKA_AREAS, required: true },
      city: { type: String, default: 'Dhaka', trim: true },
      division: { type: String, enum: BANGLADESH_DIVISIONS, default: 'Dhaka' },
      postcode: { type: String, trim: true },
    },
    // GeoJSON Point, [longitude, latitude].
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (value: number[]) => value.length === 2,
          message: 'Coordinates must be [longitude, latitude]',
        },
      },
    },
    images: {
      type: [imageSchema],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length > 0 && value.length <= 10,
        message: 'A listing needs between one and ten photos',
      },
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: FLAT_STATUSES,
      default: 'available',
      index: true,
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
  },
  baseSchemaOptions,
);

// Proximity search.
flatSchema.index({ location: '2dsphere' });
// Keyword search across the fields renters actually type into the search box.
flatSchema.index({
  title: 'text',
  description: 'text',
  'address.line1': 'text',
});
// The default browse experience: available listings in an area, newest first.
flatSchema.index({ status: 1, 'address.area': 1, createdAt: -1 });
// Price and rating sorts within the same filtered set.
flatSchema.index({ status: 1, monthlyRent: 1 });
flatSchema.index({ status: 1, 'rating.average': -1 });

export const Flat = model<FlatDocument>('Flat', flatSchema);
