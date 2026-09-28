import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  CreateSmmPersonaRequest,
  CreateSmmProjectRequest,
  DecideSmmContentApprovalRequest,
  SmmActivityListQuery,
  SmmAudienceSegmentListQuery,
  SmmCompetitorListQuery,
  SmmContentBlockInput,
  SmmContentCostListQuery,
  SmmContentItemListQuery,
  SmmContentPlanSlotInput,
  SmmContentReferenceListQuery,
  SmmContentStatus,
  SmmContentTaskListQuery,
  SmmContentTemplateListQuery,
  SmmContentType,
  SmmPersonaListQuery,
  SmmProjectListQuery,
  SmmTemplateScope,
  UpdateSmmAudienceSegmentRequest,
  UpdateSmmCampaignRequest,
  UpdateSmmCompetitorRequest,
  UpdateSmmContentAssignmentRequest,
  UpdateSmmContentItemRequest,
  UpdateSmmContentPillarRequest,
  UpdateSmmContentPlanRequest,
  UpdateSmmContentReferenceRequest,
  UpdateSmmContentTaskRequest,
  UpdateSmmPersonaRequest,
  UpdateSmmProjectRequest,
  UpsertSmmContentAnalyticsRequest,
  UpsertSmmProjectMemberRequest,
} from '@furniture-erp/shared';

import {
  smmService,
  type SmmCalendarQuery,
} from '@/services/smm.service';

export const smmKeys = {
  all: ['smm'] as const,
  projects: () => [...smmKeys.all, 'projects'] as const,
  projectList: (query: SmmProjectListQuery) => [...smmKeys.projects(), 'list', query] as const,
  project: (id: string) => [...smmKeys.projects(), 'detail', id] as const,
  progress: (id: string) => [...smmKeys.project(id), 'progress'] as const,
  activity: (id: string, query: SmmActivityListQuery) =>
    [...smmKeys.project(id), 'activity', query] as const,
  members: (id: string) => [...smmKeys.project(id), 'members'] as const,
  audience: (id: string, query: SmmAudienceSegmentListQuery) =>
    [...smmKeys.project(id), 'audience', query] as const,
  audienceDetail: (projectId: string, segmentId: string) =>
    [...smmKeys.project(projectId), 'audience', segmentId] as const,
  personas: (id: string, query: SmmPersonaListQuery) =>
    [...smmKeys.project(id), 'personas', query] as const,
  competitors: (id: string, query: SmmCompetitorListQuery) =>
    [...smmKeys.project(id), 'competitors', query] as const,
  references: (id: string, query: SmmContentReferenceListQuery) =>
    [...smmKeys.project(id), 'references', query] as const,
  pillars: (id: string) => [...smmKeys.project(id), 'pillars'] as const,
  campaigns: (id: string) => [...smmKeys.project(id), 'campaigns'] as const,
  plans: (id: string) => [...smmKeys.project(id), 'plans'] as const,
  planDetail: (projectId: string, planId: string) =>
    [...smmKeys.project(projectId), 'plans', planId] as const,
  content: (id: string, query: SmmContentItemListQuery) =>
    [...smmKeys.project(id), 'content', query] as const,
  calendar: (id: string, query: SmmCalendarQuery) =>
    [...smmKeys.project(id), 'calendar', query] as const,
  contentDetail: (contentId: string) => [...smmKeys.all, 'content', contentId] as const,
  assignments: (contentItemId: string) =>
    [...smmKeys.contentDetail(contentItemId), 'assignments'] as const,
  tasks: (projectId: string, query: SmmContentTaskListQuery) =>
    [...smmKeys.project(projectId), 'tasks', query] as const,
  costs: (projectId: string, query: SmmContentCostListQuery) =>
    [...smmKeys.project(projectId), 'costs', query] as const,
  analytics: (contentId: string) => [...smmKeys.contentDetail(contentId), 'analytics'] as const,
  approvals: (contentId: string) => [...smmKeys.contentDetail(contentId), 'approvals'] as const,
  files: (projectId: string, contentItemId?: string) =>
    [...smmKeys.project(projectId), 'files', contentItemId ?? 'all'] as const,
  templates: (query: SmmContentTemplateListQuery) =>
    [...smmKeys.all, 'templates', query] as const,
};

