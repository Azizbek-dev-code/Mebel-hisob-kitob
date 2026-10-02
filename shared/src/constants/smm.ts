/**
 * SMM Agency CMS enumerations — mirror Prisma enums in `server/prisma/schema.prisma`.
 *
 * Kept here so the client never imports from the server and both sides fail to
 * compile if a value is added on only one side.
 */

export const SmmProjectStatus = {
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type SmmProjectStatus = (typeof SmmProjectStatus)[keyof typeof SmmProjectStatus];
export const SMM_PROJECT_STATUSES = Object.values(SmmProjectStatus);

export const SMM_PROJECT_STATUS_LABELS = {
  ACTIVE: 'Faol',
  ON_HOLD: 'To‘xtatilgan',
  COMPLETED: 'Yakunlangan',
  ARCHIVED: 'Arxiv',
} as const satisfies Record<SmmProjectStatus, string>;

export const SmmProjectMemberRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  EDITOR: 'EDITOR',
  DESIGNER: 'DESIGNER',
  VIDEOGRAPHER: 'VIDEOGRAPHER',
  COPYWRITER: 'COPYWRITER',
  CLIENT: 'CLIENT',
} as const;
export type SmmProjectMemberRole =
  (typeof SmmProjectMemberRole)[keyof typeof SmmProjectMemberRole];
export const SMM_PROJECT_MEMBER_ROLES = Object.values(SmmProjectMemberRole);

export const SMM_PROJECT_MEMBER_ROLE_LABELS = {
  OWNER: 'Egasi',
  ADMIN: 'Admin',
  MANAGER: 'Menejer',
  PROJECT_MANAGER: 'Loyiha menejeri',
  CONTENT_MANAGER: 'Kontent menejeri',
  EDITOR: 'Muharrir',
  DESIGNER: 'Dizayner',
  VIDEOGRAPHER: 'Videograf',
  COPYWRITER: 'Kopirayter',
  CLIENT: 'Mijoz',
} as const satisfies Record<SmmProjectMemberRole, string>;

export const SmmInsightSource = {
  CLIENT_INTERVIEW: 'CLIENT_INTERVIEW',
  CUSTOMER_DATA: 'CUSTOMER_DATA',
  INSTAGRAM_INSIGHTS: 'INSTAGRAM_INSIGHTS',
  ADVERTISING_DATA: 'ADVERTISING_DATA',
  COMPETITOR_RESEARCH: 'COMPETITOR_RESEARCH',
  CUSTOMER_INTERVIEW: 'CUSTOMER_INTERVIEW',
  COMMENTS: 'COMMENTS',
  DM: 'DM',
  MARKET_RESEARCH: 'MARKET_RESEARCH',
  OTHER: 'OTHER',
} as const;
export type SmmInsightSource = (typeof SmmInsightSource)[keyof typeof SmmInsightSource];
export const SMM_INSIGHT_SOURCES = Object.values(SmmInsightSource);

export const SMM_INSIGHT_SOURCE_LABELS = {
  CLIENT_INTERVIEW: 'Mijoz intervyusi',
  CUSTOMER_DATA: 'Mijoz ma’lumotlari',
  INSTAGRAM_INSIGHTS: 'Instagram Insights',
  ADVERTISING_DATA: 'Reklama ma’lumotlari',
  COMPETITOR_RESEARCH: 'Raqobatchi tadqiqoti',
  CUSTOMER_INTERVIEW: 'Iste’molchi intervyusi',
  COMMENTS: 'Izohlar',
  DM: 'DM',
  MARKET_RESEARCH: 'Bozor tadqiqoti',
  OTHER: 'Boshqa',
} as const satisfies Record<SmmInsightSource, string>;

export const SmmPlatform = {
  INSTAGRAM: 'INSTAGRAM',
  TIKTOK: 'TIKTOK',
  FACEBOOK: 'FACEBOOK',
  YOUTUBE: 'YOUTUBE',
  WEBSITE: 'WEBSITE',
  OTHER: 'OTHER',
} as const;
export type SmmPlatform = (typeof SmmPlatform)[keyof typeof SmmPlatform];
export const SMM_PLATFORMS = Object.values(SmmPlatform);

