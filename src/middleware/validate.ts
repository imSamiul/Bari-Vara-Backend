import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';

interface ValidationTargets {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Replaces each validated section of the request with its parsed output, so
 * defaults and coercions from the shared schemas reach the controller. Failures
 * throw ZodError, which errorHandler turns into a 422 with per-field details.
 */
export function validate(targets: ValidationTargets): RequestHandler {
  return (req, _res, next) => {
    if (targets.body) {
      req.body = targets.body.parse(req.body);
    }

    if (targets.params) {
      Object.assign(req.params, targets.params.parse(req.params));
    }

    if (targets.query) {
      // Express 5 exposes req.query through a prototype getter, so it has to be
      // shadowed with an own property rather than assigned.
      Object.defineProperty(req, 'query', {
        value: targets.query.parse(req.query),
        configurable: true,
        writable: true,
      });
    }

    next();
  };
}

/**
 * Reads the query this middleware already parsed. Express types req.query as
 * ParsedQs, and threading a narrower type through the router generics breaks its
 * handler overloads, so the one cast lives here instead of at every call site.
 */
export function validatedQuery<TQuery>(req: Request): TQuery {
  return req.query as unknown as TQuery;
}
