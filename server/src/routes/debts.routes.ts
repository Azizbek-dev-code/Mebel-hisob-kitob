import { FeatureKey } from '@furniture-erp/shared';
import { Router } from 'express';

import { listDebts, recordDebtPayment } from '../controllers/debts.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireFeature } from '../middleware/require-feature.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import { debtListQuerySchema } from '../validators/debts.validators.js';
import { addPaymentBodySchema } from '../validators/sales.validators.js';

/**
 * Customer debt workspace — unsettled sales + payment collection.
 * storeId always comes from the authenticated session.
 */
export const debtsRouter = Router();

debtsRouter.use(requireAuth, requireFeature(FeatureKey.DEBTS));

debtsRouter.get('/', validate({ query: debtListQuerySchema }), listDebts);
debtsRouter.post(
  '/:id/payments',
  validate({ params: idParamsSchema, body: addPaymentBodySchema }),
  recordDebtPayment,
);
