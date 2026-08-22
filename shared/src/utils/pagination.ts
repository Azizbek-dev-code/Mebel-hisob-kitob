import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/pagination.js';
import type { PaginationMeta } from '../types/api.js';

export interface NormalisedPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/** Clamps caller-supplied paging values into a range the database can safely serve. */
export function normalisePagination(page?: number, pageSize?: number): NormalisedPagination {
  const safePage =
    typeof page === 'number' && Number.isInteger(page) && page > 0 ? page : DEFAULT_PAGE;
  const requestedSize =
    typeof pageSize === 'number' && Number.isInteger(pageSize) && pageSize > 0
      ? pageSize
      : DEFAULT_PAGE_SIZE;
  const safePageSize = Math.min(requestedSize, MAX_PAGE_SIZE);

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  };
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number,
): PaginationMeta {
  const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0;

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}