export const SMM_PLATFORM_LABELS = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  FACEBOOK: 'Facebook',
  YOUTUBE: 'YouTube',
  WEBSITE: 'Veb-sayt',
  OTHER: 'Boshqa',
} as const satisfies Record<SmmPlatform, string>;

export const SmmContentType = {
  REELS: 'REELS',
  STORY: 'STORY',
  POST: 'POST',
  CAROUSEL: 'CAROUSEL',
  VIDEO: 'VIDEO',
  AD: 'AD',
} as const;
export type SmmContentType = (typeof SmmContentType)[keyof typeof SmmContentType];
export const SMM_CONTENT_TYPES = Object.values(SmmContentType);

export const SMM_CONTENT_TYPE_LABELS = {
  REELS: 'Reels',
  STORY: 'Story',
  POST: 'Post',
  CAROUSEL: 'Karusel',
  VIDEO: 'Video',
  AD: 'Reklama',
} as const satisfies Record<SmmContentType, string>;

export const SmmContentStatus = {
  IDEA: 'IDEA',
  PLANNED: 'PLANNED',
  BRIEF: 'BRIEF',
  SCRIPT_COPY: 'SCRIPT_COPY',
  PRODUCTION: 'PRODUCTION',
  INTERNAL_REVIEW: 'INTERNAL_REVIEW',
  CLIENT_REVIEW: 'CLIENT_REVIEW',
  REVISION: 'REVISION',
  APPROVED: 'APPROVED',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  ANALYZED: 'ANALYZED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type SmmContentStatus = (typeof SmmContentStatus)[keyof typeof SmmContentStatus];
export const SMM_CONTENT_STATUSES = Object.values(SmmContentStatus);

export const SMM_CONTENT_STATUS_LABELS = {
  IDEA: 'G‘oya',
  PLANNED: 'Rejalashtirilgan',
  BRIEF: 'Brif',
  SCRIPT_COPY: 'Skript / matn',
  PRODUCTION: 'Ishlab chiqarish',
  INTERNAL_REVIEW: 'Ichki tekshiruv',
  CLIENT_REVIEW: 'Mijoz tekshiruvi',
  REVISION: 'Qayta ishlash',
  APPROVED: 'Tasdiqlangan',
  SCHEDULED: 'Rejalashtirilgan nashr',
  PUBLISHED: 'Nashr etilgan',
  ANALYZED: 'Tahlil qilingan',
  ARCHIVED: 'Arxiv',
} as const satisfies Record<SmmContentStatus, string>;

export const SmmAssignmentStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type SmmAssignmentStatus =
  (typeof SmmAssignmentStatus)[keyof typeof SmmAssignmentStatus];
export const SMM_ASSIGNMENT_STATUSES = Object.values(SmmAssignmentStatus);

export const SMM_ASSIGNMENT_STATUS_LABELS = {
  PENDING: 'Kutilmoqda',
  IN_PROGRESS: 'Jarayonda',
  COMPLETED: 'Yakunlangan',
  CANCELLED: 'Bekor qilingan',
} as const satisfies Record<SmmAssignmentStatus, string>;

export const SmmTaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type SmmTaskStatus = (typeof SmmTaskStatus)[keyof typeof SmmTaskStatus];
export const SMM_TASK_STATUSES = Object.values(SmmTaskStatus);

export const SMM_TASK_STATUS_LABELS = {
  PENDING: 'Kutilmoqda',
  IN_PROGRESS: 'Jarayonda',
  COMPLETED: 'Yakunlangan',
  CANCELLED: 'Bekor qilingan',
} as const satisfies Record<SmmTaskStatus, string>;

export const SmmApprovalDecision = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  REJECTED: 'REJECTED',
} as const;
export type SmmApprovalDecision =
  (typeof SmmApprovalDecision)[keyof typeof SmmApprovalDecision];
