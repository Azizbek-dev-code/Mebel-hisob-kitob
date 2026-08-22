import type { ApiErrorResponse, ApiFieldError, ApiResponse } from '@furniture-erp/shared';

/**
 * In development the Vite dev server proxies `/api`, so the browser stays on one
 * origin and the HTTP-only auth cookie is sent without any CORS configuration.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiFieldError[];

  constructor(status: number, code: string, message: string, details?: ApiFieldError[]) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isStoreBlocked(): boolean {
    return this.status === 403 && this.code === 'STORE_BLOCKED';
  }

  get isPaymentRequired(): boolean {
    return this.status === 402 || this.code === 'SUBSCRIPTION_REQUIRED';
  }

  get isFeatureNotIncluded(): boolean {
    return this.code === 'FEATURE_NOT_INCLUDED';
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  /** Serialised as JSON unless it is already a `FormData` instance. */
  body?: unknown;
  /** Appended as a query string; `undefined` and `null` values are dropped. */
  searchParams?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

/**
 * Absolute URL of an API path.
 *
 * For the handful of endpoints the browser must reach outside `fetch` — a
 * file download driven by an `<a download>` rather than JSON — so those links
 * pick up `VITE_API_URL` instead of hard-coding `/api`.
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildUrl(path: string, searchParams?: RequestOptions['searchParams']): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!searchParams) return url;

  const query = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `${url}?${queryString}` : url;
}

async function request<TData>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<TData> {
  const { body, searchParams, headers, ...rest } = options;
  const isFormData = body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, searchParams), {
      ...rest,
      method,
      // Always send cookies: authentication is cookie-based, never a bearer header.
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(isFormData || body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      "Ma'lumot saqlanmadi. Server bilan bog'lanishda xatolik.",
    );
  }

  if (response.status === 204) {
    return undefined as TData;
  }

  let payload: ApiResponse<TData> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<TData>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const errorPayload = payload as ApiErrorResponse | null;
    const error = new ApiClientError(
      response.status,
      errorPayload?.error?.code ?? 'INTERNAL_ERROR',
      errorPayload?.error?.message ??
        (response.status >= 500
          ? "Ma'lumot saqlanmadi. Server bilan bog'lanishda xatolik."
          : 'Something went wrong'),
      errorPayload?.error?.details,
    );
    if (error.isPaymentRequired && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('furniture-erp:subscription-required'));
    }
    if (error.isFeatureNotIncluded && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('furniture-erp:feature-not-included'));
    }
    throw error;
  }

  return payload.data;
}

export const apiClient = {
  get: <TData>(path: string, options?: RequestOptions) => request<TData>('GET', path, options),
  post: <TData>(path: string, options?: RequestOptions) => request<TData>('POST', path, options),
  patch: <TData>(path: string, options?: RequestOptions) => request<TData>('PATCH', path, options),
  put: <TData>(path: string, options?: RequestOptions) => request<TData>('PUT', path, options),
  delete: <TData>(path: string, options?: RequestOptions) =>
    request<TData>('DELETE', path, options),
};
