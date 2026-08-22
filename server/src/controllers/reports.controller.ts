import type {
  ReportsBundleResponse,
  ReportsCashFlowResponse,
  ReportsDebtsResponse,
  ReportsExpensesResponse,
  ReportsInventoryResponse,
  ReportsProductsResponse,
  ReportsProfitLossResponse,
  ReportsSalesResponse,
  ReportsSummaryResponse,
  ReportsSupplierPayablesResponse,
  ReportsTrendResponse,
  ReportsWorkersResponse,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import * as reportsService from '../services/reports.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/http-response.js';
import type {
  ReportsExpensesQuery,
  ReportsPeriodQuery,
  ReportsProductsQuery,
} from '../validators/reports.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

function periodFromQuery(user: { storeId: string; role: string }, query: ReportsPeriodQuery) {
  return {
    storeId: user.storeId,
    actorRole: user.role,
    from: query.from,
    to: query.to,
    preset: query.preset,
  };
}

export const getReportsSummary = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsPeriodQuery;
  const summary = await reportsService.getReportsSummary(periodFromQuery(user, query));
  sendSuccess<ReportsSummaryResponse>(res, { summary });
});

export const getReportsProfitLoss = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsPeriodQuery;
  const profitLoss = await reportsService.getReportsProfitLoss(periodFromQuery(user, query));
  sendSuccess<ReportsProfitLossResponse>(res, { profitLoss });
});

export const getReportsCashFlow = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsPeriodQuery;
  const cashFlow = await reportsService.getReportsCashFlow(periodFromQuery(user, query));
  sendSuccess<ReportsCashFlowResponse>(res, { cashFlow });
});

export const getReportsSales = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsPeriodQuery;
  const sales = await reportsService.getReportsSales(periodFromQuery(user, query));
  sendSuccess<ReportsSalesResponse>(res, { sales });
});

export const getReportsExpenses = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsExpensesQuery;
  const expenses = await reportsService.getReportsExpenses({
    ...periodFromQuery(user, query),
    categoryId: query.categoryId,
  });
  sendSuccess<ReportsExpensesResponse>(res, { expenses });
});

export const getReportsDebts = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsPeriodQuery;
  const debts = await reportsService.getReportsDebts(periodFromQuery(user, query));
  sendSuccess<ReportsDebtsResponse>(res, { debts });
});

export const getReportsSupplierPayables = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsPeriodQuery;
  const supplierPayables = await reportsService.getReportsSupplierPayables(
    periodFromQuery(user, query),
  );
  sendSuccess<ReportsSupplierPayablesResponse>(res, { supplierPayables });
});

export const getReportsWorkers = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsPeriodQuery;
  const workers = await reportsService.getReportsWorkers(periodFromQuery(user, query));
  sendSuccess<ReportsWorkersResponse>(res, { workers });
});

export const getReportsProducts = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsProductsQuery;
  const products = await reportsService.getReportsProducts({
    ...periodFromQuery(user, query),
    productLimit: query.limit,
  });
  sendSuccess<ReportsProductsResponse>(res, { products });
});

export const getReportsInventory = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsPeriodQuery;
  const inventory = await reportsService.getReportsInventory(periodFromQuery(user, query));
  sendSuccess<ReportsInventoryResponse>(res, { inventory });
});

export const getReportsTrend = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsPeriodQuery;
  const trend = await reportsService.getReportsTrend(periodFromQuery(user, query));
  sendSuccess<ReportsTrendResponse>(res, { trend });
});

export const getReportsBundle = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as ReportsProductsQuery;
  const reports = await reportsService.getReportsBundle({
    ...periodFromQuery(user, query),
    productLimit: query.limit,
  });
  sendSuccess<ReportsBundleResponse>(res, { reports });
});
