import {
  SmmProgressStatusGroup,
  smmProgressGroupForStatus,
  type SmmActivityListItem,
  type SmmAudienceSegmentDetail,
  type SmmAudienceSegmentListItem,
  type SmmCampaignDetail,
  type SmmCampaignListItem,
  type SmmCompetitorDetail,
  type SmmCompetitorListItem,
  type SmmContentAnalyticsDto,
  type SmmContentApprovalListItem,
  type SmmContentAssignmentDetail,
  type SmmContentAssignmentListItem,
  type SmmContentBlockDto,
  type SmmContentCostDetail,
  type SmmContentCostListItem,
  type SmmContentFileListItem,
  type SmmContentItemDetail,
  type SmmContentItemListItem,
  type SmmContentPillarDetail,
  type SmmContentPillarListItem,
  type SmmContentPlanDetail,
  type SmmContentPlanListItem,
  type SmmContentPlanSlotDto,
  type SmmContentReferenceDetail,
  type SmmContentReferenceListItem,
  type SmmContentTaskDetail,
  type SmmContentTaskListItem,
  type SmmContentTemplateDetail,
  type SmmContentTemplateListItem,
  type SmmContentType,
  type SmmInsightNote,
  type SmmPersonaDetail,
  type SmmPersonaListItem,
  type SmmPlatform,
  type SmmProjectDetail,
  type SmmProjectListItem,
  type SmmProjectMemberDto,
  type SmmUserSummary,
  type SmmContentStatus,
} from '@furniture-erp/shared';
import type {
  SmmActivity,
  SmmAudienceSegment,
  SmmCampaign,
  SmmCompetitor,
  SmmContentAnalytics,
  SmmContentApproval,
  SmmContentAssignment,
  SmmContentBlock,
  SmmContentCost,
  SmmContentFile,
  SmmContentItem,
  SmmContentPillar,
  SmmContentPlan,
  SmmContentPlanSlot,
  SmmContentReference,
  SmmContentTask,
  SmmContentTemplate,
  SmmPersona,
  SmmProject,
  SmmProjectMember,
  User,
} from '@prisma/client';

import { fromDbMoney } from '../../lib/money-mapper.js';

type UserRef = Pick<User, 'id' | 'fullName'>;

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toIsoRequired(value: Date): string {
  return value.toISOString();
}

export function mapUserSummary(user: UserRef | null | undefined): SmmUserSummary | null {
  if (!user) return null;
  return { id: user.id, fullName: user.fullName };
}

function parseInsights(raw: unknown): SmmInsightNote[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      text: String(item.text ?? ''),
      source: (item.source as SmmInsightNote['source']) ?? null,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
    }))
    .filter((item) => item.text.length > 0);
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => String(v));
}

function parsePlatformArray(raw: unknown): SmmPlatform[] {
  return parseStringArray(raw) as SmmPlatform[];
}

function parseContentTypeArray(raw: unknown): SmmContentType[] {
  return parseStringArray(raw) as SmmContentType[];
}

// ---------------------------------------------------------------------------
// Projects / members
// ---------------------------------------------------------------------------

export function mapProjectListItem(
  project: SmmProject & { _count?: { members?: number; contentItems?: number } },
): SmmProjectListItem {
  return {
    id: project.id,
    name: project.name,
    clientName: project.clientName,
    status: project.status,
    budgetPlanned:
      project.budgetPlanned === null || project.budgetPlanned === undefined
        ? null
        : fromDbMoney(project.budgetPlanned),
    startDate: toIso(project.startDate),
    endDate: toIso(project.endDate),
    memberCount: project._count?.members ?? 0,
    contentCount: project._count?.contentItems ?? 0,
    createdAt: toIsoRequired(project.createdAt),
    updatedAt: toIsoRequired(project.updatedAt),
  };
}

export function mapProjectMember(
  member: SmmProjectMember & { user: UserRef },
): SmmProjectMemberDto {
  return {
    id: member.id,
    userId: member.userId,
    user: { id: member.user.id, fullName: member.user.fullName },
    role: member.role,
    isActive: member.isActive,
    notes: member.notes,
    createdAt: toIsoRequired(member.createdAt),
  };
}

export function mapProjectDetail(
  project: SmmProject & {
    clientUser: UserRef | null;
    createdBy: UserRef | null;
    members: Array<SmmProjectMember & { user: UserRef }>;
    _count?: { members?: number; contentItems?: number };
  },
): SmmProjectDetail {
  return {
    ...mapProjectListItem(project),
    description: project.description,
    notes: project.notes,
    clientUserId: project.clientUserId,
    clientUser: mapUserSummary(project.clientUser),
    createdBy: mapUserSummary(project.createdBy),
    members: project.members.map(mapProjectMember),
  };
}

