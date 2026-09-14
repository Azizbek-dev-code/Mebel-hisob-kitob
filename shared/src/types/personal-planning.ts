import type {
  BudgetWarningLevel,
  GoalEtaKind,
  PersonalBudgetKind,
  PersonalSavingGoalStatus,
} from '../constants/enums.js';
import type { IsoDateString, Money } from './api.js';

export interface PersonalBudgetCategoryRef {
  id: string;
  name: string;
}

export interface PersonalBudgetDto {
  id: string;
  kind: PersonalBudgetKind;
  name: string;
  limitSom: Money;
  spentSom: Money;
  remainingSom: Money;
  percent: number;
  overspentSom: Money;
  warningLevel: BudgetWarningLevel;
  periodStart: IsoDateString;
  periodEnd: IsoDateString;
  isActive: boolean;
  category: PersonalBudgetCategoryRef | null;
  createdAt: IsoDateString;
}

export interface PersonalBudgetListResponse {
  items: PersonalBudgetDto[];
}

export interface CreatePersonalBudgetRequest {
  kind: PersonalBudgetKind;
  name: string;
  limitSom: Money;
  categoryId?: string | null;
}

export interface UpdatePersonalBudgetRequest {
  name?: string;
  limitSom?: Money;
  isActive?: boolean;
}

export interface PersonalGoalContributionDto {
  id: string;
  amount: Money;
  occurredAt: IsoDateString;
  note: string | null;
  createdAt: IsoDateString;
}

export interface PersonalSavingGoalDto {
  id: string;
  name: string;
  targetSom: Money;
  savedSom: Money;
  remainingSom: Money;
  percent: number;
  targetDate: IsoDateString | null;
  monthlyContributionSom: Money | null;
  requiredMonthlySom: Money | null;
  estimatedReachAt: IsoDateString | null;
  etaKind: GoalEtaKind | null;
  onTrack: boolean | null;
  status: PersonalSavingGoalStatus;
  contributions: PersonalGoalContributionDto[];
  createdAt: IsoDateString;
}

export interface PersonalSavingGoalListResponse {
  items: PersonalSavingGoalDto[];
}

export interface CreatePersonalSavingGoalRequest {
  name: string;
  targetSom: Money;
  targetDate?: string | null;
  monthlyContributionSom?: Money | null;
}

export interface UpdatePersonalSavingGoalRequest {
  name?: string;
  targetSom?: Money;
  targetDate?: string | null;
  monthlyContributionSom?: Money | null;
  status?: PersonalSavingGoalStatus;
}

export interface CreatePersonalGoalContributionRequest {
  amount: Money;
  occurredAt: string;
  note?: string | null;
}
