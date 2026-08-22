/** A whole number of so'm. See `constants/currency.ts` for why money is an integer. */
export type Money = number;

/** ISO-8601 timestamp string as produced by `Date.prototype.toISOString`. */
export type IsoDateString = string;

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    /** Present for 422 validation failures so forms can map errors onto fields. */
    details?: ApiFieldError[];
  };
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface SortQuery<TField extends string = string> {
  sortBy?: TField;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  /** Inclusive lower bound, ISO date or datetime. */
  from?: IsoDateString;
  /** Inclusive upper bound, ISO date or datetime. */
  to?: IsoDateString;
}

/** Machine-readable error codes returned in `ApiErrorResponse.error.code`. */
export const ApiErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  STORE_BLOCKED: 'STORE_BLOCKED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  FEATURE_NOT_INCLUDED: 'FEATURE_NOT_INCLUDED',
  WORKER_LIMIT_REACHED: 'WORKER_LIMIT_REACHED',
  CUSTOMER_LIMIT_REACHED: 'CUSTOMER_LIMIT_REACHED',
  PRODUCT_LIMIT_REACHED: 'PRODUCT_LIMIT_REACHED',
  SUPPLIER_LIMIT_REACHED: 'SUPPLIER_LIMIT_REACHED',
  SALE_LIMIT_REACHED: 'SALE_LIMIT_REACHED',
  RESOURCE_LIMIT_REACHED: 'RESOURCE_LIMIT_REACHED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
