import { z } from 'zod';

import { BOOKING_STATUSES } from '../constants.js';
import {
  isoDateSchema,
  objectIdSchema,
  paginationQuerySchema,
} from './common.schema.js';

export const createBookingSchema = z.object({
  flatId: objectIdSchema,
  nid: z
    .string()
    .regex(/^\d{10}$|^\d{13}$|^\d{17}$/, 'NID must be 10, 13 or 17 digits'),
  visitDate: isoDateSchema,
  message: z.string().trim().max(500).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  ownerNote: z.string().trim().max(500).optional(),
});

export const bookingQuerySchema = paginationQuerySchema.extend({
  status: z.enum(BOOKING_STATUSES).optional(),
  flatId: objectIdSchema.optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type BookingQuery = z.infer<typeof bookingQuerySchema>;

export interface PublicBooking {
  id: string;
  status: (typeof BOOKING_STATUSES)[number];
  nid: string;
  visitDate: string;
  message: string | null;
  ownerNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  flat: {
    id: string;
    title: string;
    monthlyRent: number;
    area: string;
    imageUrl: string | null;
  };
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  owner: {
    id: string;
    name: string;
  };
}
