import type { BookingStatus, DhakaArea, FlatCategory } from '../constants.js';

export interface StatsOverview {
  totals: {
    users: number;
    owners: number;
    flats: number;
    availableFlats: number;
    bookings: number;
    pendingBookings: number;
    reviews: number;
    averageRent: number;
  };
  bookingsByStatus: { status: BookingStatus; count: number }[];
  flatsByCategory: { category: FlatCategory; count: number }[];
  flatsByArea: { area: DhakaArea; count: number; averageRent: number }[];
  monthlyActivity: {
    month: string;
    signups: number;
    listings: number;
    bookings: number;
  }[];
}
