import {
  DASHBOARD_MAX_RANGE_DAYS,
  SMM_APPROVAL_DECISIONS,
  SMM_ASSIGNMENT_STATUSES,
  SMM_BLOCK_KINDS,
  SMM_CONTENT_STATUSES,
  SMM_CONTENT_TYPES,
  SMM_DASHBOARD_PERIOD_PRESETS,
  SMM_FILE_KINDS,
  SMM_FINANCE_CHART_PRESETS,
  SMM_PLATFORMS,
  SMM_PROJECT_MEMBER_ROLES,
  SMM_PROJECT_STATUSES,
  SMM_TASK_STATUSES,
  SMM_TEMPLATE_SCOPES,
  SmmDashboardPeriodPreset,
} from '@furniture-erp/shared';
import { z } from 'zod';

import {
  calendarDateSchema,
  cuidSchema,
  flexibleDateSchema,
  moneySchema,
  paginationQuerySchema,
} from '../../validators/common.validators.js';

const optionalNullableString = z.string().trim().max(10_000).nullable().optional();
const shortOptionalString = z.string().trim().max(500).nullable().optional();
const nameSchema = z.string().trim().min(1).max(200);

const platformSchema = z.enum(SMM_PLATFORMS as [string, ...string[]]);
const contentTypeSchema = z.enum(SMM_CONTENT_TYPES as [string, ...string[]]);
const contentStatusSchema = z.enum(SMM_CONTENT_STATUSES as [string, ...string[]]);
const projectStatusSchema = z.enum(SMM_PROJECT_STATUSES as [string, ...string[]]);
const memberRoleSchema = z.enum(SMM_PROJECT_MEMBER_ROLES as [string, ...string[]]);
const assignmentStatusSchema = z.enum(SMM_ASSIGNMENT_STATUSES as [string, ...string[]]);
const taskStatusSchema = z.enum(SMM_TASK_STATUSES as [string, ...string[]]);
const approvalDecisionSchema = z.enum(SMM_APPROVAL_DECISIONS as [string, ...string[]]);
const templateScopeSchema = z.enum(SMM_TEMPLATE_SCOPES as [string, ...string[]]);
const blockKindSchema = z.enum(SMM_BLOCK_KINDS as [string, ...string[]]);
const fileKindSchema = z.enum(SMM_FILE_KINDS as [string, ...string[]]);

const booleanQuery = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (typeof v === 'boolean') return v;
    return v === 'true' || v === '1';
  });

const insightNoteSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  source: z.string().trim().max(100).nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

const contentBlockInputSchema = z.object({
  kind: blockKindSchema,
  title: shortOptionalString,
  body: optionalNullableString,
  visualDirection: optionalNullableString,
  referenceText: optionalNullableString,
  sortOrder: z.number().int().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export const projectIdParamsSchema = z.object({ projectId: cuidSchema });
export const projectMemberParamsSchema = z.object({
  projectId: cuidSchema,
  memberId: cuidSchema,
});
export const projectResourceParamsSchema = z.object({
  projectId: cuidSchema,
  id: cuidSchema,
});
export const contentIdParamsSchema = z.object({ id: cuidSchema });
export const contentAssignmentParamsSchema = z.object({
  id: cuidSchema,
  assignmentId: cuidSchema,
});
export const contentCostParamsSchema = z.object({
  id: cuidSchema,
  costId: cuidSchema,
});
export const planSlotParamsSchema = z.object({
  projectId: cuidSchema,
  id: cuidSchema,
  slotId: cuidSchema,
});
export const templateIdParamsSchema = z.object({ id: cuidSchema });
export const taskIdParamsSchema = z.object({ id: cuidSchema });
export const costIdParamsSchema = z.object({ id: cuidSchema });

// ---------------------------------------------------------------------------
// Agency dashboard
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function inclusiveDaySpan(from: string, to: string): number {
  const asUtc = (value: string): number => {
    const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((asUtc(to) - asUtc(from)) / DAY_MS) + 1;
}

export const agencyDashboardQuerySchema = z
  .object({
    preset: z
      .enum(SMM_DASHBOARD_PERIOD_PRESETS as [string, ...string[]])
      .default(SmmDashboardPeriodPreset.THIS_MONTH),
    from: calendarDateSchema.optional(),
    to: calendarDateSchema.optional(),
    financePreset: z
      .enum(SMM_FINANCE_CHART_PRESETS as [string, ...string[]])
      .default('LAST_30_DAYS'),
  })
  .superRefine((value, ctx) => {
    if (value.preset !== SmmDashboardPeriodPreset.CUSTOM) return;

    if (!value.from || !value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [value.from ? 'to' : 'from'],
        message: 'A custom period needs both a start and an end date',
      });
      return;
    }

    if (value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'The start date must not be after the end date',
      });
      return;
    }

    if (inclusiveDaySpan(value.from, value.to) > DASHBOARD_MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: `A custom period cannot be longer than ${DASHBOARD_MAX_RANGE_DAYS} days`,
      });
    }
  });

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projectListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: z.union([projectStatusSchema, z.literal('ALL')]).optional(),
});