function invalidateProject(qc: ReturnType<typeof useQueryClient>, projectId: string) {
  void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) });
  void qc.invalidateQueries({ queryKey: smmKeys.projects() });
}

// ── Projects ──────────────────────────────────────────────────────────────

export function useSmmProjectsList(query: SmmProjectListQuery, enabled = true) {
  return useQuery({
    queryKey: smmKeys.projectList(query),
    queryFn: ({ signal }) => smmService.listProjects(query, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSmmProject(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.project(projectId ?? ''),
    queryFn: ({ signal }) => smmService.getProject(projectId!, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useSmmProgress(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.progress(projectId ?? ''),
    queryFn: ({ signal }) => smmService.getProgress(projectId!, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useSmmActivity(
  projectId: string | null,
  query: SmmActivityListQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.activity(projectId ?? '', query),
    queryFn: ({ signal }) => smmService.listActivity(projectId!, query, signal),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateSmmProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSmmProjectRequest) => smmService.createProject(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.projects() }),
  });
}

export function useUpdateSmmProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSmmProjectRequest) => smmService.updateProject(projectId, body),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useArchiveSmmProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => smmService.archiveProject(projectId),
    onSuccess: (_d, projectId) => invalidateProject(qc, projectId),
  });
}

// ── Members ───────────────────────────────────────────────────────────────

export function useSmmMembers(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.members(projectId ?? ''),
    queryFn: ({ signal }) => smmService.listMembers(projectId!, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useUpsertSmmMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertSmmProjectMemberRequest) => smmService.upsertMember(projectId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.members(projectId) });
      invalidateProject(qc, projectId);
    },
  });
}

export function useUpdateSmmMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      body,
    }: {
      memberId: string;
      body: Partial<UpsertSmmProjectMemberRequest>;
    }) => smmService.updateMember(projectId, memberId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.members(projectId) }),
  });
}

export function useRemoveSmmMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => smmService.removeMember(projectId, memberId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.members(projectId) });
      invalidateProject(qc, projectId);
    },
  });
}

// ── Audience / Personas ───────────────────────────────────────────────────

export function useSmmAudience(
  projectId: string | null,
  query: SmmAudienceSegmentListQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.audience(projectId ?? '', query),
    queryFn: ({ signal }) => smmService.listAudience(projectId!, query, signal),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSmmAudienceSegment(
  projectId: string | null,
  segmentId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.audienceDetail(projectId ?? '', segmentId ?? ''),
    queryFn: ({ signal }) => smmService.getAudienceSegment(projectId!, segmentId!, signal),
    enabled: Boolean(projectId && segmentId) && enabled,
  });
}

export function useCreateSmmAudience(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSmmAudienceSegmentRequest) =>
      smmService.createAudienceSegment(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useUpdateSmmAudience(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      segmentId,
      body,
    }: {
      segmentId: string;
      body: UpdateSmmAudienceSegmentRequest;
    }) => smmService.updateAudienceSegment(projectId, segmentId, body),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) });
      void qc.invalidateQueries({
        queryKey: smmKeys.audienceDetail(projectId, vars.segmentId),
      });
    },
  });
}

export function useArchiveSmmAudience(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (segmentId: string) => smmService.archiveAudienceSegment(projectId, segmentId),
    onSuccess: (_d, segmentId) => {
      void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) });
      void qc.invalidateQueries({ queryKey: smmKeys.audienceDetail(projectId, segmentId) });
    },
  });
}

