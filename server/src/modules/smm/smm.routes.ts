import { FeatureKey } from '@furniture-erp/shared';
import { Router } from 'express';
import multer from 'multer';

import { requireAuth } from '../../middleware/require-auth.js';
import { requireFeature } from '../../middleware/require-feature.js';
import { validate } from '../../middleware/validate.js';
import { idParamsSchema } from '../../validators/common.validators.js';

import * as ctrl from './smm.controller.js';
import {
  activityListQuerySchema,
  agencyDashboardQuerySchema,
  audienceListQuerySchema,
  calendarQuerySchema,
  campaignListQuerySchema,
  competitorListQuerySchema,
  contentAssignmentParamsSchema,
  contentListQuerySchema,
  costListQuerySchema,
  createAssignmentBodySchema,
  createAudienceBodySchema,
  createCampaignBodySchema,
  createCompetitorBodySchema,
  createContentBodySchema,
  createCostBodySchema,
  createPersonaBodySchema,
  createPillarBodySchema,
  createPlanBodySchema,
  createProjectBodySchema,
  createReferenceBodySchema,
  createTaskBodySchema,
  createTemplateBodySchema,
  decideApprovalBodySchema,
  personaListQuerySchema,
  planSlotInputSchema,
  planSlotParamsSchema,
  projectIdParamsSchema,
  projectListQuerySchema,
  projectMemberParamsSchema,
  projectResourceParamsSchema,
  referenceListQuerySchema,
  replaceBlocksBodySchema,
  saveAsTemplateBodySchema,
  taskListQuerySchema,
  templateListQuerySchema,
  transitionStatusBodySchema,
  updateAssignmentBodySchema,
  updateAudienceBodySchema,
  updateCampaignBodySchema,
  updateCompetitorBodySchema,
  updateContentBodySchema,
  updateCostBodySchema,
  updateMemberBodySchema,
  updatePersonaBodySchema,
  updatePillarBodySchema,
  updatePlanBodySchema,
  updatePlanSlotBodySchema,
  updateProjectBodySchema,
  updateReferenceBodySchema,
  updateTaskBodySchema,
  updateTemplateBodySchema,
  upsertAnalyticsBodySchema,
  upsertMemberBodySchema,
  useTemplateBodySchema,
} from './smm.validators.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const smmRouter = Router();

smmRouter.use(requireAuth, requireFeature(FeatureKey.SMM_PROJECTS));

// ---------------------------------------------------------------------------
// Agency dashboard — before :projectId catch-alls
// ---------------------------------------------------------------------------

smmRouter.get(
  '/dashboard',
  validate({ query: agencyDashboardQuerySchema }),
  ctrl.getAgencyDashboard,
);

// ---------------------------------------------------------------------------
// Templates (agency / store-scoped) — before :id catch-alls
// ---------------------------------------------------------------------------

smmRouter.get('/templates', validate({ query: templateListQuerySchema }), ctrl.getTemplates);
smmRouter.post('/templates', validate({ body: createTemplateBodySchema }), ctrl.postTemplate);
smmRouter.get(
  '/templates/:id',
  validate({ params: idParamsSchema }),
  ctrl.getTemplateOne,
);
smmRouter.patch(
  '/templates/:id',
  validate({ params: idParamsSchema, body: updateTemplateBodySchema }),
  ctrl.patchTemplate,
);
smmRouter.post(
  '/templates/:id/use',
  validate({ params: idParamsSchema, body: useTemplateBodySchema }),
  ctrl.postUseTemplate,
);

// ---------------------------------------------------------------------------
// Content by id (store-scoped)
// ---------------------------------------------------------------------------

