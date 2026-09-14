import type {
  BusinessType,
  WorkspaceMembershipRole,
  WorkspaceStatus,
  WorkspaceType,
} from '../constants/enums.js';
import type { IsoDateString } from './api.js';

/** Login-person overlay. Password hashes never belong in this DTO. */
export interface IdentitySummary {
  id: string;
  email: string;
  fullName: string;
  createdAt: IsoDateString;
}

export interface WorkspaceSummary {
  id: string;
  type: WorkspaceType;
  name: string;
  status: WorkspaceStatus;
  storeId: string | null;
  createdAt: IsoDateString;
}

export interface WorkspaceMembershipSummary {
  id: string;
  identityId: string;
  workspaceId: string;
  role: WorkspaceMembershipRole;
  createdAt: IsoDateString;
}

export interface AccountWorkspaceItem extends WorkspaceSummary {
  role: WorkspaceMembershipRole;
  /** Set for BUSINESS workspaces. Personal rows are null. */
  businessType?: BusinessType | null;
}

export interface RegisterPersonalAccountRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  name?: string;
}

export interface CreatePersonalAccountRequest {
  name?: string;
}

export interface PersonalAccountCreatedResponse {
  identity: IdentitySummary;
  workspace: WorkspaceSummary;
}

export interface AccountListResponse {
  items: AccountWorkspaceItem[];
}

export interface SwitchWorkspaceRequest {
  workspaceId: string;
}