export function useSmmPersonas(
  projectId: string | null,
  query: SmmPersonaListQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.personas(projectId ?? '', query),
    queryFn: ({ signal }) => smmService.listPersonas(projectId!, query, signal),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateSmmPersona(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSmmPersonaRequest) => smmService.createPersona(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useUpdateSmmPersona(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personaId, body }: { personaId: string; body: UpdateSmmPersonaRequest }) =>
      smmService.updatePersona(projectId, personaId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

// ── Competitors / References ───────────────────────────────────────────────

export function useSmmCompetitors(
  projectId: string | null,
  query: SmmCompetitorListQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.competitors(projectId ?? '', query),
    queryFn: ({ signal }) => smmService.listCompetitors(projectId!, query, signal),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateSmmCompetitor(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSmmCompetitorRequest) =>
      smmService.createCompetitor(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useUpdateSmmCompetitor(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      competitorId,
      body,
    }: {
      competitorId: string;
      body: UpdateSmmCompetitorRequest;
    }) => smmService.updateCompetitor(projectId, competitorId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useSmmReferences(
  projectId: string | null,
  query: SmmContentReferenceListQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.references(projectId ?? '', query),
    queryFn: ({ signal }) => smmService.listReferences(projectId!, query, signal),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateSmmReference(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSmmContentReferenceRequest) =>
      smmService.createReference(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useUpdateSmmReference(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      referenceId,
      body,
    }: {
      referenceId: string;
      body: UpdateSmmContentReferenceRequest;
    }) => smmService.updateReference(projectId, referenceId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useDuplicateReferenceIdea(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (referenceId: string) =>
      smmService.duplicateReferenceIdea(projectId, referenceId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

// ── Content / Calendar ────────────────────────────────────────────────────

export function useSmmContentList(
  projectId: string | null,
  query: SmmContentItemListQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.content(projectId ?? '', query),
    queryFn: ({ signal }) => smmService.listContent(projectId!, query, signal),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSmmCalendar(
  projectId: string | null,
  query: SmmCalendarQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.calendar(projectId ?? '', query),
    queryFn: ({ signal }) => smmService.getCalendar(projectId!, query, signal),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSmmContentDetail(contentId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.contentDetail(contentId ?? ''),
    queryFn: ({ signal }) => smmService.getContent(contentId!, signal),
    enabled: Boolean(contentId) && enabled,
  });
}

export function useCreateSmmContent(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSmmContentItemRequest) => smmService.createContent(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useUpdateSmmContent(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contentId, body }: { contentId: string; body: UpdateSmmContentItemRequest }) =>
      smmService.updateContent(contentId, body),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(vars.contentId) });
      void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) });
    },
  });
}

export function useTransitionSmmContentStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contentId, status }: { contentId: string; status: SmmContentStatus }) =>
      smmService.transitionContentStatus(contentId, status),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(vars.contentId) });
      void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) });
    },
  });
}

export function useArchiveSmmContent(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => smmService.archiveContent(contentId),
    onSuccess: (_d, contentId) => {
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(contentId) });
      void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) });
    },
  });
}

export function useDuplicateSmmContent(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => smmService.duplicateContent(contentId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useReplaceSmmBlocks(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contentId, blocks }: { contentId: string; blocks: SmmContentBlockInput[] }) =>
      smmService.replaceBlocks(contentId, blocks),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(vars.contentId) });
      void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) });
    },
  });
}

export function useSaveSmmContentAsTemplate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contentId,
      name,
      scope,
      description,
    }: {
      contentId: string;
      name: string;
      scope: SmmTemplateScope;
      description?: string | null;
    }) => smmService.saveContentAsTemplate(contentId, { name, scope, description }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) });
      void qc.invalidateQueries({ queryKey: smmKeys.all });
    },
  });
}

export function useSmmPillars(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.pillars(projectId ?? ''),
    queryFn: ({ signal }) => smmService.listPillars(projectId!, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useCreateSmmPillar(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSmmContentPillarRequest) => smmService.createPillar(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.pillars(projectId) }),
  });
}

