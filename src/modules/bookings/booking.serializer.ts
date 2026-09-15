import type { PublicBooking } from '#shared';

import type { PopulatedBooking } from './booking.service.js';

export function toPublicBooking(booking: PopulatedBooking): PublicBooking {
  return {
    id: String(booking._id),
    status: booking.status,
    nid: booking.nid,
    visitDate: booking.visitDate.toISOString(),
    message: booking.message ?? null,
    ownerNote: booking.ownerNote ?? null,
    decidedAt: booking.decidedAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    flat: {
      id: String(booking.flat._id),
      title: booking.flat.title,
      monthlyRent: booking.flat.monthlyRent,
      area: booking.flat.address.area,
      imageUrl: booking.flat.images[0]?.url ?? null,
    },
    tenant: {
      id: String(booking.tenant._id),
      name: booking.tenant.name,
      email: booking.tenant.email,
      phone: booking.tenant.phone,
    },
    owner: { id: String(booking.owner._id), name: booking.owner.name },
  };
}
