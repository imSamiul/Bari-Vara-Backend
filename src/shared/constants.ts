export const USER_ROLES = ['user', 'owner', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AUTH_PROVIDERS = ['local', 'google'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const OWNER_REQUEST_STATUSES = [
  'none',
  'pending',
  'approved',
  'rejected',
] as const;
export type OwnerRequestStatus = (typeof OWNER_REQUEST_STATUSES)[number];

export const FLAT_CATEGORIES = [
  'family',
  'bachelor',
  'sublet',
  'office',
] as const;
export type FlatCategory = (typeof FLAT_CATEGORIES)[number];

export const FLAT_STATUSES = ['available', 'booked'] as const;
export type FlatStatus = (typeof FLAT_STATUSES)[number];

export const FLAT_AMENITIES = [
  'lift',
  'parking',
  'generator',
  'gas-line',
  'security-guard',
  'cctv',
  'balcony',
  'furnished',
  'wifi-ready',
  'air-conditioning',
  'rooftop-access',
] as const;
export type FlatAmenity = (typeof FLAT_AMENITIES)[number];

export const AMENITY_LABELS: Record<FlatAmenity, string> = {
  lift: 'Lift',
  parking: 'Parking',
  generator: 'Generator',
  'gas-line': 'Gas line',
  'security-guard': 'Security guard',
  cctv: 'CCTV',
  balcony: 'Balcony',
  furnished: 'Furnished',
  'wifi-ready': 'Wi-Fi ready',
  'air-conditioning': 'Air conditioning',
  'rooftop-access': 'Rooftop access',
};

export const DHAKA_AREAS = [
  'Gulshan',
  'Banani',
  'Baridhara',
  'Dhanmondi',
  'Lalmatia',
  'Mohammadpur',
  'Mirpur',
  'Uttara',
  'Bashundhara',
  'Badda',
  'Mohakhali',
  'Tejgaon',
  'Farmgate',
  'Motijheel',
  'Wari',
  'Tongi',
  'Airport',
] as const;
export type DhakaArea = (typeof DHAKA_AREAS)[number];

export const BANGLADESH_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
] as const;
export type BangladeshDivision = (typeof BANGLADESH_DIVISIONS)[number];

export const BOOKING_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const FLAT_SORT_OPTIONS = [
  '-createdAt',
  'createdAt',
  'price',
  '-price',
  '-rating',
] as const;
export type FlatSortOption = (typeof FLAT_SORT_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

/**
 * The API sets these and the Next middleware reads them, so the names live here
 * rather than being spelled out on both sides.
 */
export const ACCESS_TOKEN_COOKIE = 'bv_access';
export const REFRESH_TOKEN_COOKIE = 'bv_refresh';

export const ERROR_CODES = {
  invalidCredentials: 'INVALID_CREDENTIALS',
  emailNotVerified: 'EMAIL_NOT_VERIFIED',
  otpExpired: 'OTP_EXPIRED',
  invalidOtp: 'INVALID_OTP',
  otpAttemptsExceeded: 'OTP_ATTEMPTS_EXCEEDED',
  refreshTokenReused: 'REFRESH_TOKEN_REUSED',
  googleTokenInvalid: 'GOOGLE_TOKEN_INVALID',
  googleEmailUnverified: 'GOOGLE_EMAIL_UNVERIFIED',
  googleNotConfigured: 'GOOGLE_NOT_CONFIGURED',
} as const;
