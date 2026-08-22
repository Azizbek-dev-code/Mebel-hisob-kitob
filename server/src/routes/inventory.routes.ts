import { Router } from 'express';

import {
  adjustStock,
  getInventoryProduct,
  listInventory,
  listStockHistory,
  stockIn,
  stockOut,
} from '../controllers/inventory.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import {
  inventoryListQuerySchema,
  stockAdjustBodySchema,
  stockHistoryQuerySchema,
  stockInBodySchema,
  stockOutBodySchema,
} from '../validators/inventory.validators.js';

/**
 * Store-scoped inventory quantity + movement history.
 * Mutations are ADMIN / PLATFORM_ADMIN only (enforced in the service layer).
 */
export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get('/', validate({ query: inventoryListQuerySchema }), listInventory);
inventoryRouter.get(
  '/history',
  validate({ query: stockHistoryQuerySchema }),
  listStockHistory,
);
inventoryRouter.get(
  '/products/:id',
  validate({ params: idParamsSchema }),
  getInventoryProduct,
);
inventoryRouter.post('/stock-in', validate({ body: stockInBodySchema }), stockIn);
inventoryRouter.post('/stock-out', validate({ body: stockOutBodySchema }), stockOut);
inventoryRouter.post('/adjust', validate({ body: stockAdjustBodySchema }), adjustStock);
