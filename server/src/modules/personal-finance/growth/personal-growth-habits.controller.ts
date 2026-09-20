import type {
  CheckInGrowthHabitRequest,
  CreateGrowthHabitLogRequest,
  CreateGrowthHabitRequest,
  SkipGrowthHabitRequest,
  ToggleHabitChecklistTickRequest,
  UpdateGrowthDailyGoalRequest,
  UpdateGrowthHabitLogRequest,
  UpdateGrowthHabitRequest,
  UpsertGrowthDailyGoalsRequest,
  GrowthHabitProgressPeriod,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../../utils/api-error.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { sendCreated, sendSuccess } from '../../../utils/http-response.js';

import {
  checkInGrowthHabit,
  createGrowthHabit,
  createHabitLog,
  deleteHabitLog,
  getDailyGoals,
  getGrowthHabit,
  getHabitDetail,
  getTodayProgress,
  listGrowthHabits,
  listHabitLogs,
  skipHabitDay,
  toggleHabitChecklistTick,
  updateDailyGoal,
  updateGrowthHabit,
  updateHabitLog,
  upsertDailyGoals,
} from './personal-growth-habits.service.js';
import {
  getHabitStatistics,
  getHabitsProgress,
} from './personal-growth-habit-stats.service.js';

function requirePersonal(req: Request) {
  if (!req.personalAuth) throw ApiError.forbidden();
  return req.personalAuth;
}

export const getHabits = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const includeArchived =
    String((req.query as { includeArchived?: string }).includeArchived ?? '') === 'true';
  sendSuccess(res, await listGrowthHabits(user.workspaceId, { includeArchived }));
});

export const getHabit = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    habit: await getGrowthHabit(user.workspaceId, String(req.params.id)),
  });
});

export const getHabitDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await getHabitDetail(user.workspaceId, String(req.params.id)));
});

export const postHabit = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendCreated(res, {
    habit: await createGrowthHabit(
      user.workspaceId,
      user.identityId,
      req.body as CreateGrowthHabitRequest,
    ),
  });
});

export const patchHabit = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    habit: await updateGrowthHabit(
      user.workspaceId,
      String(req.params.id),
      user.identityId,
      req.body as UpdateGrowthHabitRequest,
    ),
  });
});

export const postHabitCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    habit: await checkInGrowthHabit(
      user.workspaceId,
      String(req.params.id),
      req.body as CheckInGrowthHabitRequest,
      user.identityId,
    ),
  });
});

export const postHabitLog = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    habit: await createHabitLog(
      user.workspaceId,
      String(req.params.id),
      user.identityId,
      req.body as CreateGrowthHabitLogRequest,
    ),
  });
});

export const patchHabitLog = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    habit: await updateHabitLog(
      user.workspaceId,
      String(req.params.id),
      String(req.params.logId),
      user.identityId,
      req.body as UpdateGrowthHabitLogRequest,
    ),
  });
});

export const deleteHabitLogHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    habit: await deleteHabitLog(
      user.workspaceId,
      String(req.params.id),
      String(req.params.logId),
      user.identityId,
    ),
  });
});

export const getHabitLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const query = req.query as { from?: string; to?: string };
  sendSuccess(res, await listHabitLogs(user.workspaceId, String(req.params.id), query));
});

export const postHabitSkip = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    habit: await skipHabitDay(
      user.workspaceId,
      String(req.params.id),
      user.identityId,
      req.body as SkipGrowthHabitRequest,
    ),
  });
});

export const postChecklistTick = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    items: await toggleHabitChecklistTick(
      user.workspaceId,
      String(req.params.id),
      req.body as ToggleHabitChecklistTickRequest,
    ),
  });
});

export const getHabitStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const query = req.query as { from?: string; to?: string; period?: GrowthHabitProgressPeriod };
  sendSuccess(res, await getHabitStatistics(user.workspaceId, String(req.params.id), query));
});

export const getHabitsProgressHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const query = req.query as {
    from?: string;
    to?: string;
    period?: GrowthHabitProgressPeriod;
    includeArchived?: string;
  };
  sendSuccess(
    res,
    await getHabitsProgress(user.workspaceId, {
      from: query.from,
      to: query.to,
      period: query.period,
      includeArchived: query.includeArchived !== 'false',
    }),
  );
});

export const getDailyGoalsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  const dayKey = (req.query as { dayKey?: string }).dayKey;
  sendSuccess(res, await getDailyGoals(user.workspaceId, dayKey));
});

export const putDailyGoals = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, await upsertDailyGoals(user.workspaceId, req.body as UpsertGrowthDailyGoalsRequest));
});

export const patchDailyGoal = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, {
    goal: await updateDailyGoal(
      user.workspaceId,
      String(req.params.id),
      req.body as UpdateGrowthDailyGoalRequest,
      user.identityId,
    ),
  });
});

export const getTodayProgressHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requirePersonal(req);
  sendSuccess(res, { progress: await getTodayProgress(user.workspaceId) });
});