export const createProjectBodySchema = z.object({
  name: nameSchema,
  clientName: shortOptionalString,
  clientUserId: cuidSchema.nullable().optional(),
  description: optionalNullableString,
  status: projectStatusSchema.optional(),
  budgetPlanned: moneySchema.nullable().optional(),
  startDate: flexibleDateSchema.nullable().optional(),
  endDate: flexibleDateSchema.nullable().optional(),
  notes: optionalNullableString,
});

export const updateProjectBodySchema = createProjectBodySchema.partial();

export const upsertMemberBodySchema = z.object({
  userId: cuidSchema,
  role: memberRoleSchema,
  isActive: z.boolean().optional(),
  notes: optionalNullableString,
});

export const updateMemberBodySchema = z.object({
  role: memberRoleSchema.optional(),
  isActive: z.boolean().optional(),
  notes: optionalNullableString,
});

// ---------------------------------------------------------------------------
// Audience
// ---------------------------------------------------------------------------

export const audienceListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  includeArchived: booleanQuery,
});

export const createAudienceBodySchema = z.object({
  name: nameSchema,
  ageRange: shortOptionalString,
  gender: shortOptionalString,
  location: shortOptionalString,
  income: shortOptionalString,
  occupation: shortOptionalString,
  interests: z.array(z.string().trim().max(100)).max(50).optional(),
  painPoints: optionalNullableString,
  needs: optionalNullableString,
  desires: optionalNullableString,
  objections: optionalNullableString,
  buyingMotivation: optionalNullableString,
  buyingBehavior: optionalNullableString,
  contentPreferences: optionalNullableString,
  researchSources: optionalNullableString,
  notes: optionalNullableString,
  insights: z.array(insightNoteSchema).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateAudienceBodySchema = createAudienceBodySchema.partial().extend({
  archivedAt: flexibleDateSchema.nullable().optional(),
});

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export const personaListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  segmentId: cuidSchema.optional(),
  includeArchived: booleanQuery,
});

export const createPersonaBodySchema = z.object({
  name: nameSchema,
  segmentId: cuidSchema.nullable().optional(),
  ageRange: shortOptionalString,
  gender: shortOptionalString,
  location: shortOptionalString,
  occupation: shortOptionalString,
  income: shortOptionalString,
  problems: optionalNullableString,
  needs: optionalNullableString,
  motivation: optionalNullableString,
  objections: optionalNullableString,
  preferredContent: optionalNullableString,
  notes: optionalNullableString,
});

export const updatePersonaBodySchema = createPersonaBodySchema.partial().extend({
  archivedAt: flexibleDateSchema.nullable().optional(),
});

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export const competitorListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  platform: z.union([platformSchema, z.literal('ALL')]).optional(),
  includeArchived: booleanQuery,
});

