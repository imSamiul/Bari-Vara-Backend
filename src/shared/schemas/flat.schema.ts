import { z } from 'zod';

import {
  BANGLADESH_DIVISIONS,
  DHAKA_AREAS,
  FLAT_AMENITIES,
  FLAT_CATEGORIES,
  FLAT_SORT_OPTIONS,
  FLAT_STATUSES,
} from '../constants.js';
import {
  imageSchema,
  isoDateSchema,
  objectIdSchema,
  paginationQuerySchema,
} from './common.schema.js';

export const flatAddressSchema = z.object({
  line1: z.string().trim().min(4).max(160),
  area: z.enum(DHAKA_AREAS),
  city: z.string().trim().min(2).max(80).default('Dhaka'),
  division: z.enum(BANGLADESH_DIVISIONS).default('Dhaka'),
  postcode: z.string().trim().min(4).max(10).optional(),
});

export type FlatAddress = z.infer<typeof flatAddressSchema>;

export const createFlatSchema = z.object({
  title: z.string().trim().min(8).max(120),
  description: z.string().trim().min(20).max(4000),
  category: z.enum(FLAT_CATEGORIES),
  monthlyRent: z.coerce.number().int().positive(),
  serviceCharge: z.coerce.number().int().min(0).default(0),
  bedrooms: z.coerce.number().int().min(1).max(12),
  bathrooms: z.coerce.number().int().min(1).max(12),
  balconies: z.coerce.number().int().min(0).max(8).default(0),
  areaSqft: z.coerce.number().int().positive(),
  availableFrom: isoDateSchema,
  amenities: z.array(z.enum(FLAT_AMENITIES)).default([]),
  address: flatAddressSchema,
  images: z.array(imageSchema).min(1).max(10),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
});

export const updateFlatSchema = createFlatSchema.partial();

export const flatQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  category: z.enum(FLAT_CATEGORIES).optional(),
  area: z.enum(DHAKA_AREAS).optional(),
  status: z.enum(FLAT_STATUSES).optional(),
  bedrooms: z.coerce.number().int().min(1).optional(),
  bathrooms: z.coerce.number().int().min(1).optional(),
  amenities: z
    .union([z.enum(FLAT_AMENITIES), z.array(z.enum(FLAT_AMENITIES))])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional(),
  availableBefore: isoDateSchema.optional(),
  minRent: z.coerce.number().int().min(0).optional(),
  maxRent: z.coerce.number().int().min(0).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().positive().default(5),
  sort: z.enum(FLAT_SORT_OPTIONS).default('-createdAt'),
  ownerId: objectIdSchema.optional(),
});

export type CreateFlatInput = z.infer<typeof createFlatSchema>;
export type UpdateFlatInput = z.infer<typeof updateFlatSchema>;
export type FlatQuery = z.infer<typeof flatQuerySchema>;

export interface FlatSummary {
  id: string;
  title: string;
  category: CreateFlatInput['category'];
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  status: (typeof FLAT_STATUSES)[number];
  address: FlatAddress;
  coordinates: [number, number];
  images: z.infer<typeof imageSchema>[];
  rating: { average: number; count: number };
  availableFrom: string;
  createdAt: string;
}

export interface FlatDetail extends FlatSummary {
  description: string;
  serviceCharge: number;
  balconies: number;
  amenities: CreateFlatInput['amenities'];
  owner: {
    id: string;
    name: string;
    avatarUrl: string | null;
    phone: string | null;
    ownerRating: number;
  };
  updatedAt: string;
}
