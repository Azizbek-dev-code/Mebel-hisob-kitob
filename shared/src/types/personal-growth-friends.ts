import type { GrowthFriendshipStatus } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthFriendPublicDto {
  identityId: string;
  fullName: string;
  email: string | null;
  handle: string | null;
  level: number | null;
  showActivity: boolean;
}

export interface GrowthFriendshipDto {
  id: string;
  status: GrowthFriendshipStatus;
  /** True when the current user sent the request. */
  iAmRequester: boolean;
  friend: GrowthFriendPublicDto;
  createdAt: IsoDateString;
  respondedAt: IsoDateString | null;
}

export interface GrowthFriendsListResponse {
  friends: GrowthFriendshipDto[];
  incoming: GrowthFriendshipDto[];
  outgoing: GrowthFriendshipDto[];
  friendCount: number;
}

export interface GrowthFriendSearchResponse {
  items: GrowthFriendPublicDto[];
}

export interface SendFriendRequestBody {
  /** Email or @handle (without requiring @). */
  query: string;
}

export interface GrowthSocialPrivacyDto {
  handle: string | null;
  bio: string | null;
  showLevel: boolean;
  showActivity: boolean;
  allowFriendRequests: boolean;
}

export interface UpdateGrowthSocialPrivacyRequest {
  handle?: string | null;
  bio?: string | null;
  showLevel?: boolean;
  showActivity?: boolean;
  allowFriendRequests?: boolean;
}
