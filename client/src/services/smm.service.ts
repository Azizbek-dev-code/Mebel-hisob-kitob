import type {
  CreateSmmAudienceSegmentRequest,
  CreateSmmAudienceSegmentResponse,
  CreateSmmCampaignRequest,
  CreateSmmCampaignResponse,
  CreateSmmCompetitorRequest,
  CreateSmmCompetitorResponse,
  CreateSmmContentApprovalResponse,
  CreateSmmContentAssignmentRequest,
  CreateSmmContentAssignmentResponse,
  CreateSmmContentCostRequest,
  CreateSmmContentCostResponse,
  CreateSmmContentFileResponse,
  CreateSmmContentItemRequest,
  CreateSmmContentItemResponse,
  CreateSmmContentPillarRequest,
  CreateSmmContentPillarResponse,
  CreateSmmContentPlanRequest,
  CreateSmmContentPlanResponse,
  CreateSmmContentReferenceRequest,
  CreateSmmContentReferenceResponse,
  CreateSmmContentTaskRequest,
  CreateSmmContentTaskResponse,
  CreateSmmContentTemplateRequest,
  CreateSmmContentTemplateResponse,
  CreateSmmPersonaRequest,
  CreateSmmPersonaResponse,
  CreateSmmProjectRequest,
  CreateSmmProjectResponse,
  DecideSmmContentApprovalRequest,
  DecideSmmContentApprovalResponse,
  SmmAgencyDashboard,
  SmmAgencyDashboardQuery,
  SmmAgencyDashboardResponse,
  SmmContentAssignmentListItem,
  SmmActivityListQuery,
  SmmActivityListResponse,
  SmmAudienceSegmentDetailResponse,
  SmmAudienceSegmentListQuery,
  SmmAudienceSegmentListResponse,
  SmmCampaignListQuery,
  SmmCampaignListResponse,
  SmmCompetitorDetailResponse,
  SmmCompetitorListQuery,
  SmmCompetitorListResponse,
  SmmContentApprovalListResponse,
  SmmContentAnalyticsDetailResponse,
  SmmContentBlockInput,
  SmmContentCostListQuery,
  SmmContentCostListResponse,
  SmmContentFileListResponse,
  SmmContentItemDetail,
  SmmContentItemDetailResponse,
  SmmContentItemListItem,
  SmmContentItemListQuery,
  SmmContentItemListResponse,
  SmmContentPillarListResponse,
  SmmContentPlanDetailResponse,
  SmmContentPlanListResponse,
  SmmContentPlanSlotDto,
  SmmContentPlanSlotInput,
  SmmContentReferenceDetailResponse,
  SmmContentReferenceListQuery,
  SmmContentReferenceListResponse,
  SmmContentStatus,
  SmmContentTaskListQuery,
  SmmContentTaskListResponse,
  SmmContentTemplateListQuery,
  SmmContentTemplateListResponse,
  SmmPersonaDetailResponse,
  SmmPersonaListQuery,
  SmmPersonaListResponse,
  SmmProgressStatsResponse,
  SmmProjectDetail,
  SmmProjectDetailResponse,
  SmmProjectListQuery,
  SmmProjectListResponse,
  SmmProjectMemberListResponse,
  TransitionSmmContentStatusRequest,
  UpdateSmmAudienceSegmentRequest,
  UpdateSmmAudienceSegmentResponse,
  UpdateSmmCampaignRequest,
  UpdateSmmCampaignResponse,
  UpdateSmmCompetitorRequest,
  UpdateSmmCompetitorResponse,
  UpdateSmmContentAssignmentRequest,
  UpdateSmmContentAssignmentResponse,
  UpdateSmmContentCostRequest,
  UpdateSmmContentCostResponse,
  UpdateSmmContentItemRequest,
  UpdateSmmContentItemResponse,
  UpdateSmmContentPillarRequest,
  UpdateSmmContentPillarResponse,
  UpdateSmmContentPlanRequest,
  UpdateSmmContentPlanResponse,
  UpdateSmmContentReferenceRequest,
  UpdateSmmContentReferenceResponse,
  UpdateSmmContentTaskRequest,
  UpdateSmmContentTaskResponse,
  UpdateSmmContentTemplateRequest,
  UpdateSmmContentTemplateResponse,
  UpdateSmmPersonaRequest,
  UpdateSmmPersonaResponse,
  UpdateSmmProjectRequest,
  UpdateSmmProjectResponse,
  UpsertSmmContentAnalyticsRequest,
  UpsertSmmContentAnalyticsResponse,
  UpsertSmmProjectMemberRequest,
  UpsertSmmProjectMemberResponse,
} from '@furniture-erp/shared';

