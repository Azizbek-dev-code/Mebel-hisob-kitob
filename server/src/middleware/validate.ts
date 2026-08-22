import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and replaces `req.body`/`req.query`/`req.params` with parsed values,
 * so controllers receive coerced, trusted data instead of raw strings.
 *
 * Failures are thrown as `ZodError` and shaped into a 422 by the error handler.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        // Mutate in place instead of reassigning: `req.query` is a getter-only
        // property in Express 5, and this keeps the upgrade path clear.
        const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
        Object.keys(req.query).forEach((key) => delete (req.query as Record<string, unknown>)[key]);
        Object.assign(req.query, parsed);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Helper for inferring a handler's validated body type from its schema. */
export type Validated<TSchema extends ZodTypeAny> = z.infer<TSchema>;