export const createCompetitorBodySchema = z.object({
  name: nameSchema,
  platform: platformSchema,
  profileUrl: z.string().trim().url().max(2000).nullable().optional().or(z.literal('')),
  followers: z.number().int().nonnegative().nullable().optional(),
  postingFrequency: shortOptionalString,
  contentFormats: optionalNullableString,
  engagement: optionalNullableString,
  offers: optionalNullableString,
  pricing: optionalNullableString,
  positioning: optionalNullableString,
  strengths: optionalNullableString,
  weaknesses: optionalNullableString,
  bestContent: optionalNullableString,
  hooks: optionalNullableString,
  notes: optionalNullableString,
  researchDate: flexibleDateSchema.nullable().optional(),
});

export const updateCompetitorBodySchema = createCompetitorBodySchema.partial().extend({
  archivedAt: flexibleDateSchema.nullable().optional(),
});

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

export const referenceListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  platform: z.union([platformSchema, z.literal('ALL')]).optional(),
  contentType: z.union([contentTypeSchema, z.literal('ALL')]).optional(),
  includeArchived: booleanQuery,
});

export const createReferenceBodySchema = z.object({
  title: nameSchema,
  platform: platformSchema,
  contentType: contentTypeSchema,
  sourceUrl: z.string().trim().max(2000).nullable().optional(),
  creatorName: shortOptionalString,
  topic: shortOptionalString,
  hook: optionalNullableString,
  format: shortOptionalString,
  goal: optionalNullableString,
  whySaved: optionalNullableString,
  tags: z.array(z.string().trim().max(50)).max(30).optional(),
  notes: optionalNullableString,
  mediaKey: shortOptionalString,
  mediaUrl: z.string().trim().max(2000).nullable().optional(),
});

export const updateReferenceBodySchema = createReferenceBodySchema.partial().extend({
  archivedAt: flexibleDateSchema.nullable().optional(),
});

// ---------------------------------------------------------------------------
// Pillars / campaigns
// ---------------------------------------------------------------------------

export const createPillarBodySchema = z.object({
  name: nameSchema,
  description: optionalNullableString,
  color: z.string().trim().max(40).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updatePillarBodySchema = createPillarBodySchema.partial().extend({
  archivedAt: flexibleDateSchema.nullable().optional(),
});

export const campaignListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  includeArchived: booleanQuery,
});

export const createCampaignBodySchema = z.object({
  name: nameSchema,
  description: optionalNullableString,
  startDate: flexibleDateSchema.nullable().optional(),
  endDate: flexibleDateSchema.nullable().optional(),
  goal: optionalNullableString,
  status: z.string().trim().max(50).optional(),
});

export const updateCampaignBodySchema = createCampaignBodySchema.partial().extend({
  archivedAt: flexibleDateSchema.nullable().optional(),
});

// ---------------------------------------------------------------------------
// Plans / slots
// ---------------------------------------------------------------------------

export const planSlotInputSchema = z.object({
  date: flexibleDateSchema,
  contentType: contentTypeSchema,
  platform: platformSchema.nullable().optional(),
  title: shortOptionalString,
  notes: optionalNullableString,
  contentItemId: cuidSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createPlanBodySchema = z.object({
  name: nameSchema,
  periodStart: flexibleDateSchema,
  periodEnd: flexibleDateSchema,
  platforms: z.array(platformSchema).min(1),
  contentTypes: z.array(contentTypeSchema).min(1),
  frequencyNotes: optionalNullableString,
  pillarIds: z.array(cuidSchema).optional(),
  goals: optionalNullableString,
  notes: optionalNullableString,
  slots: z.array(planSlotInputSchema).max(500).optional(),
});

export const updatePlanBodySchema = z.object({
  name: nameSchema.optional(),
  periodStart: flexibleDateSchema.optional(),
  periodEnd: flexibleDateSchema.optional(),
  platforms: z.array(platformSchema).min(1).optional(),
  contentTypes: z.array(contentTypeSchema).min(1).optional(),
  frequencyNotes: optionalNullableString,
  pillarIds: z.array(cuidSchema).nullable().optional(),
  goals: optionalNullableString,
  notes: optionalNullableString,
  slots: z.array(planSlotInputSchema).max(500).optional(),
});

export const updatePlanSlotBodySchema = planSlotInputSchema.partial();

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const contentListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  status: z.union([contentStatusSchema, z.literal('ALL')]).optional(),
  platform: z.union([platformSchema, z.literal('ALL')]).optional(),
  contentType: z.union([contentTypeSchema, z.literal('ALL')]).optional(),
  campaignId: cuidSchema.optional(),
  pillarId: cuidSchema.optional(),
  audienceSegmentId: cuidSchema.optional(),
  assignedUserId: cuidSchema.optional(),
  dateFrom: flexibleDateSchema.optional(),
  dateTo: flexibleDateSchema.optional(),
  sort: z
    .enum(['publishAt_asc', 'publishAt_desc', 'updatedAt_desc', 'title_asc', 'status_asc'])
    .optional(),
  includeArchived: booleanQuery,
});