smmRouter.get('/content/:id', validate({ params: idParamsSchema }), ctrl.getContentOne);
smmRouter.patch(
  '/content/:id',
  validate({ params: idParamsSchema, body: updateContentBodySchema }),
  ctrl.patchContent,
);
smmRouter.post(
  '/content/:id/archive',
  validate({ params: idParamsSchema }),
  ctrl.postArchiveContent,
);
smmRouter.post(
  '/content/:id/duplicate',
  validate({ params: idParamsSchema }),
  ctrl.postDuplicateContent,
);
smmRouter.post(
  '/content/:id/status',
  validate({ params: idParamsSchema, body: transitionStatusBodySchema }),
  ctrl.postContentStatus,
);
smmRouter.put(
  '/content/:id/blocks',
  validate({ params: idParamsSchema, body: replaceBlocksBodySchema }),
  ctrl.putContentBlocks,
);
smmRouter.get(
  '/content/:id/assignments',
  validate({ params: idParamsSchema }),
  ctrl.getAssignments,
);
smmRouter.post(
  '/content/:id/assignments',
  validate({ params: idParamsSchema, body: createAssignmentBodySchema }),
  ctrl.postAssignment,
);
smmRouter.patch(
  '/content/:id/assignments/:assignmentId',
  validate({ params: contentAssignmentParamsSchema, body: updateAssignmentBodySchema }),
  ctrl.patchAssignment,
);
smmRouter.delete(
  '/content/:id/assignments/:assignmentId',
  validate({ params: contentAssignmentParamsSchema }),
  ctrl.deleteAssignment,
);
smmRouter.post(
  '/content/:id/assignments/:assignmentId/generate-task',
  validate({ params: contentAssignmentParamsSchema }),
  ctrl.postGenerateTask,
);
smmRouter.get('/content/:id/approvals', validate({ params: idParamsSchema }), ctrl.getApprovals);
smmRouter.post(
  '/content/:id/approvals',
  validate({ params: idParamsSchema, body: decideApprovalBodySchema }),
  ctrl.postApproval,
);
smmRouter.get('/content/:id/analytics', validate({ params: idParamsSchema }), ctrl.getAnalytics);
smmRouter.put(
  '/content/:id/analytics',
  validate({ params: idParamsSchema, body: upsertAnalyticsBodySchema }),
  ctrl.putAnalytics,
);
smmRouter.post(
  '/content/:id/save-as-template',
  validate({ params: idParamsSchema, body: saveAsTemplateBodySchema }),
  ctrl.postSaveAsTemplate,
);

// ---------------------------------------------------------------------------
// Tasks / costs by id
// ---------------------------------------------------------------------------

smmRouter.patch(
  '/tasks/:id',
  validate({ params: idParamsSchema, body: updateTaskBodySchema }),
  ctrl.patchTask,
);
smmRouter.patch(
  '/costs/:id',
  validate({ params: idParamsSchema, body: updateCostBodySchema }),
  ctrl.patchCost,
);
smmRouter.delete('/costs/:id', validate({ params: idParamsSchema }), ctrl.deleteCost);
smmRouter.delete('/files/:id', validate({ params: idParamsSchema }), ctrl.deleteFile);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

smmRouter.get('/projects', validate({ query: projectListQuerySchema }), ctrl.getProjects);
smmRouter.post('/projects', validate({ body: createProjectBodySchema }), ctrl.postProject);

smmRouter.get(
  '/projects/:projectId',
  validate({ params: projectIdParamsSchema }),
  ctrl.getProject,
);
smmRouter.patch(
  '/projects/:projectId',
  validate({ params: projectIdParamsSchema, body: updateProjectBodySchema }),
  ctrl.patchProject,
);
smmRouter.post(
  '/projects/:projectId/archive',
  validate({ params: projectIdParamsSchema }),
  ctrl.postArchiveProject,
);
smmRouter.get(
  '/projects/:projectId/progress',
  validate({ params: projectIdParamsSchema }),
  ctrl.getProjectProgress,
);
smmRouter.get(
  '/projects/:projectId/activity',
  validate({ params: projectIdParamsSchema, query: activityListQuerySchema }),
  ctrl.getProjectActivity,
);

smmRouter.get(
  '/projects/:projectId/members',
  validate({ params: projectIdParamsSchema }),
  ctrl.getMembers,
);
smmRouter.post(
  '/projects/:projectId/members',
  validate({ params: projectIdParamsSchema, body: upsertMemberBodySchema }),
  ctrl.postMember,
);
smmRouter.patch(
  '/projects/:projectId/members/:memberId',
  validate({ params: projectMemberParamsSchema, body: updateMemberBodySchema }),
  ctrl.patchMember,
);
smmRouter.delete(
  '/projects/:projectId/members/:memberId',
  validate({ params: projectMemberParamsSchema }),
  ctrl.deleteMember,
);

