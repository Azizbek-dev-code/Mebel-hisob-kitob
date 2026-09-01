import type {
  CreateWorkerResponse,
  MyProfileResponse,
  MyStatsResponse,
  ResetWorkerPasswordResponse,
  SellerReportResponse,
  UpdateWorkerResponse,
  WorkerActivityResponse,
  WorkerAttributedFeesResponse,
  WorkerDetailResponse,
  WorkerLookupResponse,
  WorkerStatsResponse,
  WorkerTasksResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as lookupService from '../services/lookup.service.js';
import * as sellerCommissionService from '../services/seller-commission.service.js';
import * as workerProfileModulesService from '../services/worker-profile-modules.service.js';
import * as workerService from '../services/worker.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/http-response.js';
import type {
  CreateWorkerBody,
  ResetWorkerPasswordBody,
  UpdateWorkerBody,
  WorkerListQuery,
  WorkerOptionsQuery,
  WorkerSalesQuery,
  WorkerTasksQuery,
  SellerReportQuery,
} from '../validators/workers.validators.js';
import type { IdParams } from '../validators/common.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const listWorkers = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as WorkerListQuery;

  const result = await workerService.listWorkers({
    storeId: user.storeId,
    actorRole: user.role,
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    isActive: query.isActive,
    responsibility: query.responsibility,
  });

  sendPaginated(res, result.items, result.meta);
});

export const searchWorkerOptions = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as WorkerOptionsQuery;
  const items = await lookupService.searchWorkers(
    user.storeId,
    query.q,
    query.limit,
    query.responsibility,
  );
  sendSuccess<WorkerLookupResponse>(res, { items });
});

export const createWorker = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const body = req.body as CreateWorkerBody;
  const worker = await workerService.createWorker(user.storeId, user, body);
  sendCreated<CreateWorkerResponse>(res, { worker });
});

export const getWorker = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const worker = await workerService.getWorker(user.storeId, user.role, id);
  sendSuccess<WorkerDetailResponse>(res, { worker });
});

export const updateWorker = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as UpdateWorkerBody;
  const worker = await workerService.updateWorker(user.storeId, user, id, body);
  sendSuccess<UpdateWorkerResponse>(res, { worker });
});

export const resetWorkerPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const body = req.body as ResetWorkerPasswordBody;
  await workerService.resetWorkerPassword(user.storeId, user, id, body);
  sendSuccess<ResetWorkerPasswordResponse>(res, { ok: true });
});

export const getWorkerStats = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const stats = await workerService.getWorkerStats(user.storeId, user, id);
  sendSuccess<WorkerStatsResponse>(res, { stats });
});

export const listWorkerSales = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const query = req.query as unknown as WorkerSalesQuery;
  const result = await workerService.listWorkerSales(user.storeId, user, id, query);
  sendPaginated(res, result.items, result.meta);
});

export const listWorkerTasks = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const query = req.query as unknown as WorkerTasksQuery;
  const items = await workerService.listWorkerTasks(user.storeId, user, id, query.status);
  sendSuccess<WorkerTasksResponse>(res, { items });
});

export const listWorkerActivity = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const items = await workerService.listWorkerActivity(user.storeId, user, id);
  sendSuccess<WorkerActivityResponse>(res, { items });
});

export const listWorkerAttributedFees = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const fees = await workerService.listWorkerAttributedFees(user.storeId, user, id);
  sendSuccess<WorkerAttributedFeesResponse>(res, { fees });
});

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const worker = await workerService.getMyProfile(user.storeId, user.id);
  sendSuccess<MyProfileResponse>(res, { worker });
});

export const getMyStats = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const stats = await workerService.getWorkerStats(user.storeId, user, user.id);
  sendSuccess<MyStatsResponse>(res, { stats });
});

export const listMySales = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as WorkerSalesQuery;
  const result = await workerService.listMySales(user.storeId, user.id, query);
  sendPaginated(res, result.items, result.meta);
});

export const listMyActivity = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const items = await workerService.listMyActivity(user.storeId, user.id);
  sendSuccess<WorkerActivityResponse>(res, { items });
});

export const listMyAttributedFees = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const fees = await workerService.listMyAttributedFees(user.storeId, user.id);
  sendSuccess<WorkerAttributedFeesResponse>(res, { fees });
});

export const getWorkerProfileModules = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const modules = await workerProfileModulesService.getWorkerProfileModules(
    user.storeId,
    user,
    id,
  );
  sendSuccess(res, { modules });
});

export const getMyProfileModules = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const modules = await workerProfileModulesService.getMyProfileModules(user.storeId, user.id);
  sendSuccess(res, { modules });
});

export const getMySellerReport = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as SellerReportQuery;
  const report = await sellerCommissionService.getSellerReport({
    storeId: user.storeId,
    workerId: user.id,
    actor: user,
    preset: query.preset,
    from: query.from,
    to: query.to,
  });
  sendSuccess<SellerReportResponse>(res, { report });
});

export const getWorkerSellerReport = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { id } = req.params as IdParams;
  const query = req.query as unknown as SellerReportQuery;
  const report = await sellerCommissionService.getSellerReport({
    storeId: user.storeId,
    workerId: id,
    actor: user,
    preset: query.preset,
    from: query.from,
    to: query.to,
  });
  sendSuccess<SellerReportResponse>(res, { report });
});

export const getFeeReconciliation = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const reconciliation = await workerProfileModulesService.getStoreFeeReconciliation(
    user.storeId,
    user.role,
  );
  sendSuccess(res, { reconciliation });
});
