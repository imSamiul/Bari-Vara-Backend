import type {
  CreateFlatInput,
  FlatQuery,
  UpdateFlatInput,
} from '#shared';
import type { RequestHandler } from 'express';

import { authContext } from '../../middleware/requireAuth.js';
import { validatedQuery } from '../../middleware/validate.js';
import { cached } from '../../utils/cache.js';
import { buildPagination, sendSuccess } from '../../utils/response.js';
import * as flatService from './flat.service.js';
import { toFlatDetail, toFlatSummary } from './flat.serializer.js';

/**
 * The busiest read in the app, and identical for every visitor, so the
 * serialized page is cached rather than the documents behind it.
 */
export const list: RequestHandler = async (req, res) => {
  const query = validatedQuery<FlatQuery>(req);

  const { summaries, total } = await cached(
    flatService.FLAT_LIST_CACHE,
    query,
    async () => {
      const { flats, total: matched } = await flatService.listFlats(query);

      return { summaries: flats.map(toFlatSummary), total: matched };
    },
  );

  sendSuccess(
    res,
    `${total} listings`,
    summaries,
    200,
    buildPagination(query.page, query.limit, total),
  );
};

/** The owner dashboard grid: the caller's own listings, whatever their status. */
export const listMine: RequestHandler = async (req, res) => {
  const query = validatedQuery<FlatQuery>(req);
  const { flats, total } = await flatService.listFlats(query, authContext(req).id);

  sendSuccess(
    res,
    `${total} listings`,
    flats.map(toFlatSummary),
    200,
    buildPagination(query.page, query.limit, total),
  );
};

export const detail: RequestHandler<{ id: string }> = async (req, res) => {
  const flat = await flatService.getFlatWithOwner(req.params.id);

  sendSuccess(res, flat.title, toFlatDetail(flat, flat.owner));
};

export const create: RequestHandler<
  Record<string, string>,
  unknown,
  CreateFlatInput
> = async (req, res) => {
  const flat = await flatService.createFlat(authContext(req).id, req.body);

  sendSuccess(res, 'Listing published', toFlatSummary(flat), 201);
};

export const update: RequestHandler<
  { id: string },
  unknown,
  UpdateFlatInput
> = async (req, res) => {
  const flat = await flatService.updateFlat(
    req.params.id,
    authContext(req),
    req.body,
  );

  sendSuccess(res, 'Listing updated', toFlatSummary(flat));
};

export const remove: RequestHandler<{ id: string }> = async (req, res) => {
  await flatService.deleteFlat(req.params.id, authContext(req));

  sendSuccess(res, 'Listing deleted', null);
};
