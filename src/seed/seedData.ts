import type { DhakaArea, FlatAmenity, FlatCategory } from '#shared';

export type SeedFlat = {
  title: string;
  description: string;
  category: FlatCategory;
  monthlyRent: number;
  serviceCharge: number;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  areaSqft: number;
  availableInDays: number;
  amenities: FlatAmenity[];
  area: DhakaArea;
  line1: string;
  postcode: string;
  /** Unsplash photo ids, resolved to URLs when the flat is created. */
  photos: string[];
};

export const SEED_FLATS: SeedFlat[] = [
  {
    title: 'Sunlit three bedroom near Gulshan 2 circle',
    description:
      'A corner flat on the sixth floor with windows on two sides, so the living room stays bright until late afternoon. Walking distance to Gulshan 2 circle, the lake park and several supermarkets. The building has a standby generator and a lift that actually works.',
    category: 'family',
    monthlyRent: 68000,
    serviceCharge: 5000,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    areaSqft: 1750,
    availableInDays: 14,
    amenities: [
      'lift',
      'parking',
      'generator',
      'gas-line',
      'security-guard',
      'cctv',
      'balcony',
    ],
    area: 'Gulshan',
    line1: 'House 42, Road 11, Gulshan 2',
    postcode: '1212',
    photos: [
      '1502672260266-1c1ef2d93688',
      '1560448204-e02f11c3d0e2',
      '1522708323590-d24dbb6b0267',
    ],
  },
  {
    title: 'Quiet two bedroom on a Dhanmondi side road',
    description:
      'Set back from Satmasjid Road on a residential lane, so traffic noise stays outside. Freshly painted with new bathroom fittings and a kitchen that fits a full size fridge. Rickshaws to Dhanmondi 27 take about five minutes.',
    category: 'family',
    monthlyRent: 38000,
    serviceCharge: 3000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    areaSqft: 1150,
    availableInDays: 3,
    amenities: ['lift', 'parking', 'generator', 'gas-line', 'balcony'],
    area: 'Dhanmondi',
    line1: 'House 8, Road 9/A, Dhanmondi',
    postcode: '1209',
    photos: [
      '1493809842364-78817add7ffb',
      '1484154218962-a197022b5858',
      '1556909212-d5b604d0c90d',
    ],
  },
  {
    title: 'Furnished studio for one in Banani',
    description:
      'A compact studio that comes with a bed, wardrobe, desk and induction cooktop, so you can move in with a suitcase. Rent covers water and building service. Suited to a single professional working around Banani or Gulshan.',
    category: 'bachelor',
    monthlyRent: 24000,
    serviceCharge: 0,
    bedrooms: 1,
    bathrooms: 1,
    balconies: 1,
    areaSqft: 520,
    availableInDays: 1,
    amenities: [
      'lift',
      'generator',
      'security-guard',
      'furnished',
      'wifi-ready',
      'air-conditioning',
    ],
    area: 'Banani',
    line1: 'Flat 3B, Road 17, Banani',
    postcode: '1213',
    photos: [
      '1522771739844-6a9f6d5f14af',
      '1505873242700-f289a29e1e0f',
      '1540518614846-7eded433c457',
    ],
  },
  {
    title: 'Family flat with rooftop access in Uttara Sector 7',
    description:
      'Third floor of a six storey building with an unlocked rooftop residents actually use for drying clothes and evening tea. Two minutes from Sector 7 park and the Uttara North metro station is a short rickshaw ride away.',
    category: 'family',
    monthlyRent: 32000,
    serviceCharge: 2500,
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    areaSqft: 1320,
    availableInDays: 21,
    amenities: [
      'lift',
      'parking',
      'generator',
      'gas-line',
      'rooftop-access',
      'balcony',
    ],
    area: 'Uttara',
    line1: 'House 19, Road 12, Sector 7, Uttara',
    postcode: '1230',
    photos: [
      '1560185007-cde436f6a4d0',
      '1567496898669-ee935f5f647a',
      '1583608205776-bfd35f0d9f83',
    ],
  },
  {
    title: 'Sublet room in a shared Mirpur flat',
    description:
      'One private room with an attached bathroom inside a three bedroom flat shared with two working tenants. Kitchen and living room are shared. Bus routes to Motijheel and Farmgate start from Mirpur 10 roundabout, five minutes on foot.',
    category: 'sublet',
    monthlyRent: 11000,
    serviceCharge: 800,
    bedrooms: 1,
    bathrooms: 1,
    balconies: 0,
    areaSqft: 240,
    availableInDays: 7,
    amenities: ['generator', 'gas-line', 'wifi-ready', 'security-guard'],
    area: 'Mirpur',
    line1: 'House 5, Block C, Mirpur 10',
    postcode: '1216',
    photos: [
      '1595526114035-0d45ed16cfbf',
      '1598928506311-c55ded91a20c',
      '1586023492125-27b2c045efd7',
    ],
  },
  {
    title: 'Ground floor office space off Motijheel',
    description:
      'Open plan ground floor unit with its own entrance, suitable for a small team or a service business that needs walk in visitors. Three phase electricity and a dedicated generator line. Bank branches and the stock exchange are within walking distance.',
    category: 'office',
    monthlyRent: 55000,
    serviceCharge: 6000,
    bedrooms: 4,
    bathrooms: 2,
    balconies: 0,
    areaSqft: 1600,
    availableInDays: 30,
    amenities: [
      'parking',
      'generator',
      'security-guard',
      'cctv',
      'air-conditioning',
      'wifi-ready',
    ],
    area: 'Motijheel',
    line1: '27 Dilkusha Commercial Area',
    postcode: '1000',
    photos: [
      '1497366754035-f200968a6e72',
      '1497366811353-6870744d04b2',
      '1524758631624-e2822e304c36',
    ],
  },
  {
    title: 'Bright two bedroom in Mohammadpur Ring Road',
    description:
      'Fourth floor flat facing east, with a long balcony running along the living room. Tiled floors throughout and a separate utility area behind the kitchen. Local market and two schools are within a few hundred metres.',
    category: 'family',
    monthlyRent: 27000,
    serviceCharge: 2000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    areaSqft: 1000,
    availableInDays: 10,
    amenities: ['lift', 'generator', 'gas-line', 'balcony', 'security-guard'],
    area: 'Mohammadpur',
    line1: 'House 31, Ring Road, Mohammadpur',
    postcode: '1207',
    photos: [
      '1502005229762-cf1b2da7c5d6',
      '1512918728675-ed5a9ecdebfd',
      '1519643381401-22c77e60520e',
    ],
  },
  {
    title: 'Bachelor flat steps from Farmgate',
    description:
      'Two rooms on the second floor aimed at students and early career tenants. Right beside the Farmgate bus stop, which makes getting to most universities in the city straightforward. Landlord lives on the ground floor.',
    category: 'bachelor',
    monthlyRent: 15000,
    serviceCharge: 1000,
    bedrooms: 2,
    bathrooms: 1,
    balconies: 1,
    areaSqft: 620,
    availableInDays: 2,
    amenities: ['generator', 'gas-line', 'wifi-ready'],
    area: 'Farmgate',
    line1: '12 Indira Road, Farmgate',
    postcode: '1215',
    photos: [
      '1554995207-c18c203602cb',
      '1522771930-fbaaaa8ba2fa',
      '1513694203232-719a280e022f',
    ],
  },
  {
    title: 'Modern four bedroom in Bashundhara R/A',
    description:
      'Newly handed over building in Block D with covered parking, a lift and a small residents gym on the ground floor. Four bedrooms with built in wardrobes and an attached master bathroom. Good fit for a larger family that wants a quiet block.',
    category: 'family',
    monthlyRent: 52000,
    serviceCharge: 4500,
    bedrooms: 4,
    bathrooms: 3,
    balconies: 2,
    areaSqft: 2100,
    availableInDays: 45,
    amenities: [
      'lift',
      'parking',
      'generator',
      'gas-line',
      'cctv',
      'security-guard',
      'balcony',
      'rooftop-access',
    ],
    area: 'Bashundhara',
    line1: 'House 402, Block D, Bashundhara R/A',
    postcode: '1229',
    photos: [
      '1512917774080-9991f1c4c750',
      '1600585154340-be6161a56a0c',
      '1600566753086-00f18fb6b3ea',
    ],
  },
  {
    title: 'Affordable two bedroom in Tongi',
    description:
      'Practical flat for a family working around the Tongi and Gazipur industrial belt. Second floor, no lift, with reliable water supply and a covered balcony. Tongi railway station is roughly ten minutes away by rickshaw.',
    category: 'family',
    monthlyRent: 14000,
    serviceCharge: 700,
    bedrooms: 2,
    bathrooms: 1,
    balconies: 1,
    areaSqft: 780,
    availableInDays: 5,
    amenities: ['gas-line', 'balcony'],
    area: 'Tongi',
    line1: 'Holding 77, Cherag Ali, Tongi',
    postcode: '1710',
    photos: [
      '1570129477492-45c003edd2be',
      '1576941089067-2de3c901e126',
      '1568605114967-8130f3a36994',
    ],
  },
  {
    title: 'Serviced apartment near the airport',
    description:
      'Fully furnished one bedroom with weekly housekeeping, aimed at people on short postings or frequent travellers. Air conditioning in both rooms and a backup line that keeps the lift running during load shedding. Ten minutes to the terminal outside rush hour.',
    category: 'bachelor',
    monthlyRent: 45000,
    serviceCharge: 0,
    bedrooms: 1,
    bathrooms: 1,
    balconies: 1,
    areaSqft: 700,
    availableInDays: 1,
    amenities: [
      'lift',
      'parking',
      'generator',
      'air-conditioning',
      'furnished',
      'wifi-ready',
      'cctv',
      'security-guard',
    ],
    area: 'Airport',
    line1: 'Kurmitola, Airport Road',
    postcode: '1229',
    photos: [
      '1522798514-97ceb8c4f1c8',
      '1631049307264-da0ec9d70304',
      '1586105251261-72a756497a11',
    ],
  },
  {
    title: 'Sublet single room in Dhanmondi 15',
    description:
      'A furnished single room in a family flat, offered to one female tenant. Includes a bed, study table and shared use of the kitchen. Close to several coaching centres and a short walk to the lake.',
    category: 'sublet',
    monthlyRent: 9500,
    serviceCharge: 500,
    bedrooms: 1,
    bathrooms: 1,
    balconies: 0,
    areaSqft: 180,
    availableInDays: 4,
    amenities: ['gas-line', 'wifi-ready', 'furnished', 'security-guard'],
    area: 'Dhanmondi',
    line1: 'House 21, Road 15/A, Dhanmondi',
    postcode: '1209',
    photos: [
      '1505691938895-1758d7feb511',
      '1522708323590-d24dbb6b0267',
      '1616486338812-3dadae4b4ace',
    ],
  },
];

export const SEED_REVIEWS = [
  {
    flatIndex: 0,
    flatRating: 5,
    ownerRating: 5,
    comment:
      'Visited on a Friday morning and the owner showed up on time with the keys. The flat is exactly as described and the corner windows make a real difference.',
  },
  {
    flatIndex: 0,
    flatRating: 4,
    ownerRating: 4,
    comment:
      'Good location and a well maintained building. Only note is that the second bathroom is smaller than the photos suggest, but nothing that put us off.',
  },
  {
    flatIndex: 1,
    flatRating: 4,
    ownerRating: 5,
    comment:
      'Quieter than I expected for Dhanmondi. The owner answered every question over the phone before I even visited, which saved a trip.',
  },
  {
    flatIndex: 3,
    flatRating: 5,
    ownerRating: 4,
    comment:
      'The rooftop is genuinely usable and the neighbours were friendly when we looked around. Sector 7 park nearby is a bonus with kids.',
  },
  {
    flatIndex: 5,
    flatRating: 4,
    ownerRating: 4,
    comment:
      'Took this for a small team of six and the separate entrance matters more than I thought. Generator handled a two hour outage without issues.',
  },
];
