import { ApiErrorCode, type ApiFieldError } from '@furniture-erp/shared';

/**
 * The only error type controllers and services should throw for expected failures.
 * The error handler turns it into the `ApiErrorResponse` shape; anything else that
 * reaches the handler is treated as an unexpected 500 and is not echoed to clients.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: ApiFieldError[];
  /** Expected failures are logged at warn level; unexpected ones at error level. */
  readonly isOperational = true;

  constructor(statusCode: number, code: ApiErrorCode, message: string, details?: ApiFieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Invalid request', details?: ApiFieldError[]): ApiError {
    return new ApiError(400, ApiErrorCode.BAD_REQUEST, message, details);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, ApiErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message = 'You do not have access to this resource'): ApiError {
    return new ApiError(403, ApiErrorCode.FORBIDDEN, message);
  }

  static storeBlocked(
    message = "Do'koningiz vaqtinchalik bloklangan. Platformadan foydalanish uchun oylik to'lovni amalga oshiring.",
  ): ApiError {
    return new ApiError(403, ApiErrorCode.STORE_BLOCKED, message);
  }

  static subscriptionRequired(
    message = "Sinov muddati tugadi. Dasturdan foydalanishni davom ettirish uchun tarif tanlang.",
  ): ApiError {
    return new ApiError(402, ApiErrorCode.SUBSCRIPTION_REQUIRED, message);
  }

  static featureNotIncluded(
    message = "Bu funksiya sizning tarifingizda mavjud emas.",
  ): ApiError {
    return new ApiError(403, ApiErrorCode.FEATURE_NOT_INCLUDED, message);
  }

  static resourceLimitReached(
    resourceKey: string,
    limitValue: number,
  ): ApiError {
    const codes: Record<string, ApiErrorCode> = {
      workers: ApiErrorCode.WORKER_LIMIT_REACHED,
      customers: ApiErrorCode.CUSTOMER_LIMIT_REACHED,
      products: ApiErrorCode.PRODUCT_LIMIT_REACHED,
      suppliers: ApiErrorCode.SUPPLIER_LIMIT_REACHED,
      sales: ApiErrorCode.SALE_LIMIT_REACHED,
    };
    const labels: Record<string, string> = {
      workers: 'ishchi',
      customers: 'mijoz',
      products: 'mebel',
      suppliers: 'yetkazuvchi',
      sales: 'sotuv',
    };
    const code = codes[resourceKey] ?? ApiErrorCode.RESOURCE_LIMIT_REACHED;
    const noun = labels[resourceKey] ?? resourceKey;
    return new ApiError(
      403,
      code,
      `Sizning tarifingizda maksimal ${limitValue} ta ${noun} mavjud.`,
    );
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, ApiErrorCode.NOT_FOUND, message);
  }

  static conflict(message = 'Resource already exists'): ApiError {
    return new ApiError(409, ApiErrorCode.CONFLICT, message);
  }

  static tooManyRequests(message = 'Too many requests. Try again later.'): ApiError {
    return new ApiError(429, ApiErrorCode.RATE_LIMITED, message);
  }

  static validation(message = 'Validation failed', details?: ApiFieldError[]): ApiError {
    return new ApiError(422, ApiErrorCode.VALIDATION_ERROR, message, details);
  }

  static internal(message = 'Something went wrong'): ApiError {
    return new ApiError(500, ApiErrorCode.INTERNAL_ERROR, message);
  }
}
