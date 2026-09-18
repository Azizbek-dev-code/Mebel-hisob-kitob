import type { BusinessType, OnboardingAnswerType, OnboardingAudience, OnboardingSubmissionStatus } from '../constants/enums.js';
import type { OnboardingQuestionCatalogEntry } from '../onboarding/catalog.js';
import type { AccountPurpose } from '../onboarding/catalog.js';
import type { OnboardingAnswers } from '../onboarding/validation.js';
import type { IsoDateString } from './api.js';
import type { PersonalAccountCreatedResponse } from './workspace.js';
import type { PersonalAuthUser } from './auth.js';

export interface OnboardingOptionDto {
  id: string;
  key: string;
  labelUz: string;
  labelRu: string;
  allowsOther: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface OnboardingQuestionDto {
  id: string;
  key: string;
  audience: OnboardingAudience;
  businessType: BusinessType | null;
  promptUz: string;
  promptRu: string;
  hintUz: string | null;
  hintRu: string | null;
  answerType: OnboardingAnswerType;
  required: boolean;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  options: OnboardingOptionDto[];
}

export interface OnboardingCatalogResponse {
  flowKey: string;
  flowVersion: number;
  questions: OnboardingQuestionDto[];
  /** @deprecated Static v1 keys. Prefer `questions`. */
  legacyQuestions?: readonly OnboardingQuestionCatalogEntry[];
}

export interface OnboardingStartRequest {
  experimentKey?: string | null;
}

export interface OnboardingSubmissionDto {
  publicToken: string;
  flowKey: string;
  flowVersion: number;
  experimentKey: string | null;
  status: OnboardingSubmissionStatus;
  answers: OnboardingAnswers;
  hasCustomIncome: boolean;
  /**
   * Whole so'm. Returned to the token holder so refresh mid-flow can restore
   * CUSTOM income input; never expose via admin list endpoints without care.
   */
  customMonthlyIncomeSom?: number | null;
  identityId: string | null;
  workspaceId: string | null;
  createdAt: IsoDateString;
  completedAt: IsoDateString | null;
}

export interface OnboardingStartResponse {
  submission: OnboardingSubmissionDto;
}

export interface SaveOnboardingAnswersRequest {
  answers: OnboardingAnswers;
  /** Whole so'm. Stored separately from `answers`. Ignored unless band is CUSTOM. */
  customMonthlyIncomeSom?: number | null;
}

export interface CompletePersonalOnboardingRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  passwordConfirmation?: string;
  name?: string;
}

export interface CompletePersonalOnboardingResponse extends PersonalAccountCreatedResponse {
  submission: OnboardingSubmissionDto;
  /** Present when public register also opens a Personal session. */
  user?: PersonalAuthUser;
}

export interface OnboardingCountBucket {
  key: string;
  count: number;
}

export interface OnboardingTopAnswerBucket {
  questionKey: string;
  optionKey: string;
  count: number;
}

export interface OnboardingStatsResponse {
  flowKey: string;
  flowVersion: number;
  started: number;
  completed: number;
  conversionRate: number;
  personalCompleted: number;
  businessCompleted: number;
  purpose: OnboardingCountBucket[];
  businessType: OnboardingCountBucket[];
  discoverySource: OnboardingCountBucket[];
  goals: OnboardingCountBucket[];
  helpWith: OnboardingCountBucket[];
  monthlyIncomeBand: OnboardingCountBucket[];
  /** Optional first savings target. Counts only; free-text "other" is never returned. */
  firstSavingGoal: OnboardingCountBucket[];
  topAnswers: OnboardingTopAnswerBucket[];
  needs: OnboardingCountBucket[];
  /** True when at least one completed CUSTOM band exists. The amount itself is never returned. */
  customIncomeEnteredCount: number;
}

export interface OnboardingNeedDto {
  id: string;
  key: string;
  labelUz: string;
  labelRu: string;
  isActive: boolean;
  sortOrder: number;
}

export interface OnboardingSolutionDto {
  id: string;
  key: string;
  labelUz: string;
  labelRu: string;
  isActive: boolean;
  sortOrder: number;
}

export interface OnboardingNeedMappingDto {
  id: string;
  questionId: string;
  questionKey: string;
  optionKey: string;
  needId: string;
  needKey: string;
  needLabelUz: string;
  solutionId: string;
  solutionKey: string;
  solutionLabelUz: string;
}

export interface OnboardingAnswerRowDto {
  id: string;
  publicToken: string;
  status: OnboardingSubmissionStatus;
  purpose: AccountPurpose | null;
  businessType: string | null;
  identityId: string | null;
  workspaceId: string | null;
  answers: OnboardingAnswers;
  hasCustomIncome: boolean;
  createdAt: IsoDateString;
  completedAt: IsoDateString | null;
}

export interface UpsertOnboardingQuestionRequest {
  key?: string;
  audience: OnboardingAudience;
  businessType?: BusinessType | null;
  promptUz: string;
  promptRu: string;
  hintUz?: string | null;
  hintRu?: string | null;
  answerType: OnboardingAnswerType;
  required?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  options?: Array<{
    key: string;
    labelUz: string;
    labelRu: string;
    allowsOther?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  }>;
}

export interface ReorderOnboardingItemsRequest {
  ids: string[];
}

export interface UpsertOnboardingNeedRequest {
  key?: string;
  labelUz: string;
  labelRu: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpsertOnboardingMappingRequest {
  questionId: string;
  optionKey: string;
  needId: string;
  solutionId: string;
}

export type { AccountPurpose, OnboardingAnswers };
