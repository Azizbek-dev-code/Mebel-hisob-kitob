import type {
  CreateSmmAudienceSegmentRequest,
  CreateSmmCampaignRequest,
  CreateSmmCompetitorRequest,
  CreateSmmContentAssignmentRequest,
  CreateSmmContentCostRequest,
  CreateSmmContentItemRequest,
  CreateSmmContentPillarRequest,
  CreateSmmContentPlanRequest,
  CreateSmmContentReferenceRequest,
  CreateSmmContentTaskRequest,
  CreateSmmContentTemplateRequest,
  CreateSmmPersonaRequest,
  CreateSmmProjectRequest,
  DecideSmmContentApprovalRequest,
  SmmContentBlockInput,
  SmmContentPlanSlotInput,
  SmmFileKind,
  SmmProjectMemberRole,
  SmmTemplateScope,
  TransitionSmmContentStatusRequest,
  UpdateSmmAudienceSegmentRequest,
  UpdateSmmCampaignRequest,
  UpdateSmmCompetitorRequest,
  UpdateSmmContentAssignmentRequest,
  UpdateSmmContentCostRequest,
  UpdateSmmContentItemRequest,
  UpdateSmmContentPillarRequest,
  UpdateSmmContentPlanRequest,
  UpdateSmmContentReferenceRequest,
  UpdateSmmContentTaskRequest,
  UpdateSmmContentTemplateRequest,
  UpdateSmmPersonaRequest,
  UpdateSmmProjectRequest,
  UpsertSmmContentAnalyticsRequest,
  UpsertSmmProjectMemberRequest,
} from '@furniture-erp/shared';
import type { Request, Response } from 'express';

import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendCreated, sendNoContent, sendSuccess } from '../../utils/http-response.js';

import * as contentService from './content.service.js';
import * as opsService from './ops.service.js';
import * as planningService from './planning.service.js';
import * as projectsService from './projects.service.js';
import * as researchService from './research.service.js';

function requireUser(req: Request) {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

function projectId(req: Request): string {
  return String(req.params.projectId);
}

function id(req: Request): string {
  return String(req.params.id);
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await projectsService.listProjects(user.storeId, user.id, user.role, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as never,
    }),
  );
});

export const postProject = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const project = await projectsService.createProject(
    user.storeId,
    user.id,
    req.body as CreateSmmProjectRequest,
  );
  sendCreated(res, { project });
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { project } = await projectsService.getProject(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
  );
  sendSuccess(res, { project });
});

export const patchProject = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const project = await projectsService.updateProject(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as UpdateSmmProjectRequest,
  );
  sendSuccess(res, { project });
});

export const postArchiveProject = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const project = await projectsService.archiveProject(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
  );
  sendSuccess(res, { project });
});

export const getProjectProgress = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const stats = await projectsService.getProjectProgress(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
  );
  sendSuccess(res, { stats });
});

export const getProjectActivity = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await projectsService.listActivity(user.storeId, user.id, user.role, projectId(req), {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      eventType: req.query.eventType as string | undefined,
    }),
  );
});

export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const items = await projectsService.listMembers(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
  );
  sendSuccess(res, { items });
});

export const postMember = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const member = await projectsService.upsertMember(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as UpsertSmmProjectMemberRequest,
  );
  sendCreated(res, { member });
});

export const patchMember = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const member = await projectsService.updateMember(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    String(req.params.memberId),
    req.body as {
      role?: SmmProjectMemberRole;
      isActive?: boolean;
      notes?: string | null;
    },
  );
  sendSuccess(res, { member });
});

export const deleteMember = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await projectsService.removeMember(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    String(req.params.memberId),
  );
  sendNoContent(res);
});

// ---------------------------------------------------------------------------
// Nested CRUD helpers factory pattern — audience / personas / etc.
// ---------------------------------------------------------------------------

export const getAudience = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await researchService.listAudience(user.storeId, user.id, user.role, projectId(req), {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      includeArchived: req.query.includeArchived === 'true',
    }),
  );
});

export const postAudience = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const segment = await researchService.createAudience(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as CreateSmmAudienceSegmentRequest,
  );
  sendCreated(res, { segment });
});

export const getAudienceOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const segment = await researchService.getAudience(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { segment });
});

export const patchAudience = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const segment = await researchService.updateAudience(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    req.body as UpdateSmmAudienceSegmentRequest,
  );
  sendSuccess(res, { segment });
});

