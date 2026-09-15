import type {
  BookingQuery,
  CreateBookingInput,
  UpdateBookingStatusInput,
} from '#shared';
import type { QueryFilter } from 'mongoose';

import { Booking, Flat } from '../../models/index.js';
import type { BookingDocument } from '../../models/Booking.js';
import type { FlatDocument } from '../../models/Flat.js';
import type { UserDocument } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { invalidate } from '../../utils/cache.js';
import { FLAT_LIST_CACHE, type Actor } from '../flats/flat.service.js';

interface BookingRelations {
  flat: FlatDocument;
  tenant: UserDocument;
  owner: UserDocument;
}

export type PopulatedBooking = Omit<
  BookingDocument,
  keyof BookingRelations
> &
  BookingRelations;

const RELATIONS = ['flat', 'tenant', 'owner'];

export async function createBooking(
  tenantId: string,
  input: CreateBookingInput,
) {
  const flat = await Flat.findById(input.flatId);

  if (!flat) throw ApiError.notFound('That listing no longer exists');

  if (String(flat.owner) === tenantId) {
    throw ApiError.forbidden(
      'You cannot request a visit to your own listing',
      'CANNOT_BOOK_OWN_FLAT',
    );
  }

  if (flat.status !== 'available') {
    throw ApiError.conflict(
      'That listing has already been taken',
      'FLAT_NOT_AVAILABLE',
    );
  }

  const existing = await Booking.findOne({
    flat: flat._id,
    tenant: tenantId,
    status: { $in: ['pending', 'approved'] },
  });

  if (existing) {
    throw ApiError.conflict(
      'You already have a live request for this listing',
      'BOOKING_ALREADY_EXISTS',
    );
  }

  const booking = await Booking.create({
    flat: flat._id,
    tenant: tenantId,
    owner: flat.owner,
    nid: input.nid,
    visitDate: new Date(input.visitDate),
    ...(input.message ? { message: input.message } : {}),
  });

  return booking.populate<BookingRelations>(RELATIONS);
}

/** `side` decides which end of the booking the caller is looking from. */
export async function listBookings(
  actor: Actor,
  side: 'tenant' | 'owner',
  query: BookingQuery,
) {
  const filter: QueryFilter<BookingDocument> = { [side]: actor.id };

  if (query.status) filter.status = query.status;
  if (query.flatId) filter.flat = query.flatId;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate<BookingRelations>(RELATIONS)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Booking.countDocuments(filter),
  ]);

  return { bookings, total };
}

/**
 * The only owner-side transition: pending becomes approved or rejected, never
 * anything else, and approving takes the flat off the market.
 */
export async function decideBooking(
  bookingId: string,
  actor: Actor,
  input: UpdateBookingStatusInput,
) {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw ApiError.notFound('That request no longer exists');

  if (actor.role !== 'admin' && String(booking.owner) !== actor.id) {
    throw ApiError.forbidden('That request belongs to another owner');
  }

  if (booking.status !== 'pending') {
    throw ApiError.conflict(
      `A ${booking.status} request cannot be changed`,
      'BOOKING_NOT_PENDING',
    );
  }

  booking.status = input.status;
  booking.decidedAt = new Date();
  if (input.ownerNote) booking.ownerNote = input.ownerNote;
  await booking.save();

  // An approval takes the flat off the market, so browse results are now stale.
  if (input.status === 'approved') {
    await Flat.updateOne({ _id: booking.flat }, { status: 'booked' });
    await invalidate(FLAT_LIST_CACHE);
  }

  return booking.populate<BookingRelations>(RELATIONS);
}

/** The only tenant-side transition, and only while the owner has not decided. */
export async function cancelBooking(bookingId: string, actor: Actor) {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw ApiError.notFound('That request no longer exists');

  if (actor.role !== 'admin' && String(booking.tenant) !== actor.id) {
    throw ApiError.forbidden('That request belongs to someone else');
  }

  if (booking.status !== 'pending') {
    throw ApiError.conflict(
      `A ${booking.status} request cannot be cancelled`,
      'BOOKING_NOT_PENDING',
    );
  }

  booking.status = 'cancelled';
  booking.decidedAt = new Date();
  await booking.save();
}
