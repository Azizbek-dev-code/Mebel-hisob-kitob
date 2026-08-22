import type { AuthUser } from '@furniture-erp/shared';

declare global {
  namespace Express {
    interface Request {
      /** Correlates every log line and error response for a single request. */
      requestId: string;
      /** Populated by `requireAuth`; absent on public routes. */
      auth?: AuthUser;
    }
  }
}

export {};
