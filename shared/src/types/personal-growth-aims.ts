import type { GrowthAimStatus } from '../constants/enums.js';
import type { IsoDateString } from './api.js';

export interface GrowthAimDto {
  id: string;
  title: string;
  note: string | null;
  status: GrowthAimStatus;
  targetDate: IsoDateString | null;
  completedAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface GrowthAimListResponse {
  items: GrowthAimDto[];
}

export interface CreateGrowthAimRequest {
  title: string;
  note?: string | null;
  targetDate?: string | null;
}

export interface UpdateGrowthAimRequest {
  title?: string;
  note?: string | null;
  targetDate?: string | null;
  status?: GrowthAimStatus;
}
