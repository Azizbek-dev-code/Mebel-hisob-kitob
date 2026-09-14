import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';
import { getDebts, patchDebt, postDebt, postDebtPayment } from './personal-debts.controller.js';
import {
  createPersonalDebtBodySchema,
  createPersonalDebtPaymentBodySchema,
  updatePersonalDebtBodySchema,
} from './personal-debts.validators.js';

export const personalDebtsRouter = Router();
personalDebtsRouter.use(requireAuth, requirePersonalSession);

personalDebtsRouter.get('/debts', getDebts);
personalDebtsRouter.post('/debts', validate({ body: createPersonalDebtBodySchema }), postDebt);
personalDebtsRouter.patch(
  '/debts/:id',
  validate({ params: idParamsSchema, body: updatePersonalDebtBodySchema }),
  patchDebt,
);
personalDebtsRouter.post(
  '/debts/:id/payments',
  validate({ params: idParamsSchema, body: createPersonalDebtPaymentBodySchema }),
  postDebtPayment,
);
