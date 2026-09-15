import type { RequestHandler } from 'express';

import { ApiError } from '../../utils/ApiError.js';
import { sendSuccess } from '../../utils/response.js';
import * as uploadService from './upload.service.js';

export const uploadOne: RequestHandler = async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Attach an image as "image"', 'NO_FILE');
  }

  const image = await uploadService.uploadImage(req.file);

  sendSuccess(res, 'Image uploaded', image, 201);
};

export const uploadMany: RequestHandler = async (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];

  if (files.length === 0) {
    throw ApiError.badRequest('Attach one or more images as "images"', 'NO_FILE');
  }

  const images = await uploadService.uploadImages(files);

  sendSuccess(res, `${images.length} images uploaded`, images, 201);
};
