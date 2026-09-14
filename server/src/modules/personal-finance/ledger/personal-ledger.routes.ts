import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';
import {
  getCategories,
  getEntries,
  getHistory,
  getSummary,
  getTransfers,
  getWallets,
  patchCategory,
  patchEntry,
  patchWallet,
  postCancelEntry,
  postCancelTransfer,
  postCategory,
  postEntry,
  postTransfer,
  postWallet,
} from './personal-ledger.controller.js';
import {
  createPersonalCategoryBodySchema,
  createPersonalEntryBodySchema,
  createPersonalTransferBodySchema,
  createPersonalWalletBodySchema,
  personalCategoryListQuerySchema,
  personalEntryListQuerySchema,
  personalHistoryListQuerySchema,
  personalTransferListQuerySchema,
  updatePersonalCategoryBodySchema,
  updatePersonalEntryBodySchema,
  updatePersonalWalletBodySchema,
} from './personal-ledger.validators.js';

export const personalLedgerRouter = Router();
personalLedgerRouter.use(requireAuth, requirePersonalSession);

personalLedgerRouter.get('/summary', getSummary);
personalLedgerRouter.get('/history', validate({ query: personalHistoryListQuerySchema }), getHistory);
personalLedgerRouter.get('/wallets', getWallets);
personalLedgerRouter.post('/wallets', validate({ body: createPersonalWalletBodySchema }), postWallet);
personalLedgerRouter.patch(
  '/wallets/:id',
  validate({ params: idParamsSchema, body: updatePersonalWalletBodySchema }),
  patchWallet,
);

personalLedgerRouter.get(
  '/categories',
  validate({ query: personalCategoryListQuerySchema }),
  getCategories,
);
personalLedgerRouter.post(
  '/categories',
  validate({ body: createPersonalCategoryBodySchema }),
  postCategory,
);
personalLedgerRouter.patch(
  '/categories/:id',
  validate({ params: idParamsSchema, body: updatePersonalCategoryBodySchema }),
  patchCategory,
);

personalLedgerRouter.get('/entries', validate({ query: personalEntryListQuerySchema }), getEntries);
personalLedgerRouter.post('/entries', validate({ body: createPersonalEntryBodySchema }), postEntry);
personalLedgerRouter.patch(
  '/entries/:id',
  validate({ params: idParamsSchema, body: updatePersonalEntryBodySchema }),
  patchEntry,
);
personalLedgerRouter.post(
  '/entries/:id/cancel',
  validate({ params: idParamsSchema }),
  postCancelEntry,
);

personalLedgerRouter.get(
  '/transfers',
  validate({ query: personalTransferListQuerySchema }),
  getTransfers,
);
personalLedgerRouter.post(
  '/transfers',
  validate({ body: createPersonalTransferBodySchema }),
  postTransfer,
);
personalLedgerRouter.post(
  '/transfers/:id/cancel',
  validate({ params: idParamsSchema }),
  postCancelTransfer,
);
