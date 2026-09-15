import type { DhakaArea, FlatAddress } from '#shared';

/**
 * Approximate centre of each serviced area as [longitude, latitude].
 * Used when a listing is created/updated without explicit coordinates.
 */
export const AREA_CENTROIDS: Record<DhakaArea, [number, number]> = {
  Airport: [90.3978, 23.8433],
  Badda: [90.4255, 23.7806],
  Banani: [90.4043, 23.7936],
  Baridhara: [90.4198, 23.8011],
  Bashundhara: [90.4257, 23.8199],
  Dhanmondi: [90.3742, 23.7461],
  Farmgate: [90.3897, 23.7583],
  Gulshan: [90.4078, 23.7925],
  Lalmatia: [90.3689, 23.755],
  Mirpur: [90.3654, 23.8223],
  Mohakhali: [90.4039, 23.777],
  Mohammadpur: [90.3654, 23.7644],
  Motijheel: [90.4172, 23.733],
  Tejgaon: [90.3965, 23.7598],
  Tongi: [90.4065, 23.8907],
  Uttara: [90.3795, 23.8759],
  Wari: [90.4178, 23.713],
};

/** Resolve listing coordinates from the Dhaka area centre. */
export function geocodeAddress(address: FlatAddress): [number, number] {
  return AREA_CENTROIDS[address.area];
}
