import type {
  CreateWorkerFinancialTransactionResponse,
  ReverseWorkerFinancialTransactionResponse,
  WorkerFinancialSummaryResponse,
  WorkerFinancialTransactionDetailResponse,
  WorkerFinancialTransactionListResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as workerFinancialService from '../services/worker-financial.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/http-response.js';
import type {
  CreateWorkerFinancialTransactionBody,
  ReverseWorkerFinancialTransactionBody,
  TransactionIdParams,
  WorkerFinancialSummaryQuery,
  WorkerFinancialTransactionListQuery,
  WorkerIdParams,
} from '../validators/worker-financial.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const createWorkerFinancialTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const user = requireUser(req);
    const body = req.body as CreateWorkerFinancialTransactionBody;

    const transaction = await workerFinancialService.createTransaction(user.storeId, user, body);
    sendCreated<CreateWorkerFinancialTransactionResponse>(res, { transaction });
  },
);

export const listWorkerFinancialTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const user = requireUser(req);
    const { workerId } = req.params as WorkerIdParams;
    const query = req.query as unknown as WorkerFinancialTransactionListQuery;

    const result = await workerFinancialService.listWorkerTransactions({
      storeId: user.storeId,
      actor: { id: user.id, role: user.role },
      workerId,
      page: query.page,
      pageSize: query.pageSize,
      type: query.type,
      from: query.from,
      to: query.to,
      search: query.search,
    });

    sendPaginated<WorkerFinancialTransactionListResponse['items'][number]>(
      res,
      result.items,
      result.meta,
    );
  },
);

export const getWorkerFinancialSummary = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { workerId } = req.params as WorkerIdParams;
  const query = req.query as unknown as WorkerFinancialSummaryQuery;

  const summary = await workerFinancialService.getWorkerSummary(
    user.storeId,
    { id: user.id, role: user.role },
    workerId,
    {
      from: query.from,
      to: query.to,
    },
  );
  sendSuccess<WorkerFinancialSummaryResponse>(res, { summary });
});

export const getWorkerFinancialTransaction = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as TransactionIdParams;

  const transaction = await workerFinancialService.getTransaction(user.storeId, user.role, id);
  sendSuccess<WorkerFinancialTransactionDetailResponse>(res, { transaction });
});

export const reverseWorkerFinancialTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const user = requireUser(req);
    const { id } = req.params as TransactionIdParams;
    const body = (req.body ?? {}) as ReverseWorkerFinancialTransactionBody;

    const result = await workerFinancialService.reverseTransaction(user.storeId, user, id, body);
    sendCreated<ReverseWorkerFinancialTransactionResponse>(res, result);
  },
);
