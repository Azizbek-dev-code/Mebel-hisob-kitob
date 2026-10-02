/**
 * SMM Agency CMS API contracts.
 *
 * Money is whole so'm (`Money`). `storeId` is never accepted from the client —
 * the authenticated session supplies it on every read and write.
 */

import type {
  SmmApprovalDecision,
  SmmAssignmentStatus,
  SmmBlockKind,
  SmmBudgetLineCategory,
  SmmBudgetStatusFilter,
  SmmContentStatus,
  SmmContentType,
  SmmContractStatusFilter,
  SmmContractType,
  SmmDashboardPeriodPreset,
  SmmDeliverableFrequency,
  SmmDeliverableMode,
  SmmDeliverableTotals,
  SmmExpectedResults,
  SmmFileKind,
  SmmFinanceChartPreset,
  SmmGoalKind,
  SmmInsightSource,
  SmmPaymentSchedule,
  SmmPlatform,
  SmmProgressStatusGroup,
  SmmProjectHealth,
  SmmProjectMemberRole,
  SmmProjectStatus,
  SmmTaskStatus,
  SmmTemplateScope,
} from '../constants/smm.js';
import type { IsoDateString, Money, PaginatedResult, PaginationQuery } from './api.js';

// ---------------------------------------------------------------------------
// Shared summaries
// ---------------------------------------------------------------------------

export interface SmmUserSummary {
  id: string;
  fullName: string;
}

export interface SmmInsightNote {
  text: string;
  source?: SmmInsightSource | string | null;
  createdAt?: IsoDateString | null;
}

export interface SmmContentBlockDto {
  id: string;
  kind: SmmBlockKind;
  title: string | null;
  body: string | null;
  visualDirection: string | null;
  referenceText: string | null;
  sortOrder: number;
}

