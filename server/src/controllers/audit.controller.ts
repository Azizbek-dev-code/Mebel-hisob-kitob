import type { Request, Response } from 'express';

import * as auditService from '../services/audit.service.js';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendPaginated } from '../utils/http-response.js';
import type { AuditListQuery } from '../validators/audit.validators.js';

function requireUser(req: Request) {
  if (!req.auth) {
    throw ApiError.unauthorized();
  }
  return req.auth;
}

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = req.query as unknown as AuditListQuery;

  const result = await auditService.listAuditLogs({
    storeId: user.storeId,
    actorRole: user.role,
    query,
  });

  sendPaginated(res, result.items, result.meta);
});