export const SMM_APPROVAL_DECISIONS = Object.values(SmmApprovalDecision);

export const SMM_APPROVAL_DECISION_LABELS = {
  PENDING: 'Kutilmoqda',
  APPROVED: 'Tasdiqlangan',
  REVISION_REQUESTED: 'Qayta ishlash so‘raldi',
  REJECTED: 'Rad etilgan',
} as const satisfies Record<SmmApprovalDecision, string>;

export const SmmTemplateScope = {
  PROJECT: 'PROJECT',
  AGENCY: 'AGENCY',
} as const;
export type SmmTemplateScope = (typeof SmmTemplateScope)[keyof typeof SmmTemplateScope];
export const SMM_TEMPLATE_SCOPES = Object.values(SmmTemplateScope);

export const SMM_TEMPLATE_SCOPE_LABELS = {
  PROJECT: 'Loyiha',
  AGENCY: 'Agentlik',
} as const satisfies Record<SmmTemplateScope, string>;

export const SmmBlockKind = {
  HOOK: 'HOOK',
  BODY: 'BODY',
  CTA: 'CTA',
  PROBLEM: 'PROBLEM',
  SOLUTION: 'SOLUTION',
  SOCIAL_PROOF: 'SOCIAL_PROOF',
  VISUAL: 'VISUAL',
  TEXT: 'TEXT',
  PRODUCT: 'PRODUCT',
  HEADLINE: 'HEADLINE',
  CUSTOM: 'CUSTOM',
} as const;
export type SmmBlockKind = (typeof SmmBlockKind)[keyof typeof SmmBlockKind];
export const SMM_BLOCK_KINDS = Object.values(SmmBlockKind);

export const SMM_BLOCK_KIND_LABELS = {
  HOOK: 'Hook',
  BODY: 'Asosiy qism',
  CTA: 'CTA',
  PROBLEM: 'Muammo',
  SOLUTION: 'Yechim',
  SOCIAL_PROOF: 'Ijtimoiy isbot',
  VISUAL: 'Vizual',
  TEXT: 'Matn',
  PRODUCT: 'Mahsulot',
  HEADLINE: 'Sarlavha',
  CUSTOM: 'Maxsus',
} as const satisfies Record<SmmBlockKind, string>;

export const SmmFileKind = {
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
  DESIGN: 'DESIGN',
  SCRIPT: 'SCRIPT',
  REFERENCE: 'REFERENCE',
  OTHER: 'OTHER',
} as const;
export type SmmFileKind = (typeof SmmFileKind)[keyof typeof SmmFileKind];
export const SMM_FILE_KINDS = Object.values(SmmFileKind);

export const SMM_FILE_KIND_LABELS = {
  VIDEO: 'Video',
  IMAGE: 'Rasm',
  DESIGN: 'Dizayn',
  SCRIPT: 'Skript',
  REFERENCE: 'Referens',
  OTHER: 'Boshqa',
} as const satisfies Record<SmmFileKind, string>;

