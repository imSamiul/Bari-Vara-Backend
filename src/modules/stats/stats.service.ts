import {
  BOOKING_STATUSES,
  DHAKA_AREAS,
  FLAT_CATEGORIES,
  type BookingStatus,
  type DhakaArea,
  type FlatCategory,
  type StatsOverview,
} from '#shared';
import dayjs from 'dayjs';

import { Booking, Flat, Review, User } from '../../models/index.js';

const MONTHS_OF_HISTORY = 12;

interface CountByKey<TKey> {
  _id: TKey;
  count: number;
}

interface AreaBucket extends CountByKey<DhakaArea> {
  averageRent: number;
}

interface MonthBucket {
  _id: string;
  count: number;
}

/**
 * One request feeds the whole analytics page. Every series is aggregated in
 * MongoDB rather than counted in JavaScript, and gap-filled here so the charts
 * always get a complete, ordered axis.
 */
export async function getOverview(): Promise<StatsOverview> {
  const since = dayjs()
    .subtract(MONTHS_OF_HISTORY - 1, 'month')
    .startOf('month')
    .toDate();

  const [
    users,
    owners,
    flats,
    availableFlats,
    bookings,
    pendingBookings,
    reviews,
    rentStats,
    bookingsByStatus,
    flatsByCategory,
    flatsByArea,
    signupsByMonth,
    listingsByMonth,
    bookingsByMonth,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'owner' }),
    Flat.countDocuments(),
    Flat.countDocuments({ status: 'available' }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'pending' }),
    Review.countDocuments(),
    Flat.aggregate<{ _id: null; averageRent: number }>([
      { $group: { _id: null, averageRent: { $avg: '$monthlyRent' } } },
    ]),
    Booking.aggregate<CountByKey<BookingStatus>>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Flat.aggregate<CountByKey<FlatCategory>>([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    Flat.aggregate<AreaBucket>([
      {
        $group: {
          _id: '$address.area',
          count: { $sum: 1 },
          averageRent: { $avg: '$monthlyRent' },
        },
      },
    ]),
    countByMonth(User, since),
    countByMonth(Flat, since),
    countByMonth(Booking, since),
  ]);

  return {
    totals: {
      users,
      owners,
      flats,
      availableFlats,
      bookings,
      pendingBookings,
      reviews,
      averageRent: Math.round(rentStats[0]?.averageRent ?? 0),
    },
    bookingsByStatus: BOOKING_STATUSES.map((status) => ({
      status,
      count: findCount(bookingsByStatus, status),
    })),
    flatsByCategory: FLAT_CATEGORIES.map((category) => ({
      category,
      count: findCount(flatsByCategory, category),
    })),
    flatsByArea: DHAKA_AREAS.map((area) => {
      const bucket = flatsByArea.find((entry) => entry._id === area);

      return {
        area,
        count: bucket?.count ?? 0,
        averageRent: Math.round(bucket?.averageRent ?? 0),
      };
    }),
    monthlyActivity: lastMonths().map((month) => ({
      month,
      signups: findCount(signupsByMonth, month),
      listings: findCount(listingsByMonth, month),
      bookings: findCount(bookingsByMonth, month),
    })),
  };
}

function countByMonth(
  model: typeof User | typeof Flat | typeof Booking,
  since: Date,
) {
  return model.aggregate<MonthBucket>([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
  ]);
}

function lastMonths() {
  return Array.from({ length: MONTHS_OF_HISTORY }, (_unused, index) =>
    dayjs()
      .subtract(MONTHS_OF_HISTORY - 1 - index, 'month')
      .format('YYYY-MM'),
  );
}

function findCount<TKey>(buckets: CountByKey<TKey>[], key: TKey) {
  return buckets.find((bucket) => bucket._id === key)?.count ?? 0;
}