export function useUpdateSmmPillar(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pillarId,
      body,
    }: {
      pillarId: string;
      body: UpdateSmmContentPillarRequest;
    }) => smmService.updatePillar(projectId, pillarId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.pillars(projectId) }),
  });
}

export function useSmmCampaigns(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.campaigns(projectId ?? ''),
    queryFn: ({ signal }) => smmService.listCampaigns(projectId!, {}, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useCreateSmmCampaign(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSmmCampaignRequest) => smmService.createCampaign(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.campaigns(projectId) }),
  });
}

export function useUpdateSmmCampaign(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      body,
    }: {
      campaignId: string;
      body: UpdateSmmCampaignRequest;
    }) => smmService.updateCampaign(projectId, campaignId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.campaigns(projectId) }),
  });
}

export function useSmmPlans(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.plans(projectId ?? ''),
    queryFn: ({ signal }) => smmService.listPlans(projectId!, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useSmmPlan(
  projectId: string | null,
  planId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.planDetail(projectId ?? '', planId ?? ''),
    queryFn: ({ signal }) => smmService.getPlan(projectId!, planId!, signal),
    enabled: Boolean(projectId && planId) && enabled,
  });
}

export function useCreateSmmPlan(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSmmContentPlanRequest) => smmService.createPlan(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.plans(projectId) }),
  });
}

export function useUpdateSmmPlan(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, body }: { planId: string; body: UpdateSmmContentPlanRequest }) =>
      smmService.updatePlan(projectId, planId, body),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: smmKeys.plans(projectId) });
      void qc.invalidateQueries({ queryKey: smmKeys.planDetail(projectId, vars.planId) });
    },
  });
}

export function useCreateSmmPlanSlot(projectId: string, planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SmmContentPlanSlotInput) =>
      smmService.createPlanSlot(projectId, planId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.planDetail(projectId, planId) });
      void qc.invalidateQueries({ queryKey: smmKeys.plans(projectId) });
    },
  });
}

export function useUpdateSmmPlanSlot(projectId: string, planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      slotId,
      body,
    }: {
      slotId: string;
      body: Partial<SmmContentPlanSlotInput>;
    }) => smmService.updatePlanSlot(projectId, planId, slotId, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: smmKeys.planDetail(projectId, planId) }),
  });
}

export function useDeleteSmmPlanSlot(projectId: string, planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => smmService.deletePlanSlot(projectId, planId, slotId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.planDetail(projectId, planId) });
      void qc.invalidateQueries({ queryKey: smmKeys.plans(projectId) });
    },
  });
}

export function useSmmCompetitorDetail(
  projectId: string | null,
  competitorId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [...smmKeys.project(projectId ?? ''), 'competitors', competitorId ?? ''] as const,
    queryFn: ({ signal }) => smmService.getCompetitor(projectId!, competitorId!, signal),
    enabled: Boolean(projectId && competitorId) && enabled,
  });
}

export function useSmmPersonaDetail(
  projectId: string | null,
  personaId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [...smmKeys.project(projectId ?? ''), 'personas', personaId ?? ''] as const,
    queryFn: ({ signal }) => smmService.getPersona(projectId!, personaId!, signal),
    enabled: Boolean(projectId && personaId) && enabled,
  });
}

// ── Assignments / Tasks / Costs ───────────────────────────────────────────

export function useSmmAssignments(contentItemId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.assignments(contentItemId ?? ''),
    queryFn: ({ signal }) => smmService.listAssignments(contentItemId!, signal),
    enabled: Boolean(contentItemId) && enabled,
  });
}

export function useCreateSmmAssignment(contentItemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateSmmContentAssignmentRequest, 'contentItemId'>) =>
      smmService.createAssignment(contentItemId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.assignments(contentItemId) });
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(contentItemId) });
    },
  });
}