export const postArchiveAudience = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const segment = await researchService.archiveAudience(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { segment });
});

export const getPersonas = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await researchService.listPersonas(user.storeId, user.id, user.role, projectId(req), {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      segmentId: req.query.segmentId as string | undefined,
      includeArchived: req.query.includeArchived === 'true',
    }),
  );
});

export const postPersona = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const persona = await researchService.createPersona(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as CreateSmmPersonaRequest,
  );
  sendCreated(res, { persona });
});

export const getPersonaOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const persona = await researchService.getPersona(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { persona });
});

export const patchPersona = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const persona = await researchService.updatePersona(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    req.body as UpdateSmmPersonaRequest,
  );
  sendSuccess(res, { persona });
});

export const postArchivePersona = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const persona = await researchService.archivePersona(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { persona });
});

export const getCompetitors = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await researchService.listCompetitors(user.storeId, user.id, user.role, projectId(req), {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      platform: req.query.platform as never,
      includeArchived: req.query.includeArchived === 'true',
    }),
  );
});

export const postCompetitor = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const competitor = await researchService.createCompetitor(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as CreateSmmCompetitorRequest,
  );
  sendCreated(res, { competitor });
});

export const getCompetitorOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const competitor = await researchService.getCompetitor(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { competitor });
});

export const patchCompetitor = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const competitor = await researchService.updateCompetitor(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    req.body as UpdateSmmCompetitorRequest,
  );
  sendSuccess(res, { competitor });
});

export const postArchiveCompetitor = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const competitor = await researchService.archiveCompetitor(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { competitor });
});

export const getReferences = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await researchService.listReferences(user.storeId, user.id, user.role, projectId(req), {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      platform: req.query.platform as never,
      contentType: req.query.contentType as never,
      includeArchived: req.query.includeArchived === 'true',
    }),
  );
});

export const postReference = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const reference = await researchService.createReference(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as CreateSmmContentReferenceRequest,
  );
  sendCreated(res, { reference });
});

export const getReferenceOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const reference = await researchService.getReference(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { reference });
});

export const patchReference = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const reference = await researchService.updateReference(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    req.body as UpdateSmmContentReferenceRequest,
  );
  sendSuccess(res, { reference });
});

export const postArchiveReference = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const reference = await researchService.archiveReference(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { reference });
});

export const postDuplicateIdea = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contentItem = await researchService.duplicateIdeaFromReference(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendCreated(res, { contentItem });
});

export const getPillars = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const items = await planningService.listPillars(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.query.includeArchived === 'true',
  );
  sendSuccess(res, { items });
});

export const postPillar = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const pillar = await planningService.createPillar(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as CreateSmmContentPillarRequest,
  );
  sendCreated(res, { pillar });
});

export const getPillarOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const pillar = await planningService.getPillar(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { pillar });
});

export const patchPillar = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const pillar = await planningService.updatePillar(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    req.body as UpdateSmmContentPillarRequest,
  );
  sendSuccess(res, { pillar });
});

export const postArchivePillar = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const pillar = await planningService.archivePillar(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { pillar });
});

export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await planningService.listCampaigns(user.storeId, user.id, user.role, projectId(req), {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      includeArchived: req.query.includeArchived === 'true',
    }),
  );
});

export const postCampaign = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const campaign = await planningService.createCampaign(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as CreateSmmCampaignRequest,
  );
  sendCreated(res, { campaign });
});

export const getCampaignOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const campaign = await planningService.getCampaign(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { campaign });
});

export const patchCampaign = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const campaign = await planningService.updateCampaign(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    req.body as UpdateSmmCampaignRequest,
  );
  sendSuccess(res, { campaign });
});

export const postArchiveCampaign = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const campaign = await planningService.archiveCampaign(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { campaign });
});

export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await planningService.listPlans(
      user.storeId,
      user.id,
      user.role,
      projectId(req),
      req.query.page ? Number(req.query.page) : undefined,
      req.query.pageSize ? Number(req.query.pageSize) : undefined,
    ),
  );
});

export const postPlan = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const plan = await planningService.createPlan(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as CreateSmmContentPlanRequest,
  );
  sendCreated(res, { plan });
});

export const getPlanOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const plan = await planningService.getPlan(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
  );
  sendSuccess(res, { plan });
});

