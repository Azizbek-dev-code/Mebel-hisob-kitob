import { FeatureKey } from '@furniture-erp/shared';
import { Router } from 'express';

import {
  archiveCustomer,
  createCustomer,
  getCustomer,
  listCustomers,
  restoreCustomer,
  updateCustomer,
} from '../controllers/customers.controller.js';
import { searchCustomers } from '../controllers/lookup.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireFeature } from '../middleware/require-feature.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import {
  createCustomerCatalogueBodySchema,
  customerListQuerySchema,
  updateCustomerBodySchema,
} from '../validators/customers.validators.js';
import { lookupQuerySchema } from '../validators/sales.validators.js';

/**
 * Customer catalogue + POS lookup.
 *
 * - GET /options — ACTIVE customers for sale form (any signed-in user)
 * - Remaining routes — catalogue list/detail/CRUD
 *
 * Archive/restore enforced as ADMIN in the service layer.
 * storeId always comes from the session.
 */
export const customersRouter = Router();

customersRouter.use(requireAuth, requireFeature(FeatureKey.CUSTOMERS));

customersRouter.get('/options', validate({ query: lookupQuerySchema }), searchCustomers);

customersRouter.get('/', validate({ query: customerListQuerySchema }), listCustomers);
customersRouter.post(
  '/',
  validate({ body: createCustomerCatalogueBodySchema }),
  createCustomer,
);

customersRouter.get('/:id', validate({ params: idParamsSchema }), getCustomer);
customersRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateCustomerBodySchema }),
  updateCustomer,
);
customersRouter.post('/:id/archive', validate({ params: idParamsSchema }), archiveCustomer);
customersRouter.post('/:id/restore', validate({ params: idParamsSchema }), restoreCustomer);
