import { Router } from 'express';

import {
  addPurchasePayment,
  archiveSupplier,
  cancelPurchase,
  createPurchase,
  createSupplier,
  getPurchase,
  getSupplier,
  listPurchases,
  listSuppliers,
  restoreSupplier,
  updatePurchaseDelivery,
  updateSupplier,
} from '../controllers/purchasing.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import {
  cancelPurchaseBodySchema,
  createPurchaseBodySchema,
  createSupplierBodySchema,
  createSupplierPaymentBodySchema,
  purchaseListQuerySchema,
  supplierListQuerySchema,
  updatePurchaseDeliveryBodySchema,
  updateSupplierBodySchema,
} from '../validators/purchasing.validators.js';

/**
 * Supplier catalogue + purchase payables.
 * ADMIN / PLATFORM_ADMIN only (enforced in purchasing.service).
 * storeId always comes from the session.
 */
export const suppliersRouter = Router();
export const purchasesRouter = Router();

suppliersRouter.use(requireAuth);
purchasesRouter.use(requireAuth);

suppliersRouter.get('/', validate({ query: supplierListQuerySchema }), listSuppliers);
suppliersRouter.post('/', validate({ body: createSupplierBodySchema }), createSupplier);
suppliersRouter.get('/:id', validate({ params: idParamsSchema }), getSupplier);
suppliersRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateSupplierBodySchema }),
  updateSupplier,
);
suppliersRouter.post('/:id/archive', validate({ params: idParamsSchema }), archiveSupplier);
suppliersRouter.post('/:id/restore', validate({ params: idParamsSchema }), restoreSupplier);

purchasesRouter.get('/', validate({ query: purchaseListQuerySchema }), listPurchases);
purchasesRouter.post('/', validate({ body: createPurchaseBodySchema }), createPurchase);
purchasesRouter.get('/:id', validate({ params: idParamsSchema }), getPurchase);
purchasesRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updatePurchaseDeliveryBodySchema }),
  updatePurchaseDelivery,
);
purchasesRouter.post(
  '/:id/payments',
  validate({ params: idParamsSchema, body: createSupplierPaymentBodySchema }),
  addPurchasePayment,
);
purchasesRouter.post(
  '/:id/cancel',
  validate({ params: idParamsSchema, body: cancelPurchaseBodySchema }),
  cancelPurchase,
);