export const calendarQuerySchema = contentListQuerySchema.extend({
  view: z.enum(['month', 'week', 'day', 'list']).optional(),
  from: flexibleDateSchema.optional(),
  to: flexibleDateSchema.optional(),
});

export const createContentBodySchema = z.object({
  title: nameSchema,
  platform: platformSchema,
  contentType: contentTypeSchema,
  campaignId: cuidSchema.nullable().optional(),
  publishAt: flexibleDateSchema.nullable().optional(),
  goal: optionalNullableString,
  topic: shortOptionalString,
  expectedResult: optionalNullableString,
  audienceSegmentId: cuidSchema.nullable().optional(),
  personaId: cuidSchema.nullable().optional(),
  pillarId: cuidSchema.nullable().optional(),
  status: contentStatusSchema.optional(),
  referenceId: cuidSchema.nullable().optional(),
  notes: optionalNullableString,
  format: shortOptionalString,
  hook: optionalNullableString,
  body: optionalNullableString,
  cta: optionalNullableString,
  caption: optionalNullableString,
  scriptNotes: optionalNullableString,
  shotList: optionalNullableString,
  productionNotes: optionalNullableString,
  headline: shortOptionalString,
  visualBrief: optionalNullableString,
  extras: z.unknown().nullable().optional(),
  blocks: z.array(contentBlockInputSchema).max(100).optional(),
});

export const updateContentBodySchema = createContentBodySchema.partial().extend({
  archivedAt: flexibleDateSchema.nullable().optional(),
});

export const transitionStatusBodySchema = z.object({
  status: contentStatusSchema,
});

export const replaceBlocksBodySchema = z.object({
  blocks: z.array(contentBlockInputSchema).max(100),
});

// ---------------------------------------------------------------------------
// Assignments / tasks / costs / analytics / approvals
// ---------------------------------------------------------------------------

export const createAssignmentBodySchema = z.object({
  userId: cuidSchema,
  role: z.string().trim().min(1).max(100),
  responsibility: optionalNullableString,
  deadline: flexibleDateSchema.nullable().optional(),
  status: assignmentStatusSchema.optional(),
  estimatedMinutes: z.number().int().nonnegative().nullable().optional(),
  actualMinutes: z.number().int().nonnegative().nullable().optional(),
  notes: optionalNullableString,
});

export const updateAssignmentBodySchema = createAssignmentBodySchema.partial();

export const createTaskBodySchema = z.object({
  userId: cuidSchema,
  title: nameSchema,
  description: optionalNullableString,
  contentItemId: cuidSchema.nullable().optional(),
  assignmentId: cuidSchema.nullable().optional(),
  status: taskStatusSchema.optional(),
  deadline: flexibleDateSchema.nullable().optional(),
});

export const updateTaskBodySchema = z.object({
  title: nameSchema.optional(),
  description: optionalNullableString,
  userId: cuidSchema.optional(),
  contentItemId: cuidSchema.nullable().optional(),
  assignmentId: cuidSchema.nullable().optional(),
  status: taskStatusSchema.optional(),
  deadline: flexibleDateSchema.nullable().optional(),
  completedAt: flexibleDateSchema.nullable().optional(),
});

