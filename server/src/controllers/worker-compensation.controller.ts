import type {
  CreateWorkerCompensationRuleResponse,
  SettleWorkerCompensationResponse,
  UpdateWorkerCompensationRuleResponse,
  WorkerCompensationPreviewResponse,
  WorkerCompensationRuleDetailResponse,
  WorkerCompensationRuleListResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as workerCompensationService from '../services/worker-compensation.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../utils/http-response.js';
import type {
  CreateWorkerCompensationRuleBody,
  SettleWorkerCompensationBody,
  UpdateWorkerCompensationRuleBody,
  WorkerCompensationPreviewQuery,
  WorkerCompensationRuleListQuery,
  WorkerCompensationRuleParams,
  WorkerCompensationWorkerParams,
} from '../validators/worker-compensation.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const listWorkerCompensationRules = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id: workerId } = req.params as WorkerCompensationWorkerParams;
  const query = req.query as unknown as WorkerCompensationRuleListQuery;

  const items = await workerCompensationService.listCompensationRules(
    user.storeId,
    user.role,
    workerId,
    { isActive: query.isActive },
  );
  sendSuccess<WorkerCompensationRuleListResponse>(res, { items });
});

export const createWorkerCompensationRule = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id: workerId } = req.params as WorkerCompensationWorkerParams;
  const body = req.body as CreateWorkerCompensationRuleBody;

  const rule = await workerCompensationService.createCompensationRule(
    user.storeId,
    user,
    workerId,
    body,
  );
  sendCreated<CreateWorkerCompensationRuleResponse>(res, { rule });
});

export const getWorkerCompensationRule = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id: workerId, ruleId } = req.params as WorkerCompensationRuleParams;

  const rule = await workerCompensationService.getCompensationRule(
    user.storeId,
    user.role,
    workerId,
    ruleId,
  );
  sendSuccess<WorkerCompensationRuleDetailResponse>(res, { rule });
});

export const updateWorkerCompensationRule = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id: workerId, ruleId } = req.params as WorkerCompensationRuleParams;
  const body = req.body as UpdateWorkerCompensationRuleBody;

  const rule = await workerCompensationService.updateCompensationRule(
    user.storeId,
    user,
    workerId,
    ruleId,
    body,
  );
  sendSuccess<UpdateWorkerCompensationRuleResponse>(res, { rule });
});

/**
 * Read-only compensation preview — never posts ledger or finance rows.
 */
export const getWorkerCompensationPreview = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id: workerId } = req.params as WorkerCompensationWorkerParams;
  const query = req.query as unknown as WorkerCompensationPreviewQuery;

  const preview = await workerCompensationService.getCompensationPreview(
    user.storeId,
    user.role,
    workerId,
    { from: query.from, to: query.to },
  );
  sendSuccess<WorkerCompensationPreviewResponse>(res, { preview });
});

/**
 * Settle a preview period into COMMISSION ledger rows (idempotent).
 */
export const settleWorkerCompensation = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id: workerId } = req.params as WorkerCompensationWorkerParams;
  const body = req.body as SettleWorkerCompensationBody;

  const settlement = await workerCompensationService.settleCompensation(
    user.storeId,
    user,
    workerId,
    { from: body.from, to: body.to },
  );
  sendSuccess<SettleWorkerCompensationResponse>(res, { settlement });
});
