import type {
  CreateFlatInput,
  FlatQuery,
  FlatSortOption,
  UpdateFlatInput,
  UserRole,
} from '#shared';
import type { QueryFilter, SortOrder } from 'mongoose';

import { Booking, Flat, Review } from '../../models/index.js';
import type { FlatDocument } from '../../models/Flat.js';
import type { UserDocument } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { invalidate } from '../../utils/cache.js';
import { destroyImages } from '../uploads/upload.service.js';
import { refreshOwnerRating } from '../reviews/ratingRollup.js';
import { geocodeAddress } from './geocode.js';

export interface Actor {
  id: string;
  role: UserRole;
}

/** Browse results are cached under this namespace and retired on any write. */
export const FLAT_LIST_CACHE = 'flats:list';

const EARTH_RADIUS_KM = 6378.1;

const SORT_FIELDS: Record<FlatSortOption, Record<string, SortOrder>> = {
  '-createdAt': { createdAt: -1 },
  createdAt: { createdAt: 1 },
  price: { monthlyRent: 1 },
  '-price': { monthlyRent: -1 },
  '-rating': { 'rating.average': -1, 'rating.count': -1 },
};

/**
 * Radius filtering uses $geoWithin rather than $near, because $near cannot be
 * combined with a text search and forces its own sort order.
 */
function buildFilter(query: FlatQuery): QueryFilter<FlatDocument> {
  const filter: QueryFilter<FlatDocument> = {};

  if (query.search) filter.$text = { $search: query.search };
  if (query.category) filter.category = query.category;
  if (query.area) filter['address.area'] = query.area;
  if (query.status) filter.status = query.status;
  if (query.bedrooms) filter.bedrooms = { $gte: query.bedrooms };
  if (query.bathrooms) filter.bathrooms = { $gte: query.bathrooms };
  if (query.amenities?.length) filter.amenities = { $all: query.amenities };
  if (query.availableBefore) {
    filter.availableFrom = { $lte: new Date(query.availableBefore) };
  }

  if (query.minRent !== undefined || query.maxRent !== undefined) {
    filter.monthlyRent = {
      ...(query.minRent !== undefined ? { $gte: query.minRent } : {}),
      ...(query.maxRent !== undefined ? { $lte: query.maxRent } : {}),
    };
  }

  if (query.lat !== undefined && query.lng !== undefined) {
    filter.location = {
      $geoWithin: {
        $centerSphere: [[query.lng, query.lat], query.radiusKm / EARTH_RADIUS_KM],
      },
    };
  }

  return filter;
}

export async function listFlats(query: FlatQuery, ownerId?: string) {
  const filter = buildFilter(query);

  if (ownerId) filter.owner = ownerId;

  const [flats, total] = await Promise.all([
    Flat.find(filter)
      .sort(SORT_FIELDS[query.sort])
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Flat.countDocuments(filter),
  ]);

  return { flats, total };
}

export async function getFlatWithOwner(flatId: string) {
  const flat = await Flat.findById(flatId).populate<{ owner: UserDocument }>(
    'owner',
  );

  if (!flat) throw ApiError.notFound('That listing no longer exists');

  return flat;
}

export async function createFlat(ownerId: string, input: CreateFlatInput) {
  const coordinates = input.coordinates ?? geocodeAddress(input.address);

  const flat = await Flat.create({
    ...input,
    availableFrom: new Date(input.availableFrom),
    location: { type: 'Point' as const, coordinates },
    owner: ownerId,
  });

  await invalidate(FLAT_LIST_CACHE);

  return flat;
}

export async function updateFlat(
  flatId: string,
  actor: Actor,
  input: UpdateFlatInput,
) {
  const flat = await Flat.findById(flatId);

  if (!flat) throw ApiError.notFound('That listing no longer exists');
  assertCanManage(flat, actor);

  const { coordinates, address, availableFrom, images, ...rest } = input;

  flat.set(rest);

  // Partial only applies to the top level, so a supplied address is complete.
  if (address) flat.address = address;
  if (availableFrom) flat.availableFrom = new Date(availableFrom);

  // A moved listing needs a new pin, unless the client supplied one.
  if (coordinates) {
    flat.location = { type: 'Point', coordinates };
  } else if (address) {
    flat.location = { type: 'Point', coordinates: geocodeAddress(flat.address) };
  }

  if (images) {
    const removed = flat.images
      .filter((image) => !images.some((next) => next.publicId === image.publicId))
      .map((image) => image.publicId);

    flat.images = images;
    await destroyImages(removed);
  }

  await flat.save();
  await invalidate(FLAT_LIST_CACHE);

  return flat;
}

export async function deleteFlat(flatId: string, actor: Actor) {
  const flat = await Flat.findById(flatId);

  if (!flat) throw ApiError.notFound('That listing no longer exists');
  assertCanManage(flat, actor);

  const ownerId = String(flat.owner);
  const publicIds = flat.images.map((image) => image.publicId);

  // Drop Cloudinary assets first so a crash after Mongo delete cannot orphan them.
  // destroyImages never throws — listing removal must still succeed if Cloudinary is down.
  await destroyImages(publicIds);

  // Reviews and bookings only exist in the context of their flat, so they go too
  // rather than becoming unreachable rows.
  await Promise.all([
    Review.deleteMany({ flat: flat._id }),
    Booking.deleteMany({ flat: flat._id }),
    Flat.deleteOne({ _id: flat._id }),
  ]);

  await Promise.all([
    refreshOwnerRating(ownerId),
    invalidate(FLAT_LIST_CACHE),
  ]);
}

/** Owners manage only their own listings; admins manage every listing. */
export function assertCanManage(flat: FlatDocument, actor: Actor) {
  if (actor.role === 'admin') return;

  if (String(flat.owner) !== actor.id) {
    throw ApiError.forbidden('That listing belongs to another owner');
  }
}
