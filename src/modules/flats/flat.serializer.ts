import type { FlatDetail, FlatSummary } from '#shared';

import type { FlatDocument } from '../../models/Flat.js';
import type { UserDocument } from '../../models/User.js';

/** Accepts a populated document too, where `owner` is the user rather than an id. */
type FlatFields = Omit<FlatDocument, 'owner'>;

export function toFlatSummary(flat: FlatFields): FlatSummary {
  return {
    id: String(flat._id),
    title: flat.title,
    category: flat.category,
    monthlyRent: flat.monthlyRent,
    bedrooms: flat.bedrooms,
    bathrooms: flat.bathrooms,
    areaSqft: flat.areaSqft,
    status: flat.status,
    address: {
      line1: flat.address.line1,
      area: flat.address.area,
      city: flat.address.city,
      division: flat.address.division,
      ...(flat.address.postcode ? { postcode: flat.address.postcode } : {}),
    },
    coordinates: flat.location.coordinates,
    images: flat.images.map((image) => ({
      url: image.url,
      publicId: image.publicId,
    })),
    rating: { average: flat.rating.average, count: flat.rating.count },
    availableFrom: flat.availableFrom.toISOString(),
    createdAt: flat.createdAt.toISOString(),
  };
}

export function toFlatDetail(
  flat: FlatFields,
  owner: UserDocument,
): FlatDetail {
  return {
    ...toFlatSummary(flat),
    description: flat.description,
    serviceCharge: flat.serviceCharge,
    balconies: flat.balconies,
    amenities: flat.amenities,
    owner: {
      id: String(owner._id),
      name: owner.name,
      avatarUrl: owner.avatar?.url ?? null,
      phone: owner.phone,
      ownerRating: owner.ownerRating.average,
    },
    updatedAt: flat.updatedAt.toISOString(),
  };
}