export const patchPlan = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const plan = await planningService.updatePlan(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    req.body as UpdateSmmContentPlanRequest,
  );
  sendSuccess(res, { plan });
});

export const postPlanSlot = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const slot = await planningService.createPlanSlot(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    req.body as SmmContentPlanSlotInput,
  );
  sendCreated(res, { slot });
});

export const patchPlanSlot = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const slot = await planningService.updatePlanSlot(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    String(req.params.slotId),
    req.body as Partial<SmmContentPlanSlotInput>,
  );
  sendSuccess(res, { slot });
});

export const deletePlanSlot = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await planningService.deletePlanSlot(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    id(req),
    String(req.params.slotId),
  );
  sendNoContent(res);
});

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const getContentList = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await contentService.listContent(user.storeId, user.id, user.role, projectId(req), {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as never,
      platform: req.query.platform as never,
      contentType: req.query.contentType as never,
      campaignId: req.query.campaignId as string | undefined,
      pillarId: req.query.pillarId as string | undefined,
      audienceSegmentId: req.query.audienceSegmentId as string | undefined,
      assignedUserId: req.query.assignedUserId as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      sort: req.query.sort as never,
      includeArchived: req.query.includeArchived === 'true',
    }),
  );
});

export const getCalendar = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await contentService.listCalendar(user.storeId, user.id, user.role, projectId(req), {
      view: req.query.view as never,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as never,
      platform: req.query.platform as never,
      contentType: req.query.contentType as never,
      campaignId: req.query.campaignId as string | undefined,
      pillarId: req.query.pillarId as string | undefined,
      audienceSegmentId: req.query.audienceSegmentId as string | undefined,
      assignedUserId: req.query.assignedUserId as string | undefined,
      includeArchived: req.query.includeArchived === 'true',
    }),
  );
});

export const postContent = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contentItem = await contentService.createContent(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as CreateSmmContentItemRequest,
  );
  sendCreated(res, { contentItem });
});

export const getContentOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contentItem = await contentService.getContent(
    user.storeId,
    user.id,
    user.role,
    id(req),
  );
  sendSuccess(res, { contentItem });
});

export const patchContent = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contentItem = await contentService.updateContent(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as UpdateSmmContentItemRequest,
  );
  sendSuccess(res, { contentItem });
});

export const postArchiveContent = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contentItem = await contentService.archiveContent(
    user.storeId,
    user.id,
    user.role,
    id(req),
  );
  sendSuccess(res, { contentItem });
});

export const postDuplicateContent = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contentItem = await contentService.duplicateContent(
    user.storeId,
    user.id,
    user.role,
    id(req),
  );
  sendCreated(res, { contentItem });
});

export const postContentStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contentItem = await contentService.transitionContentStatus(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as TransitionSmmContentStatusRequest,
  );
  sendSuccess(res, { contentItem });
});

export const putContentBlocks = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contentItem = await contentService.replaceContentBlocks(
    user.storeId,
    user.id,
    user.role,
    id(req),
    (req.body as { blocks: SmmContentBlockInput[] }).blocks,
  );
  sendSuccess(res, { contentItem });
});

export const getAssignments = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const items = await opsService.listAssignments(user.storeId, user.id, user.role, id(req));
  sendSuccess(res, { items });
});

export const postAssignment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const assignment = await opsService.createAssignment(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as Omit<CreateSmmContentAssignmentRequest, 'contentItemId'>,
  );
  sendCreated(res, { assignment });
});

export const patchAssignment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const assignment = await opsService.updateAssignment(
    user.storeId,
    user.id,
    user.role,
    id(req),
    String(req.params.assignmentId),
    req.body as UpdateSmmContentAssignmentRequest,
  );
  sendSuccess(res, { assignment });
});

export const deleteAssignment = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await opsService.deleteAssignment(
    user.storeId,
    user.id,
    user.role,
    id(req),
    String(req.params.assignmentId),
  );
  sendNoContent(res);
});

export const postGenerateTask = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const task = await opsService.generateTaskFromAssignment(
    user.storeId,
    user.id,
    user.role,
    id(req),
    String(req.params.assignmentId),
  );
  sendCreated(res, { task });
});

export const postApproval = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const approval = await opsService.decideApproval(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as DecideSmmContentApprovalRequest,
  );
  sendCreated(res, { approval });
});