export const taskListQuerySchema = paginationQuerySchema.extend({
  userId: cuidSchema.optional(),
  contentItemId: cuidSchema.optional(),
  status: z.union([taskStatusSchema, z.literal('ALL')]).optional(),
});

export const createCostBodySchema = z.object({
  label: nameSchema,
  amount: moneySchema,
  costDate: calendarDateSchema.or(flexibleDateSchema),
  contentItemId: cuidSchema.nullable().optional(),
  taskId: cuidSchema.nullable().optional(),
  userId: cuidSchema.nullable().optional(),
  notes: optionalNullableString,
});

export const updateCostBodySchema = z.object({
  label: nameSchema.optional(),
  amount: moneySchema.optional(),
  costDate: calendarDateSchema.or(flexibleDateSchema).optional(),
  contentItemId: cuidSchema.nullable().optional(),
  taskId: cuidSchema.nullable().optional(),
  userId: cuidSchema.nullable().optional(),
  notes: optionalNullableString,
});

export const costListQuerySchema = paginationQuerySchema.extend({
  contentItemId: cuidSchema.optional(),
  userId: cuidSchema.optional(),
  from: flexibleDateSchema.optional(),
  to: flexibleDateSchema.optional(),
});

export const upsertAnalyticsBodySchema = z.object({
  reach: z.number().int().nonnegative().nullable().optional(),
  views: z.number().int().nonnegative().nullable().optional(),
  likes: z.number().int().nonnegative().nullable().optional(),
  comments: z.number().int().nonnegative().nullable().optional(),
  shares: z.number().int().nonnegative().nullable().optional(),
  saves: z.number().int().nonnegative().nullable().optional(),
  engagement: z.number().nonnegative().nullable().optional(),
  profileVisits: z.number().int().nonnegative().nullable().optional(),
  leads: z.number().int().nonnegative().nullable().optional(),
  conversions: z.number().int().nonnegative().nullable().optional(),
  sales: z.number().int().nonnegative().nullable().optional(),
  notes: optionalNullableString,
  recordedAt: flexibleDateSchema.nullable().optional(),
});

export const createApprovalBodySchema = z.object({
  decision: approvalDecisionSchema.optional(),
  comment: optionalNullableString,
  reviewerRole: shortOptionalString,
});

export const decideApprovalBodySchema = z.object({
  decision: approvalDecisionSchema,
  comment: optionalNullableString,
});

// ---------------------------------------------------------------------------
// Templates / files / activity
// ---------------------------------------------------------------------------

export const templateListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  scope: z.union([templateScopeSchema, z.literal('ALL')]).optional(),
  projectId: cuidSchema.optional(),
  contentType: z.union([contentTypeSchema, z.literal('ALL')]).optional(),
  includeArchived: booleanQuery,
});

export const createTemplateBodySchema = z.object({
  name: nameSchema,
  contentType: contentTypeSchema,
  scope: templateScopeSchema,
  projectId: cuidSchema.nullable().optional(),
  description: optionalNullableString,
  payload: z.unknown(),
});

export const updateTemplateBodySchema = z.object({
  name: nameSchema.optional(),
  contentType: contentTypeSchema.optional(),
  scope: templateScopeSchema.optional(),
  projectId: cuidSchema.nullable().optional(),
  description: optionalNullableString,
  payload: z.unknown().optional(),
  archivedAt: flexibleDateSchema.nullable().optional(),
});

export const useTemplateBodySchema = z.object({
  projectId: cuidSchema,
  publishAt: flexibleDateSchema.nullable().optional(),
});

export const saveAsTemplateBodySchema = z.object({
  name: nameSchema,
  scope: templateScopeSchema,
  projectId: cuidSchema.nullable().optional(),
});

export const activityListQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().trim().max(100).optional(),
  entityId: cuidSchema.optional(),
  eventType: z.string().trim().max(100).optional(),
});

export const uploadFileMetaSchema = z.object({
  kind: fileKindSchema.optional(),
  contentItemId: cuidSchema.nullable().optional(),
});
