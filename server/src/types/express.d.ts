import type { AuthUser, PersonalAuthUser } from '@furniture-erp/shared';

declare global {
  namespace Express {
    interface Request {
      /** Correlates every log line and error response for a single request. */
      requestId: string;
      /** Store ERP session. Absent on public routes and Personal sessions. */
      auth?: AuthUser;
      /** Personal Finance session. Absent on store ERP sessions. */
      personalAuth?: PersonalAuthUser;
    }
  }
}

export {};