// ---------------------------------------------------------------------------
// Audience / personas / competitors / references
// ---------------------------------------------------------------------------

export function mapAudienceListItem(
  segment: SmmAudienceSegment & { _count?: { personas?: number } },
): SmmAudienceSegmentListItem {
  return {
    id: segment.id,
    projectId: segment.projectId,
    name: segment.name,
    ageRange: segment.ageRange,
    gender: segment.gender,
    location: segment.location,
    sortOrder: segment.sortOrder,
    personaCount: segment._count?.personas ?? 0,
    archivedAt: toIso(segment.archivedAt),
    updatedAt: toIsoRequired(segment.updatedAt),
  };
}

export function mapAudienceDetail(
  segment: SmmAudienceSegment & { _count?: { personas?: number } },
): SmmAudienceSegmentDetail {
  return {
    ...mapAudienceListItem(segment),
    income: segment.income,
    occupation: segment.occupation,
    interests: segment.interests ?? [],
    painPoints: segment.painPoints,
    needs: segment.needs,
    desires: segment.desires,
    objections: segment.objections,
    buyingMotivation: segment.buyingMotivation,
    buyingBehavior: segment.buyingBehavior,
    contentPreferences: segment.contentPreferences,
    researchSources: segment.researchSources,
    notes: segment.notes,
    insights: parseInsights(segment.insights),
    createdAt: toIsoRequired(segment.createdAt),
  };
}

export function mapPersonaListItem(
  persona: SmmPersona & { segment?: { name: string } | null },
): SmmPersonaListItem {
  return {
    id: persona.id,
    projectId: persona.projectId,
    segmentId: persona.segmentId,
    segmentName: persona.segment?.name ?? null,
    name: persona.name,
    ageRange: persona.ageRange,
    gender: persona.gender,
    occupation: persona.occupation,
    archivedAt: toIso(persona.archivedAt),
    updatedAt: toIsoRequired(persona.updatedAt),
  };
}

export function mapPersonaDetail(
  persona: SmmPersona & { segment?: { name: string } | null },
): SmmPersonaDetail {
  return {
    ...mapPersonaListItem(persona),
    location: persona.location,
    income: persona.income,
    problems: persona.problems,
    needs: persona.needs,
    motivation: persona.motivation,
    objections: persona.objections,
    preferredContent: persona.preferredContent,
    notes: persona.notes,
    createdAt: toIsoRequired(persona.createdAt),
  };
}

