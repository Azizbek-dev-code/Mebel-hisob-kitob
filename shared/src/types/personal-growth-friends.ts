import type { GrowthFriendshipStatus, PresenceVisibility } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthFriendPresenceDto {
  /** Null when the viewer's privacy settings hide this. */
  online: boolean | null;
  lastSeenAt: IsoDateString | null;
}

export interface GrowthFriendPublicDto {
  identityId: string;
  fullName: string;
  /** Always null on public/search payloads — never leak email. */
  email: string | null;
  handle: string | null;
  level: number | null;
  showActivity: boolean;
  presence: GrowthFriendPresenceDto;
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
  /** Public @handle (without requiring @). Optional when identityId is set. */
  query?: string;
  /** Direct identity id from Global Reyting — never exposes email. */
  identityId?: string;
}

export interface GrowthSocialPrivacyDto {
  handle: string | null;
  bio: string | null;
  showLevel: boolean;
  showActivity: boolean;
  allowFriendRequests: boolean;
  onlineStatusVisibility: PresenceVisibility;
  lastSeenVisibility: PresenceVisibility;
  showInGlobalRanking: boolean;
}

export interface UpdateGrowthSocialPrivacyRequest {
  handle?: string | null;
  bio?: string | null;
  showLevel?: boolean;
  showActivity?: boolean;
  allowFriendRequests?: boolean;
  onlineStatusVisibility?: PresenceVisibility;
  lastSeenVisibility?: PresenceVisibility;
  showInGlobalRanking?: boolean;
}
