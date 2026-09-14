import type { Request, Response } from 'express';

import { asyncHandler } from '../../../utils/async-handler.js';
import { sendSuccess } from '../../../utils/http-response.js';
import { getPersonalPlatformStats } from './personal-stats.service.js';

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getPersonalPlatformStats());
});