// Audience
smmRouter.get(
  '/projects/:projectId/audience',
  validate({ params: projectIdParamsSchema, query: audienceListQuerySchema }),
  ctrl.getAudience,
);
smmRouter.post(
  '/projects/:projectId/audience',
  validate({ params: projectIdParamsSchema, body: createAudienceBodySchema }),
  ctrl.postAudience,
);
smmRouter.get(
  '/projects/:projectId/audience/:id',
  validate({ params: projectResourceParamsSchema }),
  ctrl.getAudienceOne,
);
smmRouter.patch(
  '/projects/:projectId/audience/:id',
  validate({ params: projectResourceParamsSchema, body: updateAudienceBodySchema }),
  ctrl.patchAudience,
);
smmRouter.post(
  '/projects/:projectId/audience/:id/archive',
  validate({ params: projectResourceParamsSchema }),
  ctrl.postArchiveAudience,
);

// Personas
smmRouter.get(
  '/projects/:projectId/personas',
  validate({ params: projectIdParamsSchema, query: personaListQuerySchema }),
  ctrl.getPersonas,
);
smmRouter.post(
  '/projects/:projectId/personas',
  validate({ params: projectIdParamsSchema, body: createPersonaBodySchema }),
  ctrl.postPersona,
);
smmRouter.get(
  '/projects/:projectId/personas/:id',
  validate({ params: projectResourceParamsSchema }),
  ctrl.getPersonaOne,
);
smmRouter.patch(
  '/projects/:projectId/personas/:id',
  validate({ params: projectResourceParamsSchema, body: updatePersonaBodySchema }),
  ctrl.patchPersona,
);
smmRouter.post(
  '/projects/:projectId/personas/:id/archive',
  validate({ params: projectResourceParamsSchema }),
  ctrl.postArchivePersona,
);

// Competitors
smmRouter.get(
  '/projects/:projectId/competitors',
  validate({ params: projectIdParamsSchema, query: competitorListQuerySchema }),
  ctrl.getCompetitors,
);
smmRouter.post(
  '/projects/:projectId/competitors',
  validate({ params: projectIdParamsSchema, body: createCompetitorBodySchema }),
  ctrl.postCompetitor,
);
smmRouter.get(
  '/projects/:projectId/competitors/:id',
  validate({ params: projectResourceParamsSchema }),
  ctrl.getCompetitorOne,
);
smmRouter.patch(
  '/projects/:projectId/competitors/:id',
  validate({ params: projectResourceParamsSchema, body: updateCompetitorBodySchema }),
  ctrl.patchCompetitor,
);
smmRouter.post(
  '/projects/:projectId/competitors/:id/archive',
  validate({ params: projectResourceParamsSchema }),
  ctrl.postArchiveCompetitor,
);

// References
smmRouter.get(
  '/projects/:projectId/references',
  validate({ params: projectIdParamsSchema, query: referenceListQuerySchema }),
  ctrl.getReferences,
);
smmRouter.post(
  '/projects/:projectId/references',
  validate({ params: projectIdParamsSchema, body: createReferenceBodySchema }),
  ctrl.postReference,
);
smmRouter.get(
  '/projects/:projectId/references/:id',
  validate({ params: projectResourceParamsSchema }),
  ctrl.getReferenceOne,
);
smmRouter.patch(
  '/projects/:projectId/references/:id',
  validate({ params: projectResourceParamsSchema, body: updateReferenceBodySchema }),
  ctrl.patchReference,
);
smmRouter.post(
  '/projects/:projectId/references/:id/archive',
  validate({ params: projectResourceParamsSchema }),
  ctrl.postArchiveReference,
);
smmRouter.post(
  '/projects/:projectId/references/:id/duplicate-idea',
  validate({ params: projectResourceParamsSchema }),
  ctrl.postDuplicateIdea,
);

// Pillars
smmRouter.get(
  '/projects/:projectId/pillars',
  validate({ params: projectIdParamsSchema }),
  ctrl.getPillars,
);
smmRouter.post(
  '/projects/:projectId/pillars',
  validate({ params: projectIdParamsSchema, body: createPillarBodySchema }),
  ctrl.postPillar,
);
smmRouter.get(
  '/projects/:projectId/pillars/:id',
  validate({ params: projectResourceParamsSchema }),
  ctrl.getPillarOne,
);
smmRouter.patch(
  '/projects/:projectId/pillars/:id',
  validate({ params: projectResourceParamsSchema, body: updatePillarBodySchema }),
  ctrl.patchPillar,
);
smmRouter.post(
  '/projects/:projectId/pillars/:id/archive',
  validate({ params: projectResourceParamsSchema }),
  ctrl.postArchivePillar,
);

