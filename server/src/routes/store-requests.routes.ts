import { ApiErrorCode } from '@furniture-erp/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import {
  getPublicStoreRequest,
  postStoreRequest,
} from '../controllers/store-creation.controller.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../utils/api-error.js';
import { idParamsSchema } from '../validators/common.validators.js';
import { createStoreRequestBodySchema } from '../validators/store-creation.validators.js';

const createRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        429,
        ApiErrorCode.RATE_LIMITED,
        "Juda ko'p ariza yuborildi. Birozdan so'ng qayta urinib ko'ring.",
      ),
    );
  },
});

/**
 * Public store-creation applications.
 *
 * Submitting does not create an ACTIVE store and does not create a login.
 * Status is readable by anyone who has the request id (the confirmation page).
 */
export const storeRequestsRouter = Router();

storeRequestsRouter.post(
  '/',
  createRateLimiter,
  validate({ body: createStoreRequestBodySchema }),
  postStoreRequest,
);
storeRequestsRouter.get('/:id', validate({ params: idParamsSchema }), getPublicStoreRequest);
