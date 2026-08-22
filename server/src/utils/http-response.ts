import type { ApiSuccessResponse, PaginatedResult, PaginationMeta } from '@furniture-erp/shared';
import type { Response } from 'express';

/** Wraps a payload in the standard success envelope. */
export function sendSuccess<TData>(
  res: Response,
  data: TData,
  statusCode = 200,
): Response<ApiSuccessResponse<TData>> {
  return res.status(statusCode).json({ success: true, data });
}

export function sendCreated<TData>(
  res: Response,
  data: TData,
): Response<ApiSuccessResponse<TData>> {
  return sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendPaginated<TItem>(
  res: Response,
  items: TItem[],
  meta: PaginationMeta,
): Response<ApiSuccessResponse<PaginatedResult<TItem>>> {
  return sendSuccess(res, { items, meta });
}
