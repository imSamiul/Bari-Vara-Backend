import type { CreateReviewInput, PaginationQuery } from '#shared';

import { Flat, Review } from '../../models/index.js';
import type { ReviewDocument } from '../../models/Review.js';
import type { UserDocument } from '../../models/User.js';
import { ApiError } from '../../utils/ApiError.js';
import { refreshFlatRating, refreshOwnerRating } from './ratingRollup.js';

export type ReviewWithAuthor = Omit<ReviewDocument, 'author'> & {
  author: UserDocument;
};

export async function listFlatReviews(flatId: string, query: PaginationQuery) {
  const [reviews, total] = await Promise.all([
    Review.find({ flat: flatId })
      .populate<{ author: UserDocument }>('author')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Review.countDocuments({ flat: flatId }),
  ]);

  return { reviews, total };
}

/**
 * One review per person per flat, so a repeat submission replaces the previous
 * one instead of failing on the unique index.
 */
export async function saveReview(
  flatId: string,
  authorId: string,
  input: CreateReviewInput,
) {
  const flat = await Flat.findById(flatId);

  if (!flat) throw ApiError.notFound('That listing no longer exists');

  if (String(flat.owner) === authorId) {
    throw ApiError.forbidden(
      'You cannot review your own listing',
      'CANNOT_REVIEW_OWN_FLAT',
    );
  }

  const review = await Review.findOneAndUpdate(
    { flat: flat._id, author: authorId },
    { ...input, owner: flat.owner },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).populate<{ author: UserDocument }>('author');

  await Promise.all([
    refreshFlatRating(flatId),
    refreshOwnerRating(String(flat.owner)),
  ]);

  return review;
}
