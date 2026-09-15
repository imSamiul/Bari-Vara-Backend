import type {
  BookingQuery,
  CreateBookingInput,
  UpdateBookingStatusInput,
} from '#shared';
import type { RequestHandler } from 'express';

import { authContext } from '../../middleware/requireAuth.js';
import { validatedQuery } from '../../middleware/validate.js';
import { buildPagination, sendSuccess } from '../../utils/response.js';
import * as bookingService from './booking.service.js';
import { toPublicBooking } from './booking.serializer.js';

export const create: RequestHandler<
  Record<string, string>,
  unknown,
  CreateBookingInput
> = async (req, res) => {
  const booking = await bookingService.createBooking(
    authContext(req).id,
    req.body,
  );

  sendSuccess(res, 'Visit requested', toPublicBooking(booking), 201);
};

function listFor(side: 'tenant' | 'owner'): RequestHandler {
  return async (req, res) => {
    const query = validatedQuery<BookingQuery>(req);
    const { bookings, total } = await bookingService.listBookings(
      authContext(req),
      side,
      query,
    );

    sendSuccess(
      res,
      `${total} requests`,
      bookings.map(toPublicBooking),
      200,
      buildPagination(query.page, query.limit, total),
    );
  };
}

/** Requests the caller has made. */
export const listMine = listFor('tenant');

/** Requests made against the caller's listings. */
export const listReceived = listFor('owner');

export const decide: RequestHandler<
  { id: string },
  unknown,
  UpdateBookingStatusInput
> = async (req, res) => {
  const booking = await bookingService.decideBooking(
    req.params.id,
    authContext(req),
    req.body,
  );

  sendSuccess(res, `Request ${booking.status}`, toPublicBooking(booking));
};

export const cancel: RequestHandler<{ id: string }> = async (req, res) => {
  await bookingService.cancelBooking(req.params.id, authContext(req));

  sendSuccess(res, 'Request cancelled', null);
};
