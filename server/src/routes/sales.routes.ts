import { Router } from 'express';

import {
  addPayment,
  assignAssembly,
  cancelSale,
  createSale,
  deleteCancelledSale,
  getSale,
  listMyAssemblyTasks,
  listMyDeliveries,
  listPayments,
  listSales,
  updateAssemblyTask,
  updateSale,
  updateSaleDeliveryStatus,
} from '../controllers/sales.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import {
  addPaymentBodySchema,
  assignAssemblyBodySchema,
  cancelSaleBodySchema,
  createSaleBodySchema,
  saleListQuerySchema,
  updateAssemblyTaskBodySchema,
  updateSaleBodySchema,
  updateSaleDeliveryStatusBodySchema,
} from '../validators/sales.validators.js';

export const salesRouter = Router();

salesRouter.use(requireAuth);

salesRouter.get('/', validate({ query: saleListQuerySchema }), listSales);
salesRouter.post('/', validate({ body: createSaleBodySchema }), createSale);

// Assembly task inbox for the signed-in worker (minimal Phase 5 surface).
salesRouter.get('/assembly-tasks/mine', listMyAssemblyTasks);
/** Shopir operational inbox — assigned sale + purchase deliveries. */
salesRouter.get('/deliveries/mine', listMyDeliveries);

salesRouter.get('/:id', validate({ params: idParamsSchema }), getSale);
salesRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateSaleBodySchema }),
  updateSale,
);
salesRouter.patch(
  '/:id/delivery',
  validate({ params: idParamsSchema, body: updateSaleDeliveryStatusBodySchema }),
  updateSaleDeliveryStatus,
);
salesRouter.post(
  '/:id/cancel',
  validate({ params: idParamsSchema, body: cancelSaleBodySchema }),
  cancelSale,
);
salesRouter.delete('/:id', validate({ params: idParamsSchema }), deleteCancelledSale);

salesRouter.get(
  '/:id/payments',
  validate({ params: idParamsSchema }),
  listPayments,
);
salesRouter.post(
  '/:id/payments',
  validate({ params: idParamsSchema, body: addPaymentBodySchema }),
  addPayment,
);

salesRouter.post(
  '/:id/assembly',
  validate({ params: idParamsSchema, body: assignAssemblyBodySchema }),
  assignAssembly,
);

export const assemblyTasksRouter = Router();

assemblyTasksRouter.use(requireAuth);

assemblyTasksRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateAssemblyTaskBodySchema }),
  updateAssemblyTask,
);