export function mapCompetitorListItem(row: SmmCompetitor): SmmCompetitorListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    platform: row.platform,
    profileUrl: row.profileUrl,
    followers: row.followers,
    researchDate: toIso(row.researchDate),
    archivedAt: toIso(row.archivedAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapCompetitorDetail(row: SmmCompetitor): SmmCompetitorDetail {
  return {
    ...mapCompetitorListItem(row),
    postingFrequency: row.postingFrequency,
    contentFormats: row.contentFormats,
    engagement: row.engagement,
    offers: row.offers,
    pricing: row.pricing,
    positioning: row.positioning,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    bestContent: row.bestContent,
    hooks: row.hooks,
    notes: row.notes,
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapReferenceListItem(row: SmmContentReference): SmmContentReferenceListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    platform: row.platform,
    contentType: row.contentType,
    sourceUrl: row.sourceUrl,
    creatorName: row.creatorName,
    tags: row.tags ?? [],
    mediaUrl: row.mediaUrl,
    archivedAt: toIso(row.archivedAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapReferenceDetail(row: SmmContentReference): SmmContentReferenceDetail {
  return {
    ...mapReferenceListItem(row),
    topic: row.topic,
    hook: row.hook,
    format: row.format,
    goal: row.goal,
    whySaved: row.whySaved,
    notes: row.notes,
    mediaKey: row.mediaKey,
    createdAt: toIsoRequired(row.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Pillars / campaigns / plans
// ---------------------------------------------------------------------------

export function mapPillarListItem(
  row: SmmContentPillar & { _count?: { contentItems?: number } },
): SmmContentPillarListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    description: row.description,
    color: row.color,
    sortOrder: row.sortOrder,
    contentCount: row._count?.contentItems ?? 0,
    archivedAt: toIso(row.archivedAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapPillarDetail(
  row: SmmContentPillar & { _count?: { contentItems?: number } },
): SmmContentPillarDetail {
  return {
    ...mapPillarListItem(row),
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapCampaignListItem(
  row: SmmCampaign & { _count?: { contentItems?: number } },
): SmmCampaignListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    status: row.status,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    contentCount: row._count?.contentItems ?? 0,
    archivedAt: toIso(row.archivedAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapCampaignDetail(
  row: SmmCampaign & { _count?: { contentItems?: number } },
): SmmCampaignDetail {
  return {
    ...mapCampaignListItem(row),
    description: row.description,
    goal: row.goal,
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapPlanSlot(row: SmmContentPlanSlot): SmmContentPlanSlotDto {
  return {
    id: row.id,
    date: toIsoRequired(row.date),
    contentType: row.contentType,
    platform: row.platform,
    title: row.title,
    notes: row.notes,
    contentItemId: row.contentItemId,
    sortOrder: row.sortOrder,
  };
}

export function mapPlanListItem(
  row: SmmContentPlan & { _count?: { slots?: number } },
): SmmContentPlanListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    periodStart: toIsoRequired(row.periodStart),
    periodEnd: toIsoRequired(row.periodEnd),
    platforms: parsePlatformArray(row.platforms),
    contentTypes: parseContentTypeArray(row.contentTypes),
    slotCount: row._count?.slots ?? 0,
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapPlanDetail(
  row: SmmContentPlan & { slots: SmmContentPlanSlot[]; _count?: { slots?: number } },
): SmmContentPlanDetail {
  return {
    ...mapPlanListItem({
      ...row,
      _count: { slots: row.slots?.length ?? row._count?.slots ?? 0 },
    }),
    frequencyNotes: row.frequencyNotes,
    pillarIds: parseStringArray(row.pillarIds),
    goals: row.goals,
    notes: row.notes,
    slots: row.slots.map(mapPlanSlot),
    createdAt: toIsoRequired(row.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Templates / content / blocks
// ---------------------------------------------------------------------------

export function mapTemplateListItem(row: SmmContentTemplate): SmmContentTemplateListItem {
  return {
    id: row.id,
    storeId: row.storeId,
    projectId: row.projectId,
    scope: row.scope,
    name: row.name,
    contentType: row.contentType,
    description: row.description,
    archivedAt: toIso(row.archivedAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapTemplateDetail(
  row: SmmContentTemplate & { createdBy?: UserRef | null },
): SmmContentTemplateDetail {
  return {
    ...mapTemplateListItem(row),
    payload: row.payload,
    createdBy: mapUserSummary(row.createdBy),
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapContentBlock(row: SmmContentBlock): SmmContentBlockDto {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    visualDirection: row.visualDirection,
    referenceText: row.referenceText,
    sortOrder: row.sortOrder,
  };
}

export function mapContentListItem(
  row: SmmContentItem & {
    campaign?: { name: string } | null;
    pillar?: { name: string } | null;
    _count?: { assignments?: number };
  },
): SmmContentItemListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    campaignId: row.campaignId,
    campaignName: row.campaign?.name ?? null,
    platform: row.platform,
    contentType: row.contentType,
    title: row.title,
    status: row.status,
    publishAt: toIso(row.publishAt),
    pillarId: row.pillarId,
    pillarName: row.pillar?.name ?? null,
    assigneeCount: row._count?.assignments ?? 0,
    archivedAt: toIso(row.archivedAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapContentDetail(
  row: SmmContentItem & {
    campaign?: { name: string } | null;
    pillar?: { name: string } | null;
    createdBy?: UserRef | null;
    blocks: SmmContentBlock[];
    _count?: { assignments?: number };
  },
  options?: { hideInternalNotes?: boolean },
): SmmContentItemDetail {
  const base = mapContentListItem(row);
  return {
    ...base,
    goal: row.goal,
    topic: row.topic,
    expectedResult: row.expectedResult,
    audienceSegmentId: row.audienceSegmentId,
    personaId: row.personaId,
    referenceId: row.referenceId,
    notes: options?.hideInternalNotes ? null : row.notes,
    format: row.format,
    hook: row.hook,
    body: row.body,
    cta: row.cta,
    caption: row.caption,
    scriptNotes: options?.hideInternalNotes ? null : row.scriptNotes,
    shotList: options?.hideInternalNotes ? null : row.shotList,
    productionNotes: options?.hideInternalNotes ? null : row.productionNotes,
    headline: row.headline,
    visualBrief: row.visualBrief,
    extras: row.extras,
    createdBy: mapUserSummary(row.createdBy),
    blocks: row.blocks.map(mapContentBlock),
    createdAt: toIsoRequired(row.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Assignments / tasks / costs / analytics / approvals / files / activity
// ---------------------------------------------------------------------------

export function mapAssignmentListItem(
  row: SmmContentAssignment & {
    user: UserRef;
    contentItem?: { title: string } | null;
  },
): SmmContentAssignmentListItem {
  return {
    id: row.id,
    contentItemId: row.contentItemId,
    contentTitle: row.contentItem?.title ?? null,
    userId: row.userId,
    user: { id: row.user.id, fullName: row.user.fullName },
    role: row.role,
    responsibility: row.responsibility,
    deadline: toIso(row.deadline),
    status: row.status,
    estimatedMinutes: row.estimatedMinutes,
    actualMinutes: row.actualMinutes,
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapAssignmentDetail(
  row: SmmContentAssignment & {
    user: UserRef;
    contentItem?: { title: string } | null;
  },
): SmmContentAssignmentDetail {
  return {
    ...mapAssignmentListItem(row),
    notes: row.notes,
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapTaskListItem(
  row: SmmContentTask & { user: UserRef },
): SmmContentTaskListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    contentItemId: row.contentItemId,
    assignmentId: row.assignmentId,
    userId: row.userId,
    user: { id: row.user.id, fullName: row.user.fullName },
    title: row.title,
    status: row.status,
    deadline: toIso(row.deadline),
    completedAt: toIso(row.completedAt),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapTaskDetail(
  row: SmmContentTask & { user: UserRef; createdBy?: UserRef | null },
): SmmContentTaskDetail {
  return {
    ...mapTaskListItem(row),
    description: row.description,
    createdBy: mapUserSummary(row.createdBy),
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapCostListItem(
  row: SmmContentCost & { user?: UserRef | null },
): SmmContentCostListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    contentItemId: row.contentItemId,
    taskId: row.taskId,
    userId: row.userId,
    user: mapUserSummary(row.user),
    label: row.label,
    amount: fromDbMoney(row.amount),
    costDate: toIsoRequired(row.costDate),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapCostDetail(
  row: SmmContentCost & { user?: UserRef | null; createdBy?: UserRef | null },
): SmmContentCostDetail {
  return {
    ...mapCostListItem(row),
    notes: row.notes,
    createdBy: mapUserSummary(row.createdBy),
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapAnalytics(
  row: SmmContentAnalytics & { recordedBy?: UserRef | null },
): SmmContentAnalyticsDto {
  return {
    id: row.id,
    contentItemId: row.contentItemId,
    reach: row.reach,
    views: row.views,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    saves: row.saves,
    engagement: row.engagement,
    profileVisits: row.profileVisits,
    leads: row.leads,
    conversions: row.conversions,
    sales: row.sales,
    notes: row.notes,
    recordedAt: toIso(row.recordedAt),
    recordedBy: mapUserSummary(row.recordedBy),
    updatedAt: toIsoRequired(row.updatedAt),
  };
}

export function mapApproval(
  row: SmmContentApproval & { reviewer?: UserRef | null },
): SmmContentApprovalListItem {
  return {
    id: row.id,
    contentItemId: row.contentItemId,
    decision: row.decision,
    reviewerId: row.reviewerId,
    reviewer: mapUserSummary(row.reviewer),
    reviewerRole: row.reviewerRole,
    comment: row.comment,
    decidedAt: toIso(row.decidedAt),
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapFile(
  row: SmmContentFile & { uploadedBy?: UserRef | null },
): SmmContentFileListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    contentItemId: row.contentItemId,
    kind: row.kind,
    fileName: row.fileName,
    fileKey: row.fileKey,
    fileUrl: row.fileUrl,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: mapUserSummary(row.uploadedBy),
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function mapActivity(
  row: SmmActivity & { actor?: UserRef | null },
): SmmActivityListItem {
  return {
    id: row.id,
    projectId: row.projectId,
    actorUserId: row.actorUserId,
    actor: mapUserSummary(row.actor),
    eventType: row.eventType,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
    metadata: row.metadata,
    createdAt: toIsoRequired(row.createdAt),
  };
}

export function emptyProgressByGroup(): Record<SmmProgressStatusGroup, number> {
  return {
    [SmmProgressStatusGroup.IDEATION]: 0,
    [SmmProgressStatusGroup.PRODUCTION]: 0,
    [SmmProgressStatusGroup.REVIEW]: 0,
    [SmmProgressStatusGroup.READY]: 0,
    [SmmProgressStatusGroup.LIVE]: 0,
    [SmmProgressStatusGroup.ARCHIVED]: 0,
  };
}

export function progressGroupFor(status: SmmContentStatus): SmmProgressStatusGroup {
  return smmProgressGroupForStatus(status);
}
