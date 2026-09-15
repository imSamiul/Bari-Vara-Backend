import type {
  PaginationQuery,
  ReviewOwnerRequestInput,
  UpdateProfileInput,
  UpdateUserRoleInput,
  UserQuery,
} from '#shared';
import type { RequestHandler } from 'express';

import { authContext } from '../../middleware/requireAuth.js';
import { validatedQuery } from '../../middleware/validate.js';
import { buildPagination, sendSuccess } from '../../utils/response.js';
import { toPublicUser } from './user.serializer.js';
import * as userService from './user.service.js';

export const list: RequestHandler = async (req, res) => {
  const query = validatedQuery<UserQuery & PaginationQuery>(req);
  const { users, total } = await userService.listUsers(query);

  sendSuccess(
    res,
    `${total} accounts`,
    users.map(toPublicUser),
    200,
    buildPagination(query.page, query.limit, total),
  );
};

export const updateMyProfile: RequestHandler<
  Record<string, string>,
  unknown,
  UpdateProfileInput
> = async (req, res) => {
  const user = await userService.updateProfile(authContext(req).id, req.body);

  sendSuccess(res, 'Profile updated', toPublicUser(user));
};

export const updateRole: RequestHandler<
  { id: string },
  unknown,
  UpdateUserRoleInput
> = async (req, res) => {
  const user = await userService.updateUserRole(req.params.id, req.body);

  sendSuccess(res, `${user.name} is now ${user.role}`, toPublicUser(user));
};

export const requestOwnerAccess: RequestHandler = async (req, res) => {
  const user = await userService.requestOwnerAccess(authContext(req).id);

  sendSuccess(res, 'Request submitted for review', toPublicUser(user));
};

export const reviewOwnerRequest: RequestHandler<
  { id: string },
  unknown,
  ReviewOwnerRequestInput
> = async (req, res) => {
  const user = await userService.reviewOwnerRequest(req.params.id, req.body);

  sendSuccess(
    res,
    `Owner request ${user.ownerRequestStatus}`,
    toPublicUser(user),
  );
};
