import type { PresenceVisibility } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface PresenceStatusDto {
  identityId: string;
  /** Null when privacy hides status from the viewer. */
  online: boolean | null;
  /** ISO timestamp, null when hidden or never seen. */
  lastSeenAt: IsoDateString | null;
}

export interface PresenceHeartbeatRequest {
  clientSessionId: string;
  visible: boolean;
  /** True when the user interacted recently (not merely an open tab). */
  active: boolean;
  route?: string;
  accountType?: 'PERSONAL' | 'BUSINESS' | 'PLATFORM';
  accountId?: string | null;
}

export interface PresenceHeartbeatResponse {
  online: boolean;
  lastSeenAt: IsoDateString | null;
  idleTimeoutSeconds: number;
  offlineAfterSeconds: number;
}

export interface UpdatePresencePrivacyRequest {
  onlineStatusVisibility?: PresenceVisibility;
  lastSeenVisibility?: PresenceVisibility;
  showInGlobalRanking?: boolean;
}