export function useUpdateSmmAssignment(contentItemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      body,
    }: {
      assignmentId: string;
      body: UpdateSmmContentAssignmentRequest;
    }) => smmService.updateAssignment(contentItemId, assignmentId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.assignments(contentItemId) });
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(contentItemId) });
    },
  });
}

export function useDeleteSmmAssignment(contentItemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      smmService.deleteAssignment(contentItemId, assignmentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.assignments(contentItemId) });
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(contentItemId) });
    },
  });
}

export function useGenerateTaskFromAssignment(contentItemId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      smmService.generateTaskFromAssignment(contentItemId, assignmentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.assignments(contentItemId) });
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(contentItemId) });
      if (projectId) void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) });
    },
  });
}

export function useSmmTasks(
  projectId: string | null,
  query: SmmContentTaskListQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.tasks(projectId ?? '', query),
    queryFn: ({ signal }) => smmService.listTasks(projectId!, query, signal),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateSmmTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateSmmContentTaskRequest, 'projectId'>) =>
      smmService.createTask(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useUpdateSmmTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: UpdateSmmContentTaskRequest }) =>
      smmService.updateTask(taskId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useSmmCosts(
  projectId: string | null,
  query: SmmContentCostListQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.costs(projectId ?? '', query),
    queryFn: ({ signal }) => smmService.listCosts(projectId!, query, signal),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateSmmCost(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateSmmContentCostRequest, 'projectId'>) =>
      smmService.createCost(projectId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useDeleteSmmCost(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (costId: string) => smmService.deleteCost(costId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

// ── Analytics / Approvals / Files / Templates ─────────────────────────────

export function useSmmContentAnalytics(contentId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.analytics(contentId ?? ''),
    queryFn: ({ signal }) => smmService.getAnalytics(contentId!, signal),
    enabled: Boolean(contentId) && enabled,
    retry: false,
  });
}

export function useUpsertSmmAnalytics(contentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertSmmContentAnalyticsRequest) =>
      smmService.upsertAnalytics(contentId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.analytics(contentId) }),
  });
}

export function useSmmApprovals(contentId: string | null, enabled = true) {
  return useQuery({
    queryKey: smmKeys.approvals(contentId ?? ''),
    queryFn: ({ signal }) => smmService.listApprovals(contentId!, signal),
    enabled: Boolean(contentId) && enabled,
  });
}

export function useCreateSmmApproval(contentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DecideSmmContentApprovalRequest) =>
      smmService.createApproval(contentId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.approvals(contentId) });
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(contentId) });
    },
  });
}

export function useDecideSmmApproval(contentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DecideSmmContentApprovalRequest) =>
      smmService.decideApproval(contentId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: smmKeys.approvals(contentId) });
      void qc.invalidateQueries({ queryKey: smmKeys.contentDetail(contentId) });
    },
  });
}

export function useSmmFiles(
  projectId: string | null,
  contentItemId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: smmKeys.files(projectId ?? '', contentItemId),
    queryFn: ({ signal }) => smmService.listFiles(projectId!, { contentItemId }, signal),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useUploadSmmFile(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      contentItemId,
      kind,
    }: {
      file: File;
      contentItemId?: string | null;
      kind?: string;
    }) => smmService.uploadFile(projectId, file, { contentItemId, kind }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useDeleteSmmFile(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => smmService.deleteFile(fileId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}

export function useSmmTemplates(query: SmmContentTemplateListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: smmKeys.templates(query),
    queryFn: ({ signal }) => smmService.listTemplates(query, signal),
    enabled,
  });
}

export function useApplySmmTemplate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      publishAt,
    }: {
      templateId: string;
      publishAt?: string | null;
      contentType?: SmmContentType;
    }) => smmService.applyTemplate(templateId, { projectId, publishAt }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: smmKeys.project(projectId) }),
  });
}
