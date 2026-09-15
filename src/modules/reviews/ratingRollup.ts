import { Types } from 'mongoose';

import { Flat, Review, User } from '../../models/index.js';

interface RatingAggregate {
  _id: null;
  average: number;
  count: number;
}

const EMPTY_RATING = { average: 0, count: 0 };

async function aggregateRating(
  match: Record<string, unknown>,
  field: 'flatRating' | 'ownerRating',
) {
  const [result] = await Review.aggregate<RatingAggregate>([
    { $match: match },
    { $group: { _id: null, average: { $avg: `$${field}` }, count: { $sum: 1 } } },
  ]);

  if (!result) return EMPTY_RATING;

  // Rounded to one decimal because that is how the star control renders it.
  return {
    average: Math.round(result.average * 10) / 10,
    count: result.count,
  };
}

/** Called after any write that changes a flat's reviews. */
export async function refreshFlatRating(flatId: string) {
  const rating = await aggregateRating(
    { flat: new Types.ObjectId(flatId) },
    'flatRating',
  );

  await Flat.updateOne({ _id: flatId }, { rating });
}

/** Owner reputation is the average across every review of every flat they list. */
export async function refreshOwnerRating(ownerId: string) {
  const ownerRating = await aggregateRating(
    { owner: new Types.ObjectId(ownerId) },
    'ownerRating',
  );

  await User.updateOne({ _id: ownerId }, { ownerRating });
}