export interface SmmContentBlockInput {
  kind: SmmBlockKind;
  title?: string | null;
  body?: string | null;
  visualDirection?: string | null;
  referenceText?: string | null;
  sortOrder?: number;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export interface SmmClientListItem {
  id: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  instagram: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  notes: string | null;
  archivedAt: IsoDateString | null;
  projectCount: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface SmmClientDetail extends SmmClientListItem {
  createdBy: SmmUserSummary | null;
}

export interface CreateSmmClientRequest {
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  instagram?: string | null;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface UpdateSmmClientRequest extends Partial<CreateSmmClientRequest> {}

export interface SmmClientListQuery extends PaginationQuery {
  search?: string;
  includeArchived?: boolean;
}

export type SmmClientListResponse = PaginatedResult<SmmClientListItem>;
export type SmmClientDetailResponse = { client: SmmClientDetail };
export type CreateSmmClientResponse = { client: SmmClientDetail };
export type UpdateSmmClientResponse = { client: SmmClientDetail };

// ---------------------------------------------------------------------------
// Project goals / budget lines
// ---------------------------------------------------------------------------

export interface SmmProjectGoalDto {
  id: string;
  kind: SmmGoalKind;
  customLabel: string | null;
  currentValue: number | null;
  targetValue: number | null;
  periodLabel: string | null;
  sortOrder: number;
}

export interface SmmProjectGoalInput {
  kind: SmmGoalKind;
  customLabel?: string | null;
  currentValue?: number | null;
  targetValue?: number | null;
  periodLabel?: string | null;
  sortOrder?: number;
}

export interface SmmProjectBudgetLineDto {
  id: string;
  category: SmmBudgetLineCategory;
  label: string;
  plannedAmount: Money;
  notes: string | null;
  sortOrder: number;
}

export interface SmmProjectBudgetLineInput {
  category: SmmBudgetLineCategory;
  label: string;
  plannedAmount: Money;
  notes?: string | null;
  sortOrder?: number;
}

export interface SmmProjectTeamPreviewMember {
  userId: string;
  fullName: string;
  role: SmmProjectMemberRole;
}

export interface SmmDeliverablesSummary {
  mode: SmmDeliverableMode | null;
  totals: SmmDeliverableTotals;
  frequency: SmmDeliverableFrequency | null;
  contractedTotal: number;
  plannedCount: number;
  completedCount: number;
  publishedCount: number;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface SmmProjectListItem {
  id: string;
  name: string;
  clientName: string | null;
  clientId: string | null;
  status: SmmProjectStatus;
  budgetPlanned: Money | null;
  startDate: IsoDateString | null;
  endDate: IsoDateString | null;
  memberCount: number;
  contentCount: number;
  managerUserId: string | null;
  managerName: string | null;
  teamPreview: SmmProjectTeamPreviewMember[];
  contractStart: IsoDateString | null;
  contractEnd: IsoDateString | null;
  remainingDays: number | null;
  clientFee: Money | null;
  internalBudgetPlanned: Money | null;
  adBudgetPlanned: Money | null;
  spent: Money;
  remainingInternalBudget: Money | null;
  profitEstimate: Money | null;
  contentPlanned: number;
  contentCompleted: number;
  contentPublished: number;
  contentProgressPct: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasksOverdue: number;
  health: SmmProjectHealth;
  deliverables: SmmDeliverablesSummary | null;
  direction: string | null;
  platforms: SmmPlatform[];
  contractType: SmmContractType | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface SmmProjectMemberDto {
  id: string;
  userId: string;
  user: SmmUserSummary;
  role: SmmProjectMemberRole;
  isActive: boolean;
  notes: string | null;
  responsibility: string | null;
  estimatedHours: number | null;
  createdAt: IsoDateString;
}

export interface SmmProjectDetail extends SmmProjectListItem {
  description: string | null;
  notes: string | null;
  clientUserId: string | null;
  clientUser: SmmUserSummary | null;
  client: SmmClientListItem | null;
  manager: SmmUserSummary | null;
  createdBy: SmmUserSummary | null;
  members: SmmProjectMemberDto[];
  goals: SmmProjectGoalDto[];
  budgetLines: SmmProjectBudgetLineDto[];
  autoRenew: boolean;
  paymentSchedule: SmmPaymentSchedule | null;
  paymentStatus: string | null;
  adBudgetPeriod: string | null;
  adPlatforms: string[];
  expectedResults: SmmExpectedResults | null;
  deliverableMode: SmmDeliverableMode | null;
  deliverableTotals: SmmDeliverableTotals | null;
  deliverableFrequency: SmmDeliverableFrequency | null;
}

export interface CreateSmmProjectMemberInput {
  userId: string;
  role: SmmProjectMemberRole;
  responsibility?: string | null;
  estimatedHours?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface CreateSmmProjectRequest {
  name: string;
  clientName?: string | null;
  clientId?: string | null;
  clientUserId?: string | null;
  newClient?: CreateSmmClientRequest;
  description?: string | null;
  status?: SmmProjectStatus;
  budgetPlanned?: Money | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  managerUserId?: string | null;
  direction?: string | null;
  platforms?: SmmPlatform[];
  contractType?: SmmContractType | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  autoRenew?: boolean;
  clientFee?: Money | null;
  paymentSchedule?: SmmPaymentSchedule | null;
  paymentStatus?: string | null;
  internalBudgetPlanned?: Money | null;
  adBudgetPlanned?: Money | null;
  adBudgetPeriod?: string | null;
  adPlatforms?: string[];
  expectedResults?: SmmExpectedResults | null;
  deliverableMode?: SmmDeliverableMode | null;
  deliverables?: SmmDeliverableTotals | null;
  deliverableFrequency?: SmmDeliverableFrequency | null;
  members?: CreateSmmProjectMemberInput[];
  goals?: SmmProjectGoalInput[];
  budgetLines?: SmmProjectBudgetLineInput[];
}

export interface UpdateSmmProjectRequest {
  name?: string;
  clientName?: string | null;
  clientId?: string | null;
  clientUserId?: string | null;
  description?: string | null;
  status?: SmmProjectStatus;
  budgetPlanned?: Money | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  managerUserId?: string | null;
  direction?: string | null;
  platforms?: SmmPlatform[] | null;
  contractType?: SmmContractType | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  autoRenew?: boolean;
  clientFee?: Money | null;
  paymentSchedule?: SmmPaymentSchedule | null;
  paymentStatus?: string | null;
  internalBudgetPlanned?: Money | null;
  adBudgetPlanned?: Money | null;
  adBudgetPeriod?: string | null;
  adPlatforms?: string[] | null;
  expectedResults?: SmmExpectedResults | null;
  deliverableMode?: SmmDeliverableMode | null;
  deliverables?: SmmDeliverableTotals | null;
  deliverableFrequency?: SmmDeliverableFrequency | null;
  goals?: SmmProjectGoalInput[];
  budgetLines?: SmmProjectBudgetLineInput[];
}

export interface SmmProjectListQuery extends PaginationQuery {
  search?: string;
  status?: SmmProjectStatus | 'ALL';
  managerUserId?: string;
  clientId?: string;
  health?: SmmProjectHealth;
  contractStatus?: SmmContractStatusFilter;
  budgetStatus?: SmmBudgetStatusFilter;
  contractFrom?: string;
  contractTo?: string;
}

export interface SmmProjectStatusCounts {
  ACTIVE: number;
  ON_HOLD: number;
  COMPLETED: number;
  ARCHIVED: number;
  ALL: number;
}

export type SmmProjectListResponse = PaginatedResult<SmmProjectListItem>;
export type SmmProjectDetailResponse = { project: SmmProjectDetail };
export type CreateSmmProjectResponse = { project: SmmProjectDetail };
export type UpdateSmmProjectResponse = { project: SmmProjectDetail };
export type SmmProjectStatusCountsResponse = { counts: SmmProjectStatusCounts };

export interface GenerateSmmCalendarRequest {
  /** Optional override of contract window; defaults to project contract/start-end. */
  startDate?: string | null;
  endDate?: string | null;
}

export interface GenerateSmmCalendarResponse {
  created: number;
  capped: boolean;
  items: Array<{
    id: string;
    title: string;
    contentType: SmmContentType;
    platform: SmmPlatform;
    status: SmmContentStatus;
    publishAt: IsoDateString | null;
  }>;
}

export interface UpsertSmmProjectMemberRequest {
  userId: string;
  role: SmmProjectMemberRole;
  isActive?: boolean;
  notes?: string | null;
  responsibility?: string | null;
  estimatedHours?: number | null;
}

export type SmmProjectMemberListResponse = { items: SmmProjectMemberDto[] };
export type UpsertSmmProjectMemberResponse = { member: SmmProjectMemberDto };

// ---------------------------------------------------------------------------
// Audience segments
// ---------------------------------------------------------------------------

export interface SmmAudienceSegmentListItem {
  id: string;
  projectId: string;
  name: string;
  ageRange: string | null;
  gender: string | null;
  location: string | null;
  sortOrder: number;
  personaCount: number;
  archivedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface SmmAudienceSegmentDetail extends SmmAudienceSegmentListItem {
  income: string | null;
  occupation: string | null;
  interests: string[];
  painPoints: string | null;
  needs: string | null;
  desires: string | null;
  objections: string | null;
  buyingMotivation: string | null;
  buyingBehavior: string | null;
  contentPreferences: string | null;
  researchSources: string | null;
  notes: string | null;
  insights: SmmInsightNote[];
  createdAt: IsoDateString;
}

export interface CreateSmmAudienceSegmentRequest {
  name: string;
  ageRange?: string | null;
  gender?: string | null;
  location?: string | null;
  income?: string | null;
  occupation?: string | null;
  interests?: string[];
  painPoints?: string | null;
  needs?: string | null;
  desires?: string | null;
  objections?: string | null;
  buyingMotivation?: string | null;
  buyingBehavior?: string | null;
  contentPreferences?: string | null;
  researchSources?: string | null;
  notes?: string | null;
  insights?: SmmInsightNote[];
  sortOrder?: number;
}

export interface UpdateSmmAudienceSegmentRequest extends Partial<CreateSmmAudienceSegmentRequest> {
  archivedAt?: string | null;
}

export interface SmmAudienceSegmentListQuery extends PaginationQuery {
  search?: string;
  includeArchived?: boolean;
}

export type SmmAudienceSegmentListResponse = PaginatedResult<SmmAudienceSegmentListItem>;
export type SmmAudienceSegmentDetailResponse = { segment: SmmAudienceSegmentDetail };
export type CreateSmmAudienceSegmentResponse = { segment: SmmAudienceSegmentDetail };
export type UpdateSmmAudienceSegmentResponse = { segment: SmmAudienceSegmentDetail };

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export interface SmmPersonaListItem {
  id: string;
  projectId: string;
  segmentId: string | null;
  segmentName: string | null;
  name: string;
  ageRange: string | null;
  gender: string | null;
  occupation: string | null;
  archivedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface SmmPersonaDetail extends SmmPersonaListItem {
  location: string | null;
  income: string | null;
  problems: string | null;
  needs: string | null;
  motivation: string | null;
  objections: string | null;
  preferredContent: string | null;
  notes: string | null;
  createdAt: IsoDateString;
}

export interface CreateSmmPersonaRequest {
  name: string;
  segmentId?: string | null;
  ageRange?: string | null;
  gender?: string | null;
  location?: string | null;
  occupation?: string | null;
  income?: string | null;
  problems?: string | null;
  needs?: string | null;
  motivation?: string | null;
  objections?: string | null;
  preferredContent?: string | null;
  notes?: string | null;
}

export interface UpdateSmmPersonaRequest extends Partial<CreateSmmPersonaRequest> {
  archivedAt?: string | null;
}

export interface SmmPersonaListQuery extends PaginationQuery {
  search?: string;
  segmentId?: string;
  includeArchived?: boolean;
}

export type SmmPersonaListResponse = PaginatedResult<SmmPersonaListItem>;
export type SmmPersonaDetailResponse = { persona: SmmPersonaDetail };
export type CreateSmmPersonaResponse = { persona: SmmPersonaDetail };
export type UpdateSmmPersonaResponse = { persona: SmmPersonaDetail };

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export interface SmmCompetitorListItem {
  id: string;
  projectId: string;
  name: string;
  platform: SmmPlatform;
  profileUrl: string | null;
  followers: number | null;
  researchDate: IsoDateString | null;
  archivedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface SmmCompetitorDetail extends SmmCompetitorListItem {
  postingFrequency: string | null;
  contentFormats: string | null;
  engagement: string | null;
  offers: string | null;
  pricing: string | null;
  positioning: string | null;
  strengths: string | null;
  weaknesses: string | null;
  bestContent: string | null;
  hooks: string | null;
  notes: string | null;
  createdAt: IsoDateString;
}

export interface CreateSmmCompetitorRequest {
  name: string;
  platform: SmmPlatform;
  profileUrl?: string | null;
  followers?: number | null;
  postingFrequency?: string | null;
  contentFormats?: string | null;
  engagement?: string | null;
  offers?: string | null;
  pricing?: string | null;
  positioning?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  bestContent?: string | null;
  hooks?: string | null;
  notes?: string | null;
  researchDate?: string | null;
}

export interface UpdateSmmCompetitorRequest extends Partial<CreateSmmCompetitorRequest> {
  archivedAt?: string | null;
}

export interface SmmCompetitorListQuery extends PaginationQuery {
  search?: string;
  platform?: SmmPlatform | 'ALL';
  includeArchived?: boolean;
}

export type SmmCompetitorListResponse = PaginatedResult<SmmCompetitorListItem>;
export type SmmCompetitorDetailResponse = { competitor: SmmCompetitorDetail };
export type CreateSmmCompetitorResponse = { competitor: SmmCompetitorDetail };
export type UpdateSmmCompetitorResponse = { competitor: SmmCompetitorDetail };

// ---------------------------------------------------------------------------
// Content references
// ---------------------------------------------------------------------------

export interface SmmContentReferenceListItem {
  id: string;
  projectId: string;
  title: string;
  platform: SmmPlatform;
  contentType: SmmContentType;
  sourceUrl: string | null;
  creatorName: string | null;
  tags: string[];
  mediaUrl: string | null;
  archivedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface SmmContentReferenceDetail extends SmmContentReferenceListItem {
  topic: string | null;
  hook: string | null;
  format: string | null;
  goal: string | null;
  whySaved: string | null;
  notes: string | null;
  mediaKey: string | null;
  createdAt: IsoDateString;
}

export interface CreateSmmContentReferenceRequest {
  title: string;
  platform: SmmPlatform;
  contentType: SmmContentType;
  sourceUrl?: string | null;
  creatorName?: string | null;
  topic?: string | null;
  hook?: string | null;
  format?: string | null;
  goal?: string | null;
  whySaved?: string | null;
  tags?: string[];
  notes?: string | null;
  mediaKey?: string | null;
  mediaUrl?: string | null;
}

export interface UpdateSmmContentReferenceRequest
  extends Partial<CreateSmmContentReferenceRequest> {
  archivedAt?: string | null;
}

export interface SmmContentReferenceListQuery extends PaginationQuery {
  search?: string;
  platform?: SmmPlatform | 'ALL';
  contentType?: SmmContentType | 'ALL';
  includeArchived?: boolean;
}

export type SmmContentReferenceListResponse = PaginatedResult<SmmContentReferenceListItem>;
export type SmmContentReferenceDetailResponse = { reference: SmmContentReferenceDetail };
export type CreateSmmContentReferenceResponse = { reference: SmmContentReferenceDetail };
export type UpdateSmmContentReferenceResponse = { reference: SmmContentReferenceDetail };

// ---------------------------------------------------------------------------
// Pillars
// ---------------------------------------------------------------------------

export interface SmmContentPillarListItem {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  contentCount: number;
  archivedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface SmmContentPillarDetail extends SmmContentPillarListItem {
  createdAt: IsoDateString;
}

export interface CreateSmmContentPillarRequest {
  name: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
}

export interface UpdateSmmContentPillarRequest extends Partial<CreateSmmContentPillarRequest> {
  archivedAt?: string | null;
}

export type SmmContentPillarListResponse = { items: SmmContentPillarListItem[] };
export type SmmContentPillarDetailResponse = { pillar: SmmContentPillarDetail };
export type CreateSmmContentPillarResponse = { pillar: SmmContentPillarDetail };
export type UpdateSmmContentPillarResponse = { pillar: SmmContentPillarDetail };

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export interface SmmCampaignListItem {
  id: string;
  projectId: string;
  name: string;
  status: string;
  startDate: IsoDateString | null;
  endDate: IsoDateString | null;
  contentCount: number;
  archivedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface SmmCampaignDetail extends SmmCampaignListItem {
  description: string | null;
  goal: string | null;
  createdAt: IsoDateString;
}

export interface CreateSmmCampaignRequest {
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  goal?: string | null;
  status?: string;
}

export interface UpdateSmmCampaignRequest extends Partial<CreateSmmCampaignRequest> {
  archivedAt?: string | null;
}

export interface SmmCampaignListQuery extends PaginationQuery {
  search?: string;
  includeArchived?: boolean;
}

export type SmmCampaignListResponse = PaginatedResult<SmmCampaignListItem>;
export type SmmCampaignDetailResponse = { campaign: SmmCampaignDetail };
export type CreateSmmCampaignResponse = { campaign: SmmCampaignDetail };
export type UpdateSmmCampaignResponse = { campaign: SmmCampaignDetail };

// ---------------------------------------------------------------------------
// Content plans
// ---------------------------------------------------------------------------

export interface SmmContentPlanSlotDto {
  id: string;
  date: IsoDateString;
  contentType: SmmContentType;
  platform: SmmPlatform | null;
  title: string | null;
  notes: string | null;
  contentItemId: string | null;
  sortOrder: number;
}

export interface SmmContentPlanSlotInput {
  date: string;
  contentType: SmmContentType;
  platform?: SmmPlatform | null;
  title?: string | null;
  notes?: string | null;
  contentItemId?: string | null;
  sortOrder?: number;
}

export interface SmmContentPlanListItem {
  id: string;
  projectId: string;
  name: string;
  periodStart: IsoDateString;
  periodEnd: IsoDateString;
  platforms: SmmPlatform[];
  contentTypes: SmmContentType[];
  slotCount: number;
  updatedAt: IsoDateString;
}

export interface SmmContentPlanDetail extends SmmContentPlanListItem {
  frequencyNotes: string | null;
  pillarIds: string[];
  goals: string | null;
  notes: string | null;
  slots: SmmContentPlanSlotDto[];
  createdAt: IsoDateString;
}

export interface CreateSmmContentPlanRequest {
  name: string;
  periodStart: string;
  periodEnd: string;
  platforms: SmmPlatform[];
  contentTypes: SmmContentType[];
  frequencyNotes?: string | null;
  pillarIds?: string[];
  goals?: string | null;
  notes?: string | null;
  slots?: SmmContentPlanSlotInput[];
}

export interface UpdateSmmContentPlanRequest {
  name?: string;
  periodStart?: string;
  periodEnd?: string;
  platforms?: SmmPlatform[];
  contentTypes?: SmmContentType[];
  frequencyNotes?: string | null;
  pillarIds?: string[] | null;
  goals?: string | null;
  notes?: string | null;
  slots?: SmmContentPlanSlotInput[];
}

export type SmmContentPlanListResponse = PaginatedResult<SmmContentPlanListItem>;
export type SmmContentPlanDetailResponse = { plan: SmmContentPlanDetail };
export type CreateSmmContentPlanResponse = { plan: SmmContentPlanDetail };
export type UpdateSmmContentPlanResponse = { plan: SmmContentPlanDetail };

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface SmmContentTemplateListItem {
  id: string;
  storeId: string;
  projectId: string | null;
  scope: SmmTemplateScope;
  name: string;
  contentType: SmmContentType;
  description: string | null;
  archivedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface SmmContentTemplateDetail extends SmmContentTemplateListItem {
  payload: unknown;
  createdBy: SmmUserSummary | null;
  createdAt: IsoDateString;
}

export interface CreateSmmContentTemplateRequest {
  name: string;
  contentType: SmmContentType;
  scope: SmmTemplateScope;
  projectId?: string | null;
  description?: string | null;
  payload: unknown;
}

export interface UpdateSmmContentTemplateRequest {
  name?: string;
  contentType?: SmmContentType;
  scope?: SmmTemplateScope;
  projectId?: string | null;
  description?: string | null;
  payload?: unknown;
  archivedAt?: string | null;
}

export interface SmmContentTemplateListQuery extends PaginationQuery {
  search?: string;
  scope?: SmmTemplateScope | 'ALL';
  projectId?: string;
  contentType?: SmmContentType | 'ALL';
  includeArchived?: boolean;
}

export type SmmContentTemplateListResponse = PaginatedResult<SmmContentTemplateListItem>;
export type SmmContentTemplateDetailResponse = { template: SmmContentTemplateDetail };
export type CreateSmmContentTemplateResponse = { template: SmmContentTemplateDetail };
export type UpdateSmmContentTemplateResponse = { template: SmmContentTemplateDetail };

// ---------------------------------------------------------------------------
// Content items
// ---------------------------------------------------------------------------

export interface SmmContentItemListItem {
  id: string;
  projectId: string;
  campaignId: string | null;
  campaignName: string | null;
  platform: SmmPlatform;
  contentType: SmmContentType;
  title: string;
  status: SmmContentStatus;
  publishAt: IsoDateString | null;
  pillarId: string | null;
  pillarName: string | null;
  assigneeCount: number;
  archivedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface SmmContentItemDetail extends SmmContentItemListItem {
  goal: string | null;
  topic: string | null;
  expectedResult: string | null;
  audienceSegmentId: string | null;
  personaId: string | null;
  referenceId: string | null;
  notes: string | null;
  format: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  caption: string | null;
  scriptNotes: string | null;
  shotList: string | null;
  productionNotes: string | null;
  headline: string | null;
  visualBrief: string | null;
  extras: unknown | null;
  createdBy: SmmUserSummary | null;
  blocks: SmmContentBlockDto[];
  createdAt: IsoDateString;
}

export interface CreateSmmContentItemRequest {
  title: string;
  platform: SmmPlatform;
  contentType: SmmContentType;
  campaignId?: string | null;
  publishAt?: string | null;
  goal?: string | null;
  topic?: string | null;
  expectedResult?: string | null;
  audienceSegmentId?: string | null;
  personaId?: string | null;
  pillarId?: string | null;
  status?: SmmContentStatus;
  referenceId?: string | null;
  notes?: string | null;
  format?: string | null;
  hook?: string | null;
  body?: string | null;
  cta?: string | null;
  caption?: string | null;
  scriptNotes?: string | null;
  shotList?: string | null;
  productionNotes?: string | null;
  headline?: string | null;
  visualBrief?: string | null;
  extras?: unknown | null;
  blocks?: SmmContentBlockInput[];
}

export interface UpdateSmmContentItemRequest extends Partial<CreateSmmContentItemRequest> {
  archivedAt?: string | null;
}

export interface TransitionSmmContentStatusRequest {
  status: SmmContentStatus;
}

export type SmmContentItemSort =
  | 'publishAt_asc'
  | 'publishAt_desc'
  | 'updatedAt_desc'
  | 'title_asc'
  | 'status_asc';

export interface SmmContentItemListQuery extends PaginationQuery {
  search?: string;
  status?: SmmContentStatus | 'ALL';
  platform?: SmmPlatform | 'ALL';
  contentType?: SmmContentType | 'ALL';
  campaignId?: string;
  pillarId?: string;
  includeArchived?: boolean;
  sort?: SmmContentItemSort;
}

export type SmmContentItemListResponse = PaginatedResult<SmmContentItemListItem>;
export type SmmContentItemDetailResponse = { contentItem: SmmContentItemDetail };
export type CreateSmmContentItemResponse = { contentItem: SmmContentItemDetail };
export type UpdateSmmContentItemResponse = { contentItem: SmmContentItemDetail };

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export interface SmmContentAssignmentListItem {
  id: string;
  contentItemId: string;
  contentTitle: string | null;
  userId: string;
  user: SmmUserSummary;
  role: string;
  responsibility: string | null;
  deadline: IsoDateString | null;
  status: SmmAssignmentStatus;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  updatedAt: IsoDateString;
}

export interface SmmContentAssignmentDetail extends SmmContentAssignmentListItem {
  notes: string | null;
  createdAt: IsoDateString;
}

export interface CreateSmmContentAssignmentRequest {
  contentItemId: string;
  userId: string;
  role: string;
  responsibility?: string | null;
  deadline?: string | null;
  status?: SmmAssignmentStatus;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  notes?: string | null;
}

export interface UpdateSmmContentAssignmentRequest {
  role?: string;
  responsibility?: string | null;
  deadline?: string | null;
  status?: SmmAssignmentStatus;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  notes?: string | null;
}

export interface SmmContentAssignmentListQuery extends PaginationQuery {
  contentItemId?: string;
  userId?: string;
  status?: SmmAssignmentStatus | 'ALL';
}

export type SmmContentAssignmentListResponse = PaginatedResult<SmmContentAssignmentListItem>;
export type SmmContentAssignmentDetailResponse = { assignment: SmmContentAssignmentDetail };
export type CreateSmmContentAssignmentResponse = { assignment: SmmContentAssignmentDetail };
export type UpdateSmmContentAssignmentResponse = { assignment: SmmContentAssignmentDetail };

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface SmmContentTaskListItem {
  id: string;
  projectId: string;
  contentItemId: string | null;
  assignmentId: string | null;
  userId: string;
  user: SmmUserSummary;
  title: string;
  status: SmmTaskStatus;
  deadline: IsoDateString | null;
  completedAt: IsoDateString | null;
  updatedAt: IsoDateString;
}

export interface SmmContentTaskDetail extends SmmContentTaskListItem {
  description: string | null;
  createdBy: SmmUserSummary | null;
  createdAt: IsoDateString;
}

export interface CreateSmmContentTaskRequest {
  projectId: string;
  userId: string;
  title: string;
  description?: string | null;
  contentItemId?: string | null;
  assignmentId?: string | null;
  status?: SmmTaskStatus;
  deadline?: string | null;
}

export interface UpdateSmmContentTaskRequest {
  title?: string;
  description?: string | null;
  userId?: string;
  contentItemId?: string | null;
  assignmentId?: string | null;
  status?: SmmTaskStatus;
  deadline?: string | null;
  completedAt?: string | null;
}

export interface SmmContentTaskListQuery extends PaginationQuery {
  projectId?: string;
  userId?: string;
  contentItemId?: string;
  status?: SmmTaskStatus | 'ALL';
}

export type SmmContentTaskListResponse = PaginatedResult<SmmContentTaskListItem>;
export type SmmContentTaskDetailResponse = { task: SmmContentTaskDetail };
export type CreateSmmContentTaskResponse = { task: SmmContentTaskDetail };
export type UpdateSmmContentTaskResponse = { task: SmmContentTaskDetail };

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

export interface SmmContentCostListItem {
  id: string;
  projectId: string;
  contentItemId: string | null;
  taskId: string | null;
  userId: string | null;
  user: SmmUserSummary | null;
  label: string;
  amount: Money;
  costDate: IsoDateString;
  updatedAt: IsoDateString;
}

export interface SmmContentCostDetail extends SmmContentCostListItem {
  notes: string | null;
  createdBy: SmmUserSummary | null;
  createdAt: IsoDateString;
}

export interface CreateSmmContentCostRequest {
  projectId: string;
  label: string;
  amount: Money;
  costDate: string;
  contentItemId?: string | null;
  taskId?: string | null;
  userId?: string | null;
  notes?: string | null;
}

export interface UpdateSmmContentCostRequest {
  label?: string;
  amount?: Money;
  costDate?: string;
  contentItemId?: string | null;
  taskId?: string | null;
  userId?: string | null;
  notes?: string | null;
}

export interface SmmContentCostListQuery extends PaginationQuery {
  projectId?: string;
  contentItemId?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export type SmmContentCostListResponse = PaginatedResult<SmmContentCostListItem>;
export type SmmContentCostDetailResponse = { cost: SmmContentCostDetail };
export type CreateSmmContentCostResponse = { cost: SmmContentCostDetail };
export type UpdateSmmContentCostResponse = { cost: SmmContentCostDetail };

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface SmmContentAnalyticsDto {
  id: string;
  contentItemId: string;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  engagement: number | null;
  profileVisits: number | null;
  leads: number | null;
  conversions: number | null;
  sales: number | null;
  notes: string | null;
  recordedAt: IsoDateString | null;
  recordedBy: SmmUserSummary | null;
  updatedAt: IsoDateString;
}

export interface UpsertSmmContentAnalyticsRequest {
  reach?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  engagement?: number | null;
  profileVisits?: number | null;
  leads?: number | null;
  conversions?: number | null;
  sales?: number | null;
  notes?: string | null;
  recordedAt?: string | null;
}

export type SmmContentAnalyticsDetailResponse = { analytics: SmmContentAnalyticsDto };
export type UpsertSmmContentAnalyticsResponse = { analytics: SmmContentAnalyticsDto };

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export interface SmmContentApprovalListItem {
  id: string;
  contentItemId: string;
  decision: SmmApprovalDecision;
  reviewerId: string | null;
  reviewer: SmmUserSummary | null;
  reviewerRole: string | null;
  comment: string | null;
  decidedAt: IsoDateString | null;
  createdAt: IsoDateString;
}

export interface CreateSmmContentApprovalRequest {
  contentItemId: string;
  decision?: SmmApprovalDecision;
  reviewerRole?: string | null;
  comment?: string | null;
}

export interface DecideSmmContentApprovalRequest {
  decision: SmmApprovalDecision;
  comment?: string | null;
}

export type SmmContentApprovalListResponse = { items: SmmContentApprovalListItem[] };
export type CreateSmmContentApprovalResponse = { approval: SmmContentApprovalListItem };
export type DecideSmmContentApprovalResponse = { approval: SmmContentApprovalListItem };

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface SmmContentFileListItem {
  id: string;
  projectId: string;
  contentItemId: string | null;
  kind: SmmFileKind;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: SmmUserSummary | null;
  createdAt: IsoDateString;
}

export interface CreateSmmContentFileRequest {
  projectId: string;
  kind: SmmFileKind;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  contentItemId?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export type SmmContentFileListResponse = { items: SmmContentFileListItem[] };
export type CreateSmmContentFileResponse = { file: SmmContentFileListItem };

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export interface SmmActivityListItem {
  id: string;
  projectId: string;
  actorUserId: string | null;
  actor: SmmUserSummary | null;
  eventType: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: unknown | null;
  createdAt: IsoDateString;
}

export interface SmmActivityListQuery extends PaginationQuery {
  entityType?: string;
  entityId?: string;
  eventType?: string;
}

export type SmmActivityListResponse = PaginatedResult<SmmActivityListItem>;

// ---------------------------------------------------------------------------
// Progress stats
// ---------------------------------------------------------------------------

export interface SmmProgressStatusBucket {
  status: SmmContentStatus;
  group: SmmProgressStatusGroup;
  count: number;
}

export interface SmmProgressStats {
  projectId: string;
  totalContent: number;
  byStatus: SmmProgressStatusBucket[];
  byGroup: Record<SmmProgressStatusGroup, number>;
  overdueAssignments: number;
  overdueTasks: number;
  pendingApprovals: number;
  publishedThisPeriod: number;
  totalCost: Money;
}

export type SmmProgressStatsResponse = { stats: SmmProgressStats };

// ---------------------------------------------------------------------------
// Agency dashboard (store-wide control center)
// ---------------------------------------------------------------------------

export type SmmAttentionSeverity = 'critical' | 'warning' | 'info';

export type SmmAttentionKind =
  | 'OVERDUE_TASKS'
  | 'CLIENT_APPROVAL'
  | 'DEADLINE'
  | 'BUDGET'
  | 'INTERNAL_REVIEW';

export interface SmmDashboardPeriodMeta {
  preset: SmmDashboardPeriodPreset;
  from: IsoDateString;
  to: IsoDateString;
  label: string;
  timeZone: string;
}

export interface SmmDashboardKpis {
  activeProjects: number;
  /** ACTIVE projects created in the selected period (for trend footnote). */
  activeProjectsOpenedInPeriod: number;
  /** Tasks + assignments due today or currently in progress. */
  todayWorkCount: number;
  todayOverdueCount: number;
  /** Content with publishAt / planned date in the current store week. */
  weekContentPlanned: number;
  /** Share of week content in READY or LIVE groups (0–100). */
  weekContentReadyPct: number;
  /**
   * Contracted project budgets booked in the period
   * (`startDate ?? createdAt` in range). NOT client ad spend.
   */
  revenue: Money;
  /** Store `Expense` ACTIVE rows in the period (agency operating costs). */
  expenses: Money;
  /** revenue − expenses. */
  profit: Money;
  /** Project delivery costs (`SmmContentCost`) in the period — separate from ad budgets. */
  contentCosts: Money;
}

export interface SmmDashboardTodayItem {
  id: string;
  kind: 'TASK' | 'ASSIGNMENT';
  title: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  assigneeName: string | null;
  status: string;
  /** HIGH when overdue; otherwise MEDIUM when due today; LOW otherwise. */
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  deadline: IsoDateString | null;
  isOverdue: boolean;
  href: string;
}

export interface SmmDashboardAttentionItem {
  kind: SmmAttentionKind;
  severity: SmmAttentionSeverity;
  count: number;
  label: string;
  href: string | null;
}

export interface SmmDashboardProjectCard {
  id: string;
  name: string;
  clientName: string | null;
  status: SmmProjectStatus;
  contentProgressPct: number;
  taskProgressPct: number;
  deadline: IsoDateString | null;
  teamCount: number;
  managerName: string | null;
  health: SmmProjectHealth;
  overdueTasks: number;
  pendingClientApprovals: number;
  pendingInternalReviews: number;
  budgetPlanned: Money | null;
  contentCostTotal: Money;
}

export interface SmmDashboardFinancePoint {
  label: string;
  /** ISO start of bucket. */
  start: IsoDateString;
  revenue: Money;
  expenses: Money;
  profit: Money;
}

export interface SmmDashboardFinance {
  preset: SmmFinanceChartPreset;
  revenue: Money;
  expenses: Money;
  profit: Money;
  points: SmmDashboardFinancePoint[];
}

export interface SmmDashboardTeamMemberLoad {
  userId: string;
  fullName: string;
  /** Open (PENDING + IN_PROGRESS) assignments across accessible projects. */
  activeAssignments: number;
  estimatedMinutes: number;
  /**
   * Capacity = 40h/week. Null when estimated minutes are missing for all
   * open assignments — UI must label as "Faol topshiriqlar", not "Workload".
   */
  workloadPct: number | null;
  inProgressCount: number;
  pendingCount: number;
}

export interface SmmDashboardTeam {
  employeeCount: number;
  working: number;
  pending: number;
  completedRecently: number;
  members: SmmDashboardTeamMemberLoad[];
}

export interface SmmDashboardContentPipelineBucket {
  status: SmmContentStatus;
  count: number;
}

export interface SmmDashboardWeeklyDay {
  /** `YYYY-MM-DD` in store timezone. */
  date: string;
  weekday: number;
  label: string;
  isToday: boolean;
  reels: number;
  posts: number;
  stories: number;
  other: number;
}

export interface SmmDashboardApprovalItem {
  approvalId: string;
  contentItemId: string;
  contentTitle: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  submittedAt: IsoDateString;
  waitingHours: number;
  responsibleName: string | null;
  href: string;
}

export interface SmmDashboardActivityItem {
  id: string;
  projectId: string;
  projectName: string;
  summary: string;
  actorName: string | null;
  eventType: string;
  createdAt: IsoDateString;
  href: string;
}

export interface SmmAgencyDashboard {
  period: SmmDashboardPeriodMeta;
  /** True when the caller is only a CLIENT member — finance/team salary-like data omitted. */
  isClientView: boolean;
  kpis: SmmDashboardKpis;
  todayWork: SmmDashboardTodayItem[];
  attention: SmmDashboardAttentionItem[];
  projects: SmmDashboardProjectCard[];
  finance: SmmDashboardFinance | null;
  team: SmmDashboardTeam | null;
  contentPipeline: SmmDashboardContentPipelineBucket[];
  weeklyContent: SmmDashboardWeeklyDay[];
  clientApprovals: SmmDashboardApprovalItem[];
  recentActivity: SmmDashboardActivityItem[];
}

export type SmmAgencyDashboardResponse = { dashboard: SmmAgencyDashboard };

export interface SmmAgencyDashboardQuery {
  preset?: SmmDashboardPeriodPreset;
  from?: string;
  to?: string;
  financePreset?: SmmFinanceChartPreset;
}