// Campaigns
smmRouter.get(
  '/projects/:projectId/campaigns',
  validate({ params: projectIdParamsSchema, query: campaignListQuerySchema }),
  ctrl.getCampaigns,
);
smmRouter.post(
  '/projects/:projectId/campaigns',
  validate({ params: projectIdParamsSchema, body: createCampaignBodySchema }),
  ctrl.postCampaign,
);
smmRouter.get(
  '/projects/:projectId/campaigns/:id',
  validate({ params: projectResourceParamsSchema }),
  ctrl.getCampaignOne,
);
smmRouter.patch(
  '/projects/:projectId/campaigns/:id',
  validate({ params: projectResourceParamsSchema, body: updateCampaignBodySchema }),
  ctrl.patchCampaign,
);
smmRouter.post(
  '/projects/:projectId/campaigns/:id/archive',
  validate({ params: projectResourceParamsSchema }),
  ctrl.postArchiveCampaign,
);

// Plans + slots
smmRouter.get(
  '/projects/:projectId/plans',
  validate({ params: projectIdParamsSchema }),
  ctrl.getPlans,
);
smmRouter.post(
  '/projects/:projectId/plans',
  validate({ params: projectIdParamsSchema, body: createPlanBodySchema }),
  ctrl.postPlan,
);
smmRouter.get(
  '/projects/:projectId/plans/:id',
  validate({ params: projectResourceParamsSchema }),
  ctrl.getPlanOne,
);
smmRouter.patch(
  '/projects/:projectId/plans/:id',
  validate({ params: projectResourceParamsSchema, body: updatePlanBodySchema }),
  ctrl.patchPlan,
);
smmRouter.post(
  '/projects/:projectId/plans/:id/slots',
  validate({ params: projectResourceParamsSchema, body: planSlotInputSchema }),
  ctrl.postPlanSlot,
);
smmRouter.patch(
  '/projects/:projectId/plans/:id/slots/:slotId',
  validate({ params: planSlotParamsSchema, body: updatePlanSlotBodySchema }),
  ctrl.patchPlanSlot,
);
smmRouter.delete(
  '/projects/:projectId/plans/:id/slots/:slotId',
  validate({ params: planSlotParamsSchema }),
  ctrl.deletePlanSlot,
);

// Content under project
smmRouter.get(
  '/projects/:projectId/content',
  validate({ params: projectIdParamsSchema, query: contentListQuerySchema }),
  ctrl.getContentList,
);
smmRouter.get(
  '/projects/:projectId/calendar',
  validate({ params: projectIdParamsSchema, query: calendarQuerySchema }),
  ctrl.getCalendar,
);
smmRouter.post(
  '/projects/:projectId/content',
  validate({ params: projectIdParamsSchema, body: createContentBodySchema }),
  ctrl.postContent,
);

// Project templates / tasks / costs / files
smmRouter.get(
  '/projects/:projectId/templates',
  validate({ params: projectIdParamsSchema }),
  ctrl.getProjectTemplates,
);
smmRouter.post(
  '/projects/:projectId/templates',
  validate({ params: projectIdParamsSchema, body: createTemplateBodySchema }),
  ctrl.postProjectTemplate,
);
smmRouter.get(
  '/projects/:projectId/tasks',
  validate({ params: projectIdParamsSchema, query: taskListQuerySchema }),
  ctrl.getTasks,
);
smmRouter.post(
  '/projects/:projectId/tasks',
  validate({ params: projectIdParamsSchema, body: createTaskBodySchema }),
  ctrl.postTask,
);
smmRouter.get(
  '/projects/:projectId/costs',
  validate({ params: projectIdParamsSchema, query: costListQuerySchema }),
  ctrl.getCosts,
);
smmRouter.post(
  '/projects/:projectId/costs',
  validate({ params: projectIdParamsSchema, body: createCostBodySchema }),
  ctrl.postCost,
);
smmRouter.get(
  '/projects/:projectId/files',
  validate({ params: projectIdParamsSchema }),
  ctrl.getFiles,
);
smmRouter.post(
  '/projects/:projectId/files',
  validate({ params: projectIdParamsSchema }),
  upload.single('file'),
  ctrl.postFile,
);
