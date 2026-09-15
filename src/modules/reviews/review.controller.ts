import type { CreateReviewInput, PaginationQuery } from '#shared';
import type { RequestHandler } from 'express';

import { authContext } from '../../middleware/requireAuth.js';
import { validatedQuery } from '../../middleware/validate.js';
import { buildPagination, sendSuccess } from '../../utils/response.js';
import * as reviewService from './review.service.js';
import { toPublicReview } from './review.serializer.js';

export const list: RequestHandler<{ id: string }> = async (req, res) => {
  const query = validatedQuery<PaginationQuery>(req);
  const { reviews, total } = await reviewService.listFlatReviews(
    req.params.id,
    query,
  );

  sendSuccess(
    res,
    `${total} reviews`,
    reviews.map(toPublicReview),
    200,
    buildPagination(query.page, query.limit, total),
  );
};

export const save: RequestHandler<
  { id: string },
  unknown,
  CreateReviewInput
> = async (req, res) => {
  const review = await reviewService.saveReview(
    req.params.id,
    authContext(req).id,
    req.body,
  );

  sendSuccess(res, 'Thanks for the review', toPublicReview(review));
};
