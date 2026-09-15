import type { PublicReview } from '#shared';

import type { ReviewWithAuthor } from './review.service.js';

export function toPublicReview(review: ReviewWithAuthor): PublicReview {
  return {
    id: String(review._id),
    flatId: String(review.flat),
    flatRating: review.flatRating,
    ownerRating: review.ownerRating,
    comment: review.comment,
    author: {
      id: String(review.author._id),
      name: review.author.name,
      avatarUrl: review.author.avatar?.url ?? null,
    },
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
