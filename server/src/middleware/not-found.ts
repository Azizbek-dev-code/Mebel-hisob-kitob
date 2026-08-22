import type { RequestHandler } from 'express';

import { ApiError } from '../utils/api-error.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
};
