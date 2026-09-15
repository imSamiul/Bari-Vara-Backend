import type {
  CreateFlatInput,
  FlatQuery,
  UpdateFlatInput,
} from '#shared';
import { createFlatSchema } from '#shared';
import type { RequestHandler } from 'express';

import { authContext } from '../../middleware/requireAuth.js';
import { validatedQuery } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { cached } from '../../utils/cache.js';
import { buildPagination, sendSuccess } from '../../utils/response.js';
import * as uploadService from '../uploads/upload.service.js';
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

export const create: RequestHandler = async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];
  let input: CreateFlatInput;
  let uploadedPublicIds: string[] = [];

  if (files.length > 0) {
    let raw: unknown = req.body;

    if (typeof req.body?.data === 'string') {
      try {
        raw = JSON.parse(req.body.data);
      } catch {
        throw ApiError.badRequest(
          'Listing data must be valid JSON in the "data" field',
          'INVALID_LISTING_PAYLOAD',
        );
      }
    }

    const details = createFlatSchema.omit({ images: true }).parse(raw);
    const images = await uploadService.uploadImages(files);
    uploadedPublicIds = images.map((image) => image.publicId);
    input = { ...details, images };
  } else {
    input = createFlatSchema.parse(req.body);
  }

  try {
    const flat = await flatService.createFlat(authContext(req).id, input);
    sendSuccess(res, 'Listing published', toFlatSummary(flat), 201);
  } catch (error) {
    if (uploadedPublicIds.length > 0) {
      await uploadService.destroyImages(uploadedPublicIds);
    }
    throw error;
  }
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
