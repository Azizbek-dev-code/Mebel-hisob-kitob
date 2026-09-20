import type { Request, Response } from 'express';

import { UserRole } from '@furniture-erp/shared';

import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess } from '../../utils/http-response.js';

import {
  getUsageFeatures,
  getUsageOverview,
  getUsageRetention,
  getUsageUserDetail,
  listUsageUsers,
} from './platform-usage-analytics.service.js';

function assertPlatformAnalytics(req: Request): void {
  if (!req.auth) throw ApiError.unauthorized();
  if (req.auth.role !== UserRole.PLATFORM_ADMIN) {
    throw ApiError.forbidden("Faqat Platform Admin analitikasini ko'ra oladi");
  }
}

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAnalytics(req);
  sendSuccess(res, await getUsageOverview());
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAnalytics(req);
  const page = req.query.page ? Number(req.query.page) : undefined;
  const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
  sendSuccess(res, await listUsageUsers({ page, pageSize }));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAnalytics(req);
  sendSuccess(res, { user: await getUsageUserDetail(String(req.params.id)) });
});

export const getFeatures = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAnalytics(req);
  sendSuccess(res, await getUsageFeatures());
});

export const getRetention = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAnalytics(req);
  sendSuccess(res, await getUsageRetention());
});