/** Pipeline groups for progress dashboards / kanban columns. */
export const SmmProgressStatusGroup = {
  IDEATION: 'IDEATION',
  PRODUCTION: 'PRODUCTION',
  REVIEW: 'REVIEW',
  READY: 'READY',
  LIVE: 'LIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type SmmProgressStatusGroup =
  (typeof SmmProgressStatusGroup)[keyof typeof SmmProgressStatusGroup];

export const SMM_PROGRESS_STATUS_GROUP_LABELS = {
  IDEATION: 'G‘oya / reja',
  PRODUCTION: 'Ishlab chiqarish',
  REVIEW: 'Tekshiruv',
  READY: 'Tayyor',
  LIVE: 'Nashr',
  ARCHIVED: 'Arxiv',
} as const satisfies Record<SmmProgressStatusGroup, string>;

export const SMM_CONTENT_STATUS_GROUPS: Record<
  SmmProgressStatusGroup,
  readonly SmmContentStatus[]
> = {
  IDEATION: [SmmContentStatus.IDEA, SmmContentStatus.PLANNED, SmmContentStatus.BRIEF],
  PRODUCTION: [SmmContentStatus.SCRIPT_COPY, SmmContentStatus.PRODUCTION],
  REVIEW: [
    SmmContentStatus.INTERNAL_REVIEW,
    SmmContentStatus.CLIENT_REVIEW,
    SmmContentStatus.REVISION,
  ],
  READY: [SmmContentStatus.APPROVED, SmmContentStatus.SCHEDULED],
  LIVE: [SmmContentStatus.PUBLISHED, SmmContentStatus.ANALYZED],
  ARCHIVED: [SmmContentStatus.ARCHIVED],
};

export function smmProgressGroupForStatus(
  status: SmmContentStatus,
): SmmProgressStatusGroup {
  for (const [group, statuses] of Object.entries(SMM_CONTENT_STATUS_GROUPS) as Array<
    [SmmProgressStatusGroup, readonly SmmContentStatus[]]
  >) {
    if (statuses.includes(status)) return group;
  }
  return SmmProgressStatusGroup.IDEATION;
}

/** Product-facing progress KPIs mapped from API `byGroup` + overdue counts. */
export interface SmmProgressKpis {
  planned: number;
  inProgress: number;
  completed: number;
  published: number;
  overdue: number;
}

export const SMM_PROGRESS_KPI_LABELS = {
  planned: 'Rejalashtirilgan',
  inProgress: 'Jarayonda',
  completed: 'Yakunlangan',
  published: 'Nashr etilgan',
  overdue: 'Muddati o‘tgan',
} as const satisfies Record<keyof SmmProgressKpis, string>;

export function mapSmmProgressToKpis(stats: {
  byGroup: Record<SmmProgressStatusGroup, number>;
  overdueAssignments: number;
  overdueTasks: number;
}): SmmProgressKpis {
  return {
    planned: stats.byGroup[SmmProgressStatusGroup.IDEATION] ?? 0,
    inProgress:
      (stats.byGroup[SmmProgressStatusGroup.PRODUCTION] ?? 0) +
      (stats.byGroup[SmmProgressStatusGroup.REVIEW] ?? 0),
    completed: stats.byGroup[SmmProgressStatusGroup.READY] ?? 0,
    published: stats.byGroup[SmmProgressStatusGroup.LIVE] ?? 0,
    overdue: (stats.overdueAssignments ?? 0) + (stats.overdueTasks ?? 0),
  };
}

/**
 * Allowed next statuses from each content status.
 * REVISION can return to script/production/review; ARCHIVED is terminal.
 */
export const SMM_CONTENT_STATUS_TRANSITIONS: Record<
  SmmContentStatus,
  readonly SmmContentStatus[]
> = {
  IDEA: [SmmContentStatus.PLANNED, SmmContentStatus.BRIEF, SmmContentStatus.ARCHIVED],
  PLANNED: [SmmContentStatus.BRIEF, SmmContentStatus.SCRIPT_COPY, SmmContentStatus.ARCHIVED],
  BRIEF: [SmmContentStatus.SCRIPT_COPY, SmmContentStatus.PRODUCTION, SmmContentStatus.ARCHIVED],
  SCRIPT_COPY: [
    SmmContentStatus.PRODUCTION,
    SmmContentStatus.INTERNAL_REVIEW,
    SmmContentStatus.ARCHIVED,
  ],
  PRODUCTION: [
    SmmContentStatus.INTERNAL_REVIEW,
    SmmContentStatus.CLIENT_REVIEW,
    SmmContentStatus.REVISION,
    SmmContentStatus.ARCHIVED,
  ],
  INTERNAL_REVIEW: [
    SmmContentStatus.CLIENT_REVIEW,
    SmmContentStatus.REVISION,
    SmmContentStatus.APPROVED,
    SmmContentStatus.ARCHIVED,
  ],
  CLIENT_REVIEW: [
    SmmContentStatus.REVISION,
    SmmContentStatus.APPROVED,
    SmmContentStatus.ARCHIVED,
  ],
  REVISION: [
    SmmContentStatus.SCRIPT_COPY,
    SmmContentStatus.PRODUCTION,
    SmmContentStatus.INTERNAL_REVIEW,
    SmmContentStatus.CLIENT_REVIEW,
    SmmContentStatus.ARCHIVED,
  ],
  APPROVED: [SmmContentStatus.SCHEDULED, SmmContentStatus.PUBLISHED, SmmContentStatus.ARCHIVED],
  SCHEDULED: [SmmContentStatus.PUBLISHED, SmmContentStatus.APPROVED, SmmContentStatus.ARCHIVED],
  PUBLISHED: [SmmContentStatus.ANALYZED, SmmContentStatus.ARCHIVED],
  ANALYZED: [SmmContentStatus.ARCHIVED],
  ARCHIVED: [],
};

export function canTransitionSmmContentStatus(
  from: SmmContentStatus,
  to: SmmContentStatus,
): boolean {
  if (from === to) return true;
  return SMM_CONTENT_STATUS_TRANSITIONS[from].includes(to);
}

export function isSmmProjectStatus(value: unknown): value is SmmProjectStatus {
  return typeof value === 'string' && (SMM_PROJECT_STATUSES as readonly string[]).includes(value);
}

export function isSmmContentStatus(value: unknown): value is SmmContentStatus {
  return typeof value === 'string' && (SMM_CONTENT_STATUSES as readonly string[]).includes(value);
}

export function isSmmPlatform(value: unknown): value is SmmPlatform {
  return typeof value === 'string' && (SMM_PLATFORMS as readonly string[]).includes(value);
}

export function isSmmContentType(value: unknown): value is SmmContentType {
  return typeof value === 'string' && (SMM_CONTENT_TYPES as readonly string[]).includes(value);
}

/** Agency dashboard period presets (see `/api/smm/dashboard`). */
export const SmmDashboardPeriodPreset = {
  TODAY: 'TODAY',
  THIS_WEEK: 'THIS_WEEK',
  THIS_MONTH: 'THIS_MONTH',
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  CUSTOM: 'CUSTOM',
} as const;
export type SmmDashboardPeriodPreset =
  (typeof SmmDashboardPeriodPreset)[keyof typeof SmmDashboardPeriodPreset];
export const SMM_DASHBOARD_PERIOD_PRESETS = Object.values(SmmDashboardPeriodPreset);

export const SmmFinanceChartPreset = {
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  LAST_3_MONTHS: 'LAST_3_MONTHS',
  LAST_12_MONTHS: 'LAST_12_MONTHS',
} as const;
export type SmmFinanceChartPreset =
  (typeof SmmFinanceChartPreset)[keyof typeof SmmFinanceChartPreset];
export const SMM_FINANCE_CHART_PRESETS = Object.values(SmmFinanceChartPreset);

export const SmmProjectHealth = {
  ON_TRACK: 'ON_TRACK',
  NEEDS_ATTENTION: 'NEEDS_ATTENTION',
  AT_RISK: 'AT_RISK',
} as const;
export type SmmProjectHealth = (typeof SmmProjectHealth)[keyof typeof SmmProjectHealth];

/**
 * Derive project health from real operational signals — not an AI score.
 *
 * Rules (first match wins):
 * - AT_RISK: overdue work AND (deadline ≤7d or content progress <50%)
 * - NEEDS_ATTENTION: overdue, client approval backlog, budget ≥90%, or
 *   deadline ≤14d with content progress <70%
 * - ON_TRACK: otherwise
 */
export function deriveSmmProjectHealth(input: {
  overdueTasks: number;
  overdueAssignments: number;
  contentProgressPct: number;
  pendingClientApprovals: number;
  daysUntilDeadline: number | null;
  budgetPlanned: number | null;
  contentCostTotal: number;
}): SmmProjectHealth {
  const overdue = input.overdueTasks + input.overdueAssignments;
  const deadlineSoon7 =
    input.daysUntilDeadline !== null && input.daysUntilDeadline >= 0 && input.daysUntilDeadline <= 7;
  const deadlineSoon14 =
    input.daysUntilDeadline !== null &&
    input.daysUntilDeadline >= 0 &&
    input.daysUntilDeadline <= 14;
  const deadlinePassed =
    input.daysUntilDeadline !== null && input.daysUntilDeadline < 0;
  const budgetHot =
    input.budgetPlanned !== null &&
    input.budgetPlanned > 0 &&
    input.contentCostTotal / input.budgetPlanned >= 0.9;

  if (
    (overdue > 0 && (deadlineSoon7 || deadlinePassed || input.contentProgressPct < 50)) ||
    (deadlinePassed && input.contentProgressPct < 80)
  ) {
    return SmmProjectHealth.AT_RISK;
  }

  if (
    overdue > 0 ||
    input.pendingClientApprovals > 0 ||
    budgetHot ||
    (deadlineSoon14 && input.contentProgressPct < 70)
  ) {
    return SmmProjectHealth.NEEDS_ATTENTION;
  }

  return SmmProjectHealth.ON_TRACK;
}

// ---------------------------------------------------------------------------
// Commercial / agency contract enums
// ---------------------------------------------------------------------------

export const SmmContractType = {
  RETAINER: 'RETAINER',
  PROJECT: 'PROJECT',
  HYBRID: 'HYBRID',
} as const;
export type SmmContractType = (typeof SmmContractType)[keyof typeof SmmContractType];
export const SMM_CONTRACT_TYPES = Object.values(SmmContractType);

export const SMM_CONTRACT_TYPE_LABELS = {
  RETAINER: 'Retainer',
  PROJECT: 'Loyiha',
  HYBRID: 'Gibrid',
} as const satisfies Record<SmmContractType, string>;

export const SmmPaymentSchedule = {
  MONTHLY: 'MONTHLY',
  FULL_UPFRONT: 'FULL_UPFRONT',
  FIFTY_FIFTY: 'FIFTY_FIFTY',
  CUSTOM: 'CUSTOM',
} as const;
export type SmmPaymentSchedule =
  (typeof SmmPaymentSchedule)[keyof typeof SmmPaymentSchedule];
export const SMM_PAYMENT_SCHEDULES = Object.values(SmmPaymentSchedule);

export const SMM_PAYMENT_SCHEDULE_LABELS = {
  MONTHLY: 'Oylik',
  FULL_UPFRONT: 'To‘liq oldindan',
  FIFTY_FIFTY: '50/50',
  CUSTOM: 'Maxsus',
} as const satisfies Record<SmmPaymentSchedule, string>;

export const SmmBudgetLineCategory = {
  EMPLOYEE: 'EMPLOYEE',
  PRODUCTION: 'PRODUCTION',
  ADVERTISING: 'ADVERTISING',
  TRANSPORT: 'TRANSPORT',
  EQUIPMENT: 'EQUIPMENT',
  OTHER: 'OTHER',
} as const;
export type SmmBudgetLineCategory =
  (typeof SmmBudgetLineCategory)[keyof typeof SmmBudgetLineCategory];
export const SMM_BUDGET_LINE_CATEGORIES = Object.values(SmmBudgetLineCategory);

export const SMM_BUDGET_LINE_CATEGORY_LABELS = {
  EMPLOYEE: 'Xodim',
  PRODUCTION: 'Ishlab chiqarish',
  ADVERTISING: 'Reklama',
  TRANSPORT: 'Transport',
  EQUIPMENT: 'Jihoz',
  OTHER: 'Boshqa',
} as const satisfies Record<SmmBudgetLineCategory, string>;

export const SmmDeliverableMode = {
  TOTAL: 'TOTAL',
  FREQUENCY: 'FREQUENCY',
} as const;
export type SmmDeliverableMode =
  (typeof SmmDeliverableMode)[keyof typeof SmmDeliverableMode];
export const SMM_DELIVERABLE_MODES = Object.values(SmmDeliverableMode);

export const SMM_DELIVERABLE_MODE_LABELS = {
  TOTAL: 'Jami',
  FREQUENCY: 'Chastota',
} as const satisfies Record<SmmDeliverableMode, string>;

export const SmmGoalKind = {
  BRAND_AWARENESS: 'BRAND_AWARENESS',
  REACH: 'REACH',
  FOLLOWERS: 'FOLLOWERS',
  LEADS: 'LEADS',
  SALES: 'SALES',
  ENGAGEMENT: 'ENGAGEMENT',
  TRAFFIC: 'TRAFFIC',
  CONTENT_PRODUCTION: 'CONTENT_PRODUCTION',
  COMMUNITY_GROWTH: 'COMMUNITY_GROWTH',
  CUSTOM: 'CUSTOM',
} as const;
export type SmmGoalKind = (typeof SmmGoalKind)[keyof typeof SmmGoalKind];
export const SMM_GOAL_KINDS = Object.values(SmmGoalKind);

export const SMM_GOAL_KIND_LABELS = {
  BRAND_AWARENESS: 'Brend tanilishi',
  REACH: 'Qamrov',
  FOLLOWERS: 'Obunachilar',
  LEADS: 'Lidlar',
  SALES: 'Sotuvlar',
  ENGAGEMENT: 'Faollik',
  TRAFFIC: 'Trafik',
  CONTENT_PRODUCTION: 'Kontent ishlab chiqarish',
  COMMUNITY_GROWTH: 'Hamjamiyat o‘sishi',
  CUSTOM: 'Maxsus',
} as const satisfies Record<SmmGoalKind, string>;

export const SmmProjectHealthFilter = SmmProjectHealth;
export type SmmProjectHealthFilter = SmmProjectHealth;
export const SMM_PROJECT_HEALTH_VALUES = Object.values(SmmProjectHealth);

export const SMM_PROJECT_HEALTH_LABELS = {
  ON_TRACK: 'Rejada',
  NEEDS_ATTENTION: 'Diqqat kerak',
  AT_RISK: 'Xavf ostida',
} as const satisfies Record<SmmProjectHealth, string>;

export const SmmContractStatusFilter = {
  ACTIVE: 'ACTIVE',
  ENDING_SOON: 'ENDING_SOON',
  EXPIRED: 'EXPIRED',
} as const;
export type SmmContractStatusFilter =
  (typeof SmmContractStatusFilter)[keyof typeof SmmContractStatusFilter];
export const SMM_CONTRACT_STATUS_FILTERS = Object.values(SmmContractStatusFilter);

export const SMM_CONTRACT_STATUS_FILTER_LABELS = {
  ACTIVE: 'Faol',
  ENDING_SOON: 'Tez tugaydi',
  EXPIRED: 'Muddati o‘tgan',
} as const satisfies Record<SmmContractStatusFilter, string>;

export const SmmBudgetStatusFilter = {
  UNDER: 'UNDER',
  NEAR_LIMIT: 'NEAR_LIMIT',
  OVER: 'OVER',
} as const;
export type SmmBudgetStatusFilter =
  (typeof SmmBudgetStatusFilter)[keyof typeof SmmBudgetStatusFilter];
export const SMM_BUDGET_STATUS_FILTERS = Object.values(SmmBudgetStatusFilter);

export const SMM_BUDGET_STATUS_FILTER_LABELS = {
  UNDER: 'Byudjet ichida',
  NEAR_LIMIT: 'Limitga yaqin',
  OVER: 'Ortiqcha',
} as const satisfies Record<SmmBudgetStatusFilter, string>;

export const SmmPaymentStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const;
export type SmmPaymentStatus = (typeof SmmPaymentStatus)[keyof typeof SmmPaymentStatus];
export const SMM_PAYMENT_STATUSES = Object.values(SmmPaymentStatus);

export const SMM_PAYMENT_STATUS_LABELS = {
  PENDING: 'Kutilmoqda',
  PARTIAL: 'Qisman',
  PAID: 'To‘langan',
  OVERDUE: 'Muddati o‘tgan',
} as const satisfies Record<SmmPaymentStatus, string>;

export const SmmFrequencyUnit = {
  day: 'day',
  week: 'week',
  month: 'month',
} as const;
export type SmmFrequencyUnit = (typeof SmmFrequencyUnit)[keyof typeof SmmFrequencyUnit];

export type SmmDeliverableTotals = Partial<
  Record<'REELS' | 'POST' | 'STORY' | 'CAROUSEL' | 'VIDEO', number>
>;

export type SmmDeliverableFrequency = Partial<
  Record<
    'REELS' | 'POST' | 'STORY' | 'CAROUSEL' | 'VIDEO',
    { count: number; unit: SmmFrequencyUnit }
  >
>;

export type SmmExpectedResults = {
  reach?: number | null;
  leads?: number | null;
  followers?: number | null;
  engagement?: number | null;
  sales?: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inclusive calendar-day span between two dates (UTC midnight truncation). */
export function inclusiveDaySpan(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (endUtc < startUtc) return 0;
  return Math.round((endUtc - startUtc) / DAY_MS) + 1;
}

/**
 * Whole remaining calendar days until `end` from `now`.
 * Negative when the end date has already passed. Null when end is missing.
 */
export function remainingDays(end: Date | null | undefined, now: Date = new Date()): number | null {
  if (!end) return null;
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((endUtc - nowUtc) / DAY_MS);
}

/**
 * Expand frequency specs into total deliverable counts across [start, end].
 * Does not invent content — only arithmetic totals for calendar generation.
 */
export function computeExpectedTotalsFromFrequency(
  frequency: SmmDeliverableFrequency | null | undefined,
  start: Date,
  end: Date,
): SmmDeliverableTotals {
  if (!frequency) return {};
  const days = inclusiveDaySpan(start, end);
  if (days <= 0) return {};

  const weeks = Math.max(1, Math.ceil(days / 7));
  const months = Math.max(1, Math.ceil(days / 30));
  const result: SmmDeliverableTotals = {};

  for (const [rawType, spec] of Object.entries(frequency)) {
    if (!spec || typeof spec.count !== 'number' || spec.count <= 0) continue;
    const type = rawType as keyof SmmDeliverableTotals;
    let total = 0;
    if (spec.unit === 'day') total = Math.round(spec.count * days);
    else if (spec.unit === 'week') total = Math.round(spec.count * weeks);
    else if (spec.unit === 'month') total = Math.round(spec.count * months);
    if (total > 0) result[type] = total;
  }

  return result;
}

/** Alias used by calendar / wizard code paths. */
export const computeDeliverableTotalsFromFrequency = computeExpectedTotalsFromFrequency;

/** Alias for contract remaining-day displays. */
export const contractRemainingDays = remainingDays;

export function deriveSmmContractStatus(
  remaining: number | null,
  endingSoonDays = 14,
): SmmContractStatusFilter | null {
  if (remaining === null) return SmmContractStatusFilter.ACTIVE;
  if (remaining < 0) return SmmContractStatusFilter.EXPIRED;
  if (remaining <= endingSoonDays) return SmmContractStatusFilter.ENDING_SOON;
  return SmmContractStatusFilter.ACTIVE;
}

export function deriveSmmBudgetStatus(
  planned: number | null,
  spent: number,
): SmmBudgetStatusFilter | null {
  if (planned === null || planned <= 0) return null;
  const ratio = spent / planned;
  if (ratio >= 1) return SmmBudgetStatusFilter.OVER;
  if (ratio >= 0.8) return SmmBudgetStatusFilter.NEAR_LIMIT;
  return SmmBudgetStatusFilter.UNDER;
}