export const getApprovals = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const items = await opsService.listApprovals(user.storeId, user.id, user.role, id(req));
  sendSuccess(res, { items });
});

export const putAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const analytics = await opsService.upsertAnalytics(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as UpsertSmmContentAnalyticsRequest,
  );
  sendSuccess(res, { analytics });
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const analytics = await opsService.getAnalytics(user.storeId, user.id, user.role, id(req));
  sendSuccess(res, { analytics });
});

export const postSaveAsTemplate = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const template = await opsService.saveContentAsTemplate(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as { name: string; scope: SmmTemplateScope; projectId?: string | null },
  );
  sendCreated(res, { template });
});

// ---------------------------------------------------------------------------
// Templates / tasks / costs / files
// ---------------------------------------------------------------------------

export const getTemplates = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await opsService.listTemplates(user.storeId, user.id, user.role, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      scope: req.query.scope as never,
      projectId: req.query.projectId as string | undefined,
      contentType: req.query.contentType as never,
      includeArchived: req.query.includeArchived === 'true',
    }),
  );
});

export const postTemplate = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const template = await opsService.createTemplate(
    user.storeId,
    user.id,
    user.role,
    req.body as CreateSmmContentTemplateRequest,
  );
  sendCreated(res, { template });
});

export const getProjectTemplates = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await opsService.listTemplates(user.storeId, user.id, user.role, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      projectId: projectId(req),
      scope: 'PROJECT',
      includeArchived: req.query.includeArchived === 'true',
    }),
  );
});

export const postProjectTemplate = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const template = await opsService.createTemplate(user.storeId, user.id, user.role, {
    ...(req.body as CreateSmmContentTemplateRequest),
    projectId: projectId(req),
    scope: 'PROJECT',
  });
  sendCreated(res, { template });
});

export const getTemplateOne = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const template = await opsService.getTemplate(user.storeId, user.id, user.role, id(req));
  sendSuccess(res, { template });
});

export const patchTemplate = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const template = await opsService.updateTemplate(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as UpdateSmmContentTemplateRequest,
  );
  sendSuccess(res, { template });
});

export const postUseTemplate = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contentItem = await opsService.useTemplate(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as { projectId: string; publishAt?: string | null },
  );
  sendCreated(res, { contentItem });
});

export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await opsService.listTasks(user.storeId, user.id, user.role, projectId(req), {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      userId: req.query.userId as string | undefined,
      contentItemId: req.query.contentItemId as string | undefined,
      status: req.query.status as never,
    }),
  );
});

export const postTask = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const task = await opsService.createTask(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as Omit<CreateSmmContentTaskRequest, 'projectId'>,
  );
  sendCreated(res, { task });
});

export const patchTask = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const task = await opsService.updateTask(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as UpdateSmmContentTaskRequest,
  );
  sendSuccess(res, { task });
});

export const getCosts = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  sendSuccess(
    res,
    await opsService.listCosts(user.storeId, user.id, user.role, projectId(req), {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      contentItemId: req.query.contentItemId as string | undefined,
      userId: req.query.userId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    }),
  );
});

export const postCost = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const cost = await opsService.createCost(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.body as Omit<CreateSmmContentCostRequest, 'projectId'>,
  );
  sendCreated(res, { cost });
});

export const patchCost = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const cost = await opsService.updateCost(
    user.storeId,
    user.id,
    user.role,
    id(req),
    req.body as UpdateSmmContentCostRequest,
  );
  sendSuccess(res, { cost });
});

export const deleteCost = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await opsService.deleteCost(user.storeId, user.id, user.role, id(req));
  sendNoContent(res);
});

export const getFiles = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const items = await opsService.listFiles(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    req.query.contentItemId as string | undefined,
  );
  sendSuccess(res, { items });
});

export const postFile = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  if (!req.file) throw ApiError.validation('File is required');
  const file = await opsService.uploadFile(
    user.storeId,
    user.id,
    user.role,
    projectId(req),
    {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      size: req.file.size,
    },
    {
      kind: (req.body?.kind as SmmFileKind | undefined) ?? undefined,
      contentItemId: (req.body?.contentItemId as string | undefined) ?? null,
    },
  );
  sendCreated(res, { file });
});

export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await opsService.deleteFile(user.storeId, user.id, user.role, id(req));
  sendNoContent(res);
});