import { apiClient } from '@/lib/api-client';

/** Calendar contract (not yet in shared types). */
export type SmmCalendarView = 'month' | 'week' | 'day' | 'list';

export interface SmmCalendarQuery {
  view?: SmmCalendarView;
  from?: string;
  to?: string;
}

export type SmmCalendarResponse = {
  items: SmmContentItemListItem[];
  view: string;
};

export type SmmContentAssignmentListResponse = { items: SmmContentAssignmentListItem[] };

/**
 * SMM Agency CMS API — projects, audience, content pipeline, calendar, team.
 * Paths match `/api/smm/...` (apiClient prefixes `/api`).
 */
export const smmService = {
  // ── Agency dashboard ────────────────────────────────────────────────────
  async getAgencyDashboard(
    query: SmmAgencyDashboardQuery = {},
    signal?: AbortSignal,
  ): Promise<SmmAgencyDashboard> {
    const { dashboard } = await apiClient.get<SmmAgencyDashboardResponse>('/smm/dashboard', {
      searchParams: {
        preset: query.preset,
        from: query.from,
        to: query.to,
        financePreset: query.financePreset,
      },
      signal,
    });
    return dashboard;
  },

  // ── Projects ────────────────────────────────────────────────────────────
  listProjects(query: SmmProjectListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmProjectListResponse>('/smm/projects', {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
      },
      signal,
    });
  },

  async getProject(projectId: string, signal?: AbortSignal): Promise<SmmProjectDetail> {
    const { project } = await apiClient.get<SmmProjectDetailResponse>(
      `/smm/projects/${projectId}`,
      { signal },
    );
    return project;
  },

  async createProject(body: CreateSmmProjectRequest): Promise<SmmProjectDetail> {
    const { project } = await apiClient.post<CreateSmmProjectResponse>('/smm/projects', { body });
    return project;
  },

  async updateProject(projectId: string, body: UpdateSmmProjectRequest): Promise<SmmProjectDetail> {
    const { project } = await apiClient.patch<UpdateSmmProjectResponse>(
      `/smm/projects/${projectId}`,
      { body },
    );
    return project;
  },

  async archiveProject(projectId: string): Promise<SmmProjectDetail> {
    const { project } = await apiClient.post<UpdateSmmProjectResponse>(
      `/smm/projects/${projectId}/archive`,
    );
    return project;
  },

  async getProgress(projectId: string, signal?: AbortSignal) {
    const { stats } = await apiClient.get<SmmProgressStatsResponse>(
      `/smm/projects/${projectId}/progress`,
      { signal },
    );
    return stats;
  },

  listActivity(projectId: string, query: SmmActivityListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmActivityListResponse>(`/smm/projects/${projectId}/activity`, {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        entityType: query.entityType,
        entityId: query.entityId,
        eventType: query.eventType,
      },
      signal,
    });
  },

  // ── Members ─────────────────────────────────────────────────────────────
  async listMembers(projectId: string, signal?: AbortSignal) {
    const { items } = await apiClient.get<SmmProjectMemberListResponse>(
      `/smm/projects/${projectId}/members`,
      { signal },
    );
    return items;
  },

  async upsertMember(projectId: string, body: UpsertSmmProjectMemberRequest) {
    const { member } = await apiClient.post<UpsertSmmProjectMemberResponse>(
      `/smm/projects/${projectId}/members`,
      { body },
    );
    return member;
  },

  async updateMember(
    projectId: string,
    memberId: string,
    body: Partial<UpsertSmmProjectMemberRequest>,
  ) {
    const { member } = await apiClient.patch<UpsertSmmProjectMemberResponse>(
      `/smm/projects/${projectId}/members/${memberId}`,
      { body },
    );
    return member;
  },

  async removeMember(projectId: string, memberId: string) {
    await apiClient.delete(`/smm/projects/${projectId}/members/${memberId}`);
  },

  // ── Audience ────────────────────────────────────────────────────────────
  listAudience(projectId: string, query: SmmAudienceSegmentListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmAudienceSegmentListResponse>(
      `/smm/projects/${projectId}/audience`,
      {
        searchParams: {
          page: query.page,
          pageSize: query.pageSize,
          search: query.search,
          includeArchived: query.includeArchived,
        },
        signal,
      },
    );
  },

  async getAudienceSegment(projectId: string, segmentId: string, signal?: AbortSignal) {
    const { segment } = await apiClient.get<SmmAudienceSegmentDetailResponse>(
      `/smm/projects/${projectId}/audience/${segmentId}`,
      { signal },
    );
    return segment;
  },

  async createAudienceSegment(projectId: string, body: CreateSmmAudienceSegmentRequest) {
    const { segment } = await apiClient.post<CreateSmmAudienceSegmentResponse>(
      `/smm/projects/${projectId}/audience`,
      { body },
    );
    return segment;
  },

  async updateAudienceSegment(
    projectId: string,
    segmentId: string,
    body: UpdateSmmAudienceSegmentRequest,
  ) {
    const { segment } = await apiClient.patch<UpdateSmmAudienceSegmentResponse>(
      `/smm/projects/${projectId}/audience/${segmentId}`,
      { body },
    );
    return segment;
  },

  async archiveAudienceSegment(projectId: string, segmentId: string) {
    const { segment } = await apiClient.post<UpdateSmmAudienceSegmentResponse>(
      `/smm/projects/${projectId}/audience/${segmentId}/archive`,
    );
    return segment;
  },

  // ── Personas ────────────────────────────────────────────────────────────
  listPersonas(projectId: string, query: SmmPersonaListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmPersonaListResponse>(`/smm/projects/${projectId}/personas`, {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        segmentId: query.segmentId,
        includeArchived: query.includeArchived,
      },
      signal,
    });
  },

  async getPersona(projectId: string, personaId: string, signal?: AbortSignal) {
    const { persona } = await apiClient.get<SmmPersonaDetailResponse>(
      `/smm/projects/${projectId}/personas/${personaId}`,
      { signal },
    );
    return persona;
  },

  async createPersona(projectId: string, body: CreateSmmPersonaRequest) {
    const { persona } = await apiClient.post<CreateSmmPersonaResponse>(
      `/smm/projects/${projectId}/personas`,
      { body },
    );
    return persona;
  },

  async updatePersona(projectId: string, personaId: string, body: UpdateSmmPersonaRequest) {
    const { persona } = await apiClient.patch<UpdateSmmPersonaResponse>(
      `/smm/projects/${projectId}/personas/${personaId}`,
      { body },
    );
    return persona;
  },

  async archivePersona(projectId: string, personaId: string) {
    const { persona } = await apiClient.post<UpdateSmmPersonaResponse>(
      `/smm/projects/${projectId}/personas/${personaId}/archive`,
    );
    return persona;
  },

  // ── Competitors ─────────────────────────────────────────────────────────
  listCompetitors(projectId: string, query: SmmCompetitorListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmCompetitorListResponse>(`/smm/projects/${projectId}/competitors`, {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        platform: query.platform,
        includeArchived: query.includeArchived,
      },
      signal,
    });
  },

  async getCompetitor(projectId: string, competitorId: string, signal?: AbortSignal) {
    const { competitor } = await apiClient.get<SmmCompetitorDetailResponse>(
      `/smm/projects/${projectId}/competitors/${competitorId}`,
      { signal },
    );
    return competitor;
  },

  async createCompetitor(projectId: string, body: CreateSmmCompetitorRequest) {
    const { competitor } = await apiClient.post<CreateSmmCompetitorResponse>(
      `/smm/projects/${projectId}/competitors`,
      { body },
    );
    return competitor;
  },

  async updateCompetitor(
    projectId: string,
    competitorId: string,
    body: UpdateSmmCompetitorRequest,
  ) {
    const { competitor } = await apiClient.patch<UpdateSmmCompetitorResponse>(
      `/smm/projects/${projectId}/competitors/${competitorId}`,
      { body },
    );
    return competitor;
  },

  async archiveCompetitor(projectId: string, competitorId: string) {
    const { competitor } = await apiClient.post<UpdateSmmCompetitorResponse>(
      `/smm/projects/${projectId}/competitors/${competitorId}/archive`,
    );
    return competitor;
  },

  // ── References ──────────────────────────────────────────────────────────
  listReferences(
    projectId: string,
    query: SmmContentReferenceListQuery = {},
    signal?: AbortSignal,
  ) {
    return apiClient.get<SmmContentReferenceListResponse>(
      `/smm/projects/${projectId}/references`,
      {
        searchParams: {
          page: query.page,
          pageSize: query.pageSize,
          search: query.search,
          platform: query.platform,
          contentType: query.contentType,
          includeArchived: query.includeArchived,
        },
        signal,
      },
    );
  },

  async getReference(projectId: string, referenceId: string, signal?: AbortSignal) {
    const { reference } = await apiClient.get<SmmContentReferenceDetailResponse>(
      `/smm/projects/${projectId}/references/${referenceId}`,
      { signal },
    );
    return reference;
  },

  async createReference(projectId: string, body: CreateSmmContentReferenceRequest) {
    const { reference } = await apiClient.post<CreateSmmContentReferenceResponse>(
      `/smm/projects/${projectId}/references`,
      { body },
    );
    return reference;
  },

  async updateReference(
    projectId: string,
    referenceId: string,
    body: UpdateSmmContentReferenceRequest,
  ) {
    const { reference } = await apiClient.patch<UpdateSmmContentReferenceResponse>(
      `/smm/projects/${projectId}/references/${referenceId}`,
      { body },
    );
    return reference;
  },

  async archiveReference(projectId: string, referenceId: string) {
    const { reference } = await apiClient.post<UpdateSmmContentReferenceResponse>(
      `/smm/projects/${projectId}/references/${referenceId}/archive`,
    );
    return reference;
  },

  async duplicateReferenceIdea(projectId: string, referenceId: string) {
    const { contentItem } = await apiClient.post<CreateSmmContentItemResponse>(
      `/smm/projects/${projectId}/references/${referenceId}/duplicate-idea`,
    );
    return contentItem;
  },

  // ── Pillars ─────────────────────────────────────────────────────────────
  async listPillars(projectId: string, signal?: AbortSignal) {
    const { items } = await apiClient.get<SmmContentPillarListResponse>(
      `/smm/projects/${projectId}/pillars`,
      { signal },
    );
    return items;
  },

  async createPillar(projectId: string, body: CreateSmmContentPillarRequest) {
    const { pillar } = await apiClient.post<CreateSmmContentPillarResponse>(
      `/smm/projects/${projectId}/pillars`,
      { body },
    );
    return pillar;
  },

  async updatePillar(projectId: string, pillarId: string, body: UpdateSmmContentPillarRequest) {
    const { pillar } = await apiClient.patch<UpdateSmmContentPillarResponse>(
      `/smm/projects/${projectId}/pillars/${pillarId}`,
      { body },
    );
    return pillar;
  },

  async archivePillar(projectId: string, pillarId: string) {
    const { pillar } = await apiClient.post<UpdateSmmContentPillarResponse>(
      `/smm/projects/${projectId}/pillars/${pillarId}/archive`,
    );
    return pillar;
  },

  // ── Campaigns ───────────────────────────────────────────────────────────
  listCampaigns(projectId: string, query: SmmCampaignListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmCampaignListResponse>(`/smm/projects/${projectId}/campaigns`, {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        includeArchived: query.includeArchived,
      },
      signal,
    });
  },

  async createCampaign(projectId: string, body: CreateSmmCampaignRequest) {
    const { campaign } = await apiClient.post<CreateSmmCampaignResponse>(
      `/smm/projects/${projectId}/campaigns`,
      { body },
    );
    return campaign;
  },

  async updateCampaign(projectId: string, campaignId: string, body: UpdateSmmCampaignRequest) {
    const { campaign } = await apiClient.patch<UpdateSmmCampaignResponse>(
      `/smm/projects/${projectId}/campaigns/${campaignId}`,
      { body },
    );
    return campaign;
  },

  async archiveCampaign(projectId: string, campaignId: string) {
    const { campaign } = await apiClient.post<UpdateSmmCampaignResponse>(
      `/smm/projects/${projectId}/campaigns/${campaignId}/archive`,
    );
    return campaign;
  },

  // ── Plans ───────────────────────────────────────────────────────────────
  listPlans(projectId: string, signal?: AbortSignal) {
    return apiClient.get<SmmContentPlanListResponse>(`/smm/projects/${projectId}/plans`, {
      signal,
    });
  },

  async getPlan(projectId: string, planId: string, signal?: AbortSignal) {
    const { plan } = await apiClient.get<SmmContentPlanDetailResponse>(
      `/smm/projects/${projectId}/plans/${planId}`,
      { signal },
    );
    return plan;
  },

  async createPlan(projectId: string, body: CreateSmmContentPlanRequest) {
    const { plan } = await apiClient.post<CreateSmmContentPlanResponse>(
      `/smm/projects/${projectId}/plans`,
      { body },
    );
    return plan;
  },

  async updatePlan(projectId: string, planId: string, body: UpdateSmmContentPlanRequest) {
    const { plan } = await apiClient.patch<UpdateSmmContentPlanResponse>(
      `/smm/projects/${projectId}/plans/${planId}`,
      { body },
    );
    return plan;
  },

  async createPlanSlot(projectId: string, planId: string, body: SmmContentPlanSlotInput) {
    const { slot } = await apiClient.post<{ slot: SmmContentPlanSlotDto }>(
      `/smm/projects/${projectId}/plans/${planId}/slots`,
      { body },
    );
    return slot;
  },

  async updatePlanSlot(
    projectId: string,
    planId: string,
    slotId: string,
    body: Partial<SmmContentPlanSlotInput>,
  ) {
    const { slot } = await apiClient.patch<{ slot: SmmContentPlanSlotDto }>(
      `/smm/projects/${projectId}/plans/${planId}/slots/${slotId}`,
      { body },
    );
    return slot;
  },

  async deletePlanSlot(projectId: string, planId: string, slotId: string) {
    await apiClient.delete(`/smm/projects/${projectId}/plans/${planId}/slots/${slotId}`);
  },

  // ── Content ─────────────────────────────────────────────────────────────
  listContent(projectId: string, query: SmmContentItemListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmContentItemListResponse>(`/smm/projects/${projectId}/content`, {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        status: query.status,
        platform: query.platform,
        contentType: query.contentType,
        campaignId: query.campaignId,
        pillarId: query.pillarId,
        includeArchived: query.includeArchived,
        sort: query.sort,
      },
      signal,
    });
  },

  getCalendar(projectId: string, query: SmmCalendarQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmCalendarResponse>(`/smm/projects/${projectId}/calendar`, {
      searchParams: {
        view: query.view,
        from: query.from,
        to: query.to,
      },
      signal,
    });
  },

  async getContent(contentId: string, signal?: AbortSignal): Promise<SmmContentItemDetail> {
    const { contentItem } = await apiClient.get<SmmContentItemDetailResponse>(
      `/smm/content/${contentId}`,
      { signal },
    );
    return contentItem;
  },

  async createContent(projectId: string, body: CreateSmmContentItemRequest) {
    const { contentItem } = await apiClient.post<CreateSmmContentItemResponse>(
      `/smm/projects/${projectId}/content`,
      { body },
    );
    return contentItem;
  },

  async updateContent(contentId: string, body: UpdateSmmContentItemRequest) {
    const { contentItem } = await apiClient.patch<UpdateSmmContentItemResponse>(
      `/smm/content/${contentId}`,
      { body },
    );
    return contentItem;
  },

  async archiveContent(contentId: string) {
    const { contentItem } = await apiClient.post<UpdateSmmContentItemResponse>(
      `/smm/content/${contentId}/archive`,
    );
    return contentItem;
  },

  async duplicateContent(contentId: string) {
    const { contentItem } = await apiClient.post<CreateSmmContentItemResponse>(
      `/smm/content/${contentId}/duplicate`,
    );
    return contentItem;
  },

  async transitionContentStatus(contentId: string, status: SmmContentStatus) {
    const body: TransitionSmmContentStatusRequest = { status };
    const { contentItem } = await apiClient.post<UpdateSmmContentItemResponse>(
      `/smm/content/${contentId}/status`,
      { body },
    );
    return contentItem;
  },

  async saveContentAsTemplate(
    contentId: string,
    body: { name: string; scope: 'PROJECT' | 'AGENCY'; description?: string | null },
  ) {
    const { template } = await apiClient.post<CreateSmmContentTemplateResponse>(
      `/smm/content/${contentId}/save-as-template`,
      { body },
    );
    return template;
  },

  async replaceBlocks(contentId: string, blocks: SmmContentBlockInput[]) {
    const { contentItem } = await apiClient.put<UpdateSmmContentItemResponse>(
      `/smm/content/${contentId}/blocks`,
      { body: { blocks } },
    );
    return contentItem;
  },

  // ── Assignments (content-scoped) ────────────────────────────────────────
  async listAssignments(contentItemId: string, signal?: AbortSignal) {
    const { items } = await apiClient.get<SmmContentAssignmentListResponse>(
      `/smm/content/${contentItemId}/assignments`,
      { signal },
    );
    return { items };
  },

  async createAssignment(
    contentItemId: string,
    body: Omit<CreateSmmContentAssignmentRequest, 'contentItemId'>,
  ) {
    const { assignment } = await apiClient.post<CreateSmmContentAssignmentResponse>(
      `/smm/content/${contentItemId}/assignments`,
      { body },
    );
    return assignment;
  },

  async updateAssignment(
    contentItemId: string,
    assignmentId: string,
    body: UpdateSmmContentAssignmentRequest,
  ) {
    const { assignment } = await apiClient.patch<UpdateSmmContentAssignmentResponse>(
      `/smm/content/${contentItemId}/assignments/${assignmentId}`,
      { body },
    );
    return assignment;
  },

  async deleteAssignment(contentItemId: string, assignmentId: string) {
    await apiClient.delete(`/smm/content/${contentItemId}/assignments/${assignmentId}`);
  },

  async generateTaskFromAssignment(contentItemId: string, assignmentId: string) {
    const { task } = await apiClient.post<CreateSmmContentTaskResponse>(
      `/smm/content/${contentItemId}/assignments/${assignmentId}/generate-task`,
    );
    return task;
  },

  // ── Tasks ───────────────────────────────────────────────────────────────
  listTasks(projectId: string, query: SmmContentTaskListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmContentTaskListResponse>(`/smm/projects/${projectId}/tasks`, {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        userId: query.userId,
        contentItemId: query.contentItemId,
        status: query.status,
      },
      signal,
    });
  },

  async createTask(projectId: string, body: Omit<CreateSmmContentTaskRequest, 'projectId'>) {
    const { task } = await apiClient.post<CreateSmmContentTaskResponse>(
      `/smm/projects/${projectId}/tasks`,
      { body },
    );
    return task;
  },

  async updateTask(taskId: string, body: UpdateSmmContentTaskRequest) {
    const { task } = await apiClient.patch<UpdateSmmContentTaskResponse>(`/smm/tasks/${taskId}`, {
      body,
    });
    return task;
  },

  // ── Costs ───────────────────────────────────────────────────────────────
  listCosts(projectId: string, query: SmmContentCostListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmContentCostListResponse>(`/smm/projects/${projectId}/costs`, {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        contentItemId: query.contentItemId,
        userId: query.userId,
        from: query.from,
        to: query.to,
      },
      signal,
    });
  },

  async createCost(projectId: string, body: Omit<CreateSmmContentCostRequest, 'projectId'>) {
    const { cost } = await apiClient.post<CreateSmmContentCostResponse>(
      `/smm/projects/${projectId}/costs`,
      { body },
    );
    return cost;
  },

  async updateCost(costId: string, body: UpdateSmmContentCostRequest) {
    const { cost } = await apiClient.patch<UpdateSmmContentCostResponse>(`/smm/costs/${costId}`, {
      body,
    });
    return cost;
  },

  async deleteCost(costId: string) {
    await apiClient.delete(`/smm/costs/${costId}`);
  },

  // ── Analytics ───────────────────────────────────────────────────────────
  async getAnalytics(contentId: string, signal?: AbortSignal) {
    const { analytics } = await apiClient.get<SmmContentAnalyticsDetailResponse>(
      `/smm/content/${contentId}/analytics`,
      { signal },
    );
    return analytics;
  },

  async upsertAnalytics(contentId: string, body: UpsertSmmContentAnalyticsRequest) {
    const { analytics } = await apiClient.put<UpsertSmmContentAnalyticsResponse>(
      `/smm/content/${contentId}/analytics`,
      { body },
    );
    return analytics;
  },

  // ── Approvals ───────────────────────────────────────────────────────────
  async listApprovals(contentId: string, signal?: AbortSignal) {
    const { items } = await apiClient.get<SmmContentApprovalListResponse>(
      `/smm/content/${contentId}/approvals`,
      { signal },
    );
    return items;
  },

  /** Creates a new approval row (PENDING = request review; other decisions = decide). */
  async createApproval(contentId: string, body: DecideSmmContentApprovalRequest) {
    const { approval } = await apiClient.post<
      CreateSmmContentApprovalResponse | DecideSmmContentApprovalResponse
    >(`/smm/content/${contentId}/approvals`, { body });
    return approval;
  },

  /** Same endpoint as createApproval — server always inserts a new decision row. */
  async decideApproval(contentId: string, body: DecideSmmContentApprovalRequest) {
    const { approval } = await apiClient.post<DecideSmmContentApprovalResponse>(
      `/smm/content/${contentId}/approvals`,
      { body },
    );
    return approval;
  },

  // ── Files ───────────────────────────────────────────────────────────────
  async listFiles(
    projectId: string,
    options?: { contentItemId?: string },
    signal?: AbortSignal,
  ) {
    const { items } = await apiClient.get<SmmContentFileListResponse>(
      `/smm/projects/${projectId}/files`,
      {
        searchParams: { contentItemId: options?.contentItemId },
        signal,
      },
    );
    return items;
  },

  async uploadFile(
    projectId: string,
    file: File,
    options?: { contentItemId?: string | null; kind?: string },
  ) {
    const form = new FormData();
    form.append('file', file);
    if (options?.contentItemId) form.append('contentItemId', options.contentItemId);
    if (options?.kind) form.append('kind', options.kind);
    const { file: dto } = await apiClient.post<CreateSmmContentFileResponse>(
      `/smm/projects/${projectId}/files`,
      { body: form },
    );
    return dto;
  },

  async deleteFile(fileId: string) {
    await apiClient.delete(`/smm/files/${fileId}`);
  },

  // ── Templates ───────────────────────────────────────────────────────────
  listTemplates(query: SmmContentTemplateListQuery = {}, signal?: AbortSignal) {
    return apiClient.get<SmmContentTemplateListResponse>('/smm/templates', {
      searchParams: {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        scope: query.scope,
        projectId: query.projectId,
        contentType: query.contentType,
        includeArchived: query.includeArchived,
      },
      signal,
    });
  },

  async createTemplate(body: CreateSmmContentTemplateRequest) {
    const { template } = await apiClient.post<CreateSmmContentTemplateResponse>('/smm/templates', {
      body,
    });
    return template;
  },

  async updateTemplate(templateId: string, body: UpdateSmmContentTemplateRequest) {
    const { template } = await apiClient.patch<UpdateSmmContentTemplateResponse>(
      `/smm/templates/${templateId}`,
      { body },
    );
    return template;
  },

  async applyTemplate(
    templateId: string,
    body: { projectId: string; publishAt?: string | null },
  ) {
    const { contentItem } = await apiClient.post<CreateSmmContentItemResponse>(
      `/smm/templates/${templateId}/use`,
      { body },
    );
    return contentItem;
  },
};
