import type { AppFeedbackKind } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface AppFeedbackDto {
  id: string;
  kind: AppFeedbackKind;
  body: string;
  rating: number | null;
  isPublic: boolean;
  likeCount: number;
  viewCount: number;
  createdAt: IsoDateString;
}

export interface AppFeedbackPromptStatus {
  showOnboarding: boolean;
  showOutcome: boolean;
}

export interface CreateAppFeedbackRequest {
  kind: AppFeedbackKind;
  body: string;
  rating?: number | null;
  isPublic?: boolean;
}

export interface AppFeedbackListResponse {
  items: AppFeedbackDto[];
}
