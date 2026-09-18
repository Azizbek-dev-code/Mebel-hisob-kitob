import type {
  CreateGrowthCalendarEventRequest,
  UpdateGrowthCalendarEventRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';

import {
  createGrowthCalendarEvent,
  getGrowthDayPlan,
  listGrowthCalendarEvents,
  listUpcomingGrowthReminders,
  updateGrowthCalendarEvent,
} from './personal-plan.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

function parseBound(value: string, endOfDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`);
  }
  return new Date(value);
}

export const getPlanEvents = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const fromRaw = String(req.query.from ?? '');
  const toRaw = String(req.query.to ?? '');
  sendSuccess(
    res,
    await listGrowthCalendarEvents(user.workspaceId, {
      from: parseBound(fromRaw, false),
      to: parseBound(toRaw, true),
    }),
  );
});

export const getPlanDay = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const date = String(req.query.date ?? '');
  sendSuccess(res, await getGrowthDayPlan(user.workspaceId, date));
});

export const getPlanReminders = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const within = req.query.withinMinutes
    ? Number(req.query.withinMinutes)
    : 24 * 60;
  sendSuccess(res, await listUpcomingGrowthReminders(user.workspaceId, within));
});

export const postPlanEvent = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as CreateGrowthCalendarEventRequest;
  sendCreated(
    res,
    { event: await createGrowthCalendarEvent(user.workspaceId, body, user.identityId) },
  );
});

export const patchPlanEvent = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const body = req.body as UpdateGrowthCalendarEventRequest;
  sendSuccess(res, {
    event: await updateGrowthCalendarEvent(
      user.workspaceId,
      String(req.params.id),
      body,
      user.identityId,
    ),
  });
});
