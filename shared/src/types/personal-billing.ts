import type { PersonalPlanKey } from '../personal-billing/catalog.js';
import type { AuthSubscriptionSnapshot } from './auth.js';
import type { SubscriptionRequestDto } from './platform.js';

export interface PersonalPlanDto {
  key: PersonalPlanKey;
  trialDays: number;
  periodDays: number;
  monthlyPriceSom: number;
  rank: number;
}

export interface PersonalBillingResponse {
  subscription: AuthSubscriptionSnapshot;
  currentPlanKey: string;
  plans: PersonalPlanDto[];
  pendingRequest: SubscriptionRequestDto | null;
}

export interface SelectPersonalPlanRequest {
  planKey: PersonalPlanKey;
}
