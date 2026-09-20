import type { AnalyticsAccountType } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface PlatformUsageOverviewDto {
  totalUsers: number;
  activeToday: number;
  onlineNow: number;
  dau: number;
  wau: number;
  mau: number;
  averageDailyUsageSeconds: number;
  averageSessionSeconds: number;
  personalUsers: number;
  businessUsers: number;
  newUsers: number;
  returningUsers: number;
  d1Retention: number | null;
  d7Retention: number | null;
  d30Retention: number | null;
}

export interface PlatformUsageUserRowDto {
  identityId: string;
  displayName: string;
  handle: string | null;
  accountTypes: AnalyticsAccountType[];
  businessType: string | null;
  /** SubscriptionStatus enum name only — never a price or amount. */
  personalSubscriptionStatus: string | null;
  businessSubscriptionStatus: string | null;
  lastActiveAt: IsoDateString | null;
  todaySeconds: number;
  avg7dSeconds: number;
  avg30dSeconds: number;
  sessionsCount: number;
  topFeature: string | null;
}

export interface PlatformUsageUsersResponse {
  items: PlatformUsageUserRowDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PlatformUsageFeatureCountDto {
  feature: string;
  eventCount: number;
}

export interface PlatformUsageUserDetailDto {
  identityId: string;
  displayName: string;
  handle: string | null;
  accountTypes: AnalyticsAccountType[];
  businessType: string | null;
  personalSubscriptionStatus: string | null;
  businessSubscriptionStatus: string | null;
  lastActiveAt: IsoDateString | null;
  totalSessions: number;
  averageSessionSeconds: number;
  todaySeconds: number;
  last7dSeconds: number;
  last30dSeconds: number;
  featureUsage: PlatformUsageFeatureCountDto[];
}

export interface PlatformUsageFeatureAdoptionDto {
  feature: string;
  activeUsers: number;
  adoptionPercent: number;
  eventCount: number;
}

export interface PlatformUsageFeaturesResponse {
  personal: PlatformUsageFeatureAdoptionDto[];
  business: PlatformUsageFeatureAdoptionDto[];
  activeUsers: number;
}

export interface PlatformUsageRetentionDto {
  /** Signup-day cohorts that have fully elapsed the window. */
  d1: number | null;
  d7: number | null;
  d30: number | null;
  definition: {
    d1: string;
    d7: string;
    d30: string;
  };
}

export interface AnalyticsClientEvent {
  eventType: string;
  route?: string;
  feature?: string;
  metadata?: Record<string, string>;
}

export interface AnalyticsEventsBatchRequest {
  clientSessionId: string;
  events: AnalyticsClientEvent[];
}
