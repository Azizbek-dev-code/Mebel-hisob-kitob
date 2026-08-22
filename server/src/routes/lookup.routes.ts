import { Router } from 'express';

import { createCustomer, searchCustomers } from '../controllers/lookup.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCustomerBodySchema,
  lookupQuerySchema,
} from '../validators/sales.validators.js';

/**
 * Legacy mount kept for tests that import customersRouter from lookup.
 * Production mounts catalogue router from customers.routes.ts at /api/customers.
 *
 * Prefer GET /api/customers/options for POS search.
 */
export const customersLookupRouter = Router();
customersLookupRouter.use(requireAuth);
customersLookupRouter.get('/', validate({ query: lookupQuerySchema }), searchCustomers);
customersLookupRouter.post('/', validate({ body: createCustomerBodySchema }), createCustomer);

/** @deprecated use customersRouter from customers.routes.ts */
export const customersRouter = customersLookupRouter;
