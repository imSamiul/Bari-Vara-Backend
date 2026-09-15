import type { DhakaArea } from '#shared';
import dayjs from 'dayjs';

import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Booking, Flat, Review, User } from '../models/index.js';
import { hashPassword } from '../modules/auth/password.js';
import { AREA_CENTROIDS } from '../modules/flats/geocode.js';
import {
  refreshFlatRating,
  refreshOwnerRating,
} from '../modules/reviews/ratingRollup.js';
import { SEED_FLATS, SEED_REVIEWS } from './seedData.js';

const DEMO_PASSWORD = 'Password123';

const DEMO_USERS = [
  {
    name: 'Samiul Admin',
    email: 'admin@barivara.dev',
    role: 'admin' as const,
    phone: '01711000001',
    address: 'House 3, Road 5, Banani, Dhaka',
  },
  {
    name: 'Rahim Uddin',
    email: 'owner@barivara.dev',
    role: 'owner' as const,
    phone: '01711000002',
    address: 'House 42, Road 11, Gulshan 2, Dhaka',
  },
  {
    name: 'Nusrat Jahan',
    email: 'owner2@barivara.dev',
    role: 'owner' as const,
    phone: '01711000003',
    address: 'House 19, Road 12, Sector 7, Uttara, Dhaka',
  },
  {
    name: 'Tanvir Hasan',
    email: 'tenant@barivara.dev',
    role: 'user' as const,
    phone: '01711000004',
    address: 'House 8, Road 9/A, Dhanmondi, Dhaka',
  },
  {
    name: 'Farhana Akter',
    email: 'tenant2@barivara.dev',
    role: 'user' as const,
    phone: '01711000005',
    address: '12 Indira Road, Farmgate, Dhaka',
  },
];

function unsplashUrl(photoId: string) {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=80`;
}

/** Spreads seed listings around an area centre instead of stacking them. */
function jitterAroundArea(area: DhakaArea, index: number): [number, number] {
  const [lng, lat] = AREA_CENTROIDS[area];
  const offset = 0.004;
  const angle = (index * 2 * Math.PI) / 5;

  return [
    Number((lng + Math.cos(angle) * offset).toFixed(6)),
    Number((lat + Math.sin(angle) * offset).toFixed(6)),
  ];
}

async function seed() {
  await connectDatabase();

  await Promise.all([
    Review.deleteMany({}),
    Booking.deleteMany({}),
    Flat.deleteMany({}),
    User.deleteMany({}),
  ]);
  logger.info('Cleared existing collections');

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const users = await User.create(
    DEMO_USERS.map((user) => ({
      ...user,
      passwordHash,
      isEmailVerified: true,
      ownerRequestStatus:
        user.role === 'owner' ? ('approved' as const) : ('none' as const),
    })),
  );

  const owners = users.filter((user) => user.role === 'owner');
  const tenants = users.filter((user) => user.role === 'user');
  const [firstOwner, secondOwner] = owners;
  const [firstTenant, secondTenant] = tenants;

  if (!firstOwner || !secondOwner || !firstTenant || !secondTenant) {
    throw new Error('Seed users are misconfigured');
  }

  logger.info(`Created ${users.length} users`);

  const flats = await Flat.create(
    SEED_FLATS.map((flat, index) => ({
      title: flat.title,
      description: flat.description,
      category: flat.category,
      monthlyRent: flat.monthlyRent,
      serviceCharge: flat.serviceCharge,
      bedrooms: flat.bedrooms,
      bathrooms: flat.bathrooms,
      balconies: flat.balconies,
      areaSqft: flat.areaSqft,
      availableFrom: dayjs()
        .add(flat.availableInDays, 'day')
        .startOf('day')
        .toDate(),
      amenities: flat.amenities,
      address: {
        line1: flat.line1,
        area: flat.area,
        city: 'Dhaka',
        division: 'Dhaka' as const,
        postcode: flat.postcode,
      },
      location: {
        type: 'Point' as const,
        coordinates: jitterAroundArea(flat.area, index),
      },
      images: flat.photos.map((photoId) => ({
        url: unsplashUrl(photoId),
        publicId: `seed/${photoId}`,
      })),
      // Alternate owners so both owner dashboards have data.
      owner: index % 2 === 0 ? firstOwner._id : secondOwner._id,
    })),
  );

  logger.info(`Created ${flats.length} flats`);

  const reviews = await Review.create(
    SEED_REVIEWS.map((review, index) => {
      const flat = flats[review.flatIndex];
      if (!flat)
        throw new Error(
          `Seed review points at missing flat ${review.flatIndex}`,
        );

      return {
        flat: flat._id,
        // Alternate authors so the unique (flat, author) index is respected.
        author: index % 2 === 0 ? firstTenant._id : secondTenant._id,
        owner: flat.owner,
        flatRating: review.flatRating,
        ownerRating: review.ownerRating,
        comment: review.comment,
      };
    }),
  );

  logger.info(`Created ${reviews.length} reviews`);

  const [pendingFlat, approvedFlat] = [flats[2], flats[4]];
  if (!pendingFlat || !approvedFlat)
    throw new Error('Seed flats are misconfigured');

  await Booking.create([
    {
      flat: pendingFlat._id,
      tenant: firstTenant._id,
      owner: pendingFlat.owner,
      status: 'pending' as const,
      nid: '1234567890',
      visitDate: dayjs().add(2, 'day').startOf('day').toDate(),
      message:
        'Could I see the flat on Friday afternoon? I can come any time after 2pm.',
    },
    {
      flat: approvedFlat._id,
      tenant: secondTenant._id,
      owner: approvedFlat.owner,
      status: 'approved' as const,
      nid: '9876543210987',
      visitDate: dayjs().subtract(3, 'day').startOf('day').toDate(),
      ownerNote:
        'Visited and confirmed. Agreement signed for the first of next month.',
      decidedAt: dayjs().subtract(2, 'day').toDate(),
    },
  ]);

  // An approved booking takes the flat off the market.
  await Flat.updateOne({ _id: approvedFlat._id }, { status: 'booked' });

  // Rollups are stored on the documents so listing pages never aggregate reviews.
  await Promise.all([
    ...new Set(reviews.map((review) => String(review.flat))),
  ].map(refreshFlatRating));
  await Promise.all(
    [...new Set(reviews.map((review) => String(review.owner)))].map(
      refreshOwnerRating,
    ),
  );

  logger.info('Created 2 bookings');
  logger.info(
    `Seed complete. Sign in with any of ${DEMO_USERS.map((u) => u.email).join(', ')} using password ${DEMO_PASSWORD}`,
  );

  await disconnectDatabase();
}

seed().catch(async (error) => {
  logger.error({ err: error }, 'Seed failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
