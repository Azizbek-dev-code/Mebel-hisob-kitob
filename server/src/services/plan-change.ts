import {
  PLAN_CHANGE_MESSAGES,
  PlanChangeDecision,
  evaluatePaidPlanChange,
  type EvaluatePaidPlanChangeInput,
} from '@furniture-erp/shared';

import { ApiError } from '../utils/api-error.js';

export function assertPaidPlanChange(input: EvaluatePaidPlanChangeInput): void {
  const decision = evaluatePaidPlanChange(input);
  if (decision !== PlanChangeDecision.ALLOWED) {
    throw ApiError.conflict(PLAN_CHANGE_MESSAGES[decision]);
  }
}
