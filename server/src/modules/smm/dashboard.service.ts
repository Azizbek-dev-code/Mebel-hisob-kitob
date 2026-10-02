import {
  DashboardGranularity,
  DateRangePreset,
  SmmApprovalDecision,
  SmmAssignmentStatus,
  SmmContentStatus,
  SmmContentType,
  SmmDashboardPeriodPreset,
  SmmFinanceChartPreset,
  SmmProjectMemberRole,
  SmmProjectStatus,
  SmmTaskStatus,
  deriveSmmProjectHealth,
  smmProgressGroupForStatus,
  SmmProgressStatusGroup,
  type SmmAgencyDashboard,
  type SmmDashboardActivityItem,
  type SmmDashboardApprovalItem,
  type SmmDashboardAttentionItem,
  type SmmDashboardContentPipelineBucket,
  type SmmDashboardFinance,
  type SmmDashboardFinancePoint,
  type SmmDashboardPeriodMeta,
  type SmmDashboardProjectCard,
  type SmmDashboardTeam,
  type SmmDashboardTeamMemberLoad,
  type SmmDashboardTodayItem,
  type SmmDashboardWeeklyDay,
  type SmmProjectHealth,
} from '@furniture-erp/shared';
import { ExpenseStatus, type Prisma } from '@prisma/client';

import {
  addZonedDays,
  buildRangeBuckets,
  instantFromZoned,
  resolveDashboardRange,
  startOfZonedDay,
  startOfZonedWeek,
  zonedParts,
  type ResolvedDateRange,
} from '../../lib/date-range.js';
import { fromDbMoney, fromDbMoneySum } from '../../lib/money-mapper.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/api-error.js';

import { userSelect } from './smm.access.js';
import {
  CLIENT_VISIBLE_CONTENT_STATUSES,
  isStoreSmmAdmin,
} from './smm.permissions.js';

const READY_OR_LIVE_STATUSES: readonly SmmContentStatus[] = [
  SmmContentStatus.APPROVED,
  SmmContentStatus.SCHEDULED,
  SmmContentStatus.PUBLISHED,
  SmmContentStatus.ANALYZED,
];

const OPEN_TASK_STATUSES = [SmmTaskStatus.PENDING, SmmTaskStatus.IN_PROGRESS] as const;
const OPEN_ASSIGNMENT_STATUSES = [
  SmmAssignmentStatus.PENDING,
  SmmAssignmentStatus.IN_PROGRESS,
] as const;

const MANAGER_ROLES = new Set<string>([
  SmmProjectMemberRole.OWNER,
  SmmProjectMemberRole.MANAGER,
  SmmProjectMemberRole.PROJECT_MANAGER,
]);

const WEEKDAY_LABELS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'] as const;

function addZonedCalendarMonths(instant: Date, timeZone: string, months: number): Date {
  const { year, month, day } = zonedParts(instant, timeZone);
  return instantFromZoned({ year, month: month + months, day }, timeZone);
}

export type AgencyDashboardOptions = {
  storeId: string;
  userId: string;
  userRole: string;
  preset?: SmmDashboardPeriodPreset;
  from?: string;
  to?: string;
  financePreset?: SmmFinanceChartPreset;
  now?: Date;
};

export type ResolvedSmmDashboardRange = {
  preset: SmmDashboardPeriodPreset;
  /** Inclusive start instant. */
  from: Date;
  /** Exclusive end instant. */
  to: Date;
  label: string;
  timeZone: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `YYYY-MM-DD` in the given IANA zone. */
export function zonedYmd(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function mapPeriodPresetToDateRange(
  preset: SmmDashboardPeriodPreset,
): DateRangePreset | null {
  switch (preset) {
    case SmmDashboardPeriodPreset.TODAY:
      return DateRangePreset.TODAY;
    case SmmDashboardPeriodPreset.THIS_WEEK:
      return DateRangePreset.THIS_WEEK;
    case SmmDashboardPeriodPreset.THIS_MONTH:
      return DateRangePreset.THIS_MONTH;
    case SmmDashboardPeriodPreset.CUSTOM:
      return DateRangePreset.CUSTOM;
    default:
      return null;
  }
}

/**
 * Resolves the agency dashboard KPI period in the store timezone.
 * Half-open `[from, to)` — `to` is exclusive.
 */
export function resolveSmmDashboardRange(
  preset: SmmDashboardPeriodPreset,
  custom: { from?: string; to?: string },
  timeZone: string,
  now: Date = new Date(),
): ResolvedSmmDashboardRange {
  const mapped = mapPeriodPresetToDateRange(preset);
  if (mapped) {
    const range = resolveDashboardRange(mapped, custom, timeZone, now);
    return {
      preset,
      from: range.from,
      to: range.to,
      label: range.label,
      timeZone,
    };
  }

  const todayStart = startOfZonedDay(now, timeZone);
  const to = addZonedDays(todayStart, timeZone, 1);
  const from =
    preset === SmmDashboardPeriodPreset.LAST_7_DAYS
      ? addZonedDays(todayStart, timeZone, -6)
      : addZonedDays(todayStart, timeZone, -29);

  const asCustom = resolveDashboardRange(
    DateRangePreset.CUSTOM,
    { from: zonedYmd(from, timeZone), to: zonedYmd(new Date(to.getTime() - 1), timeZone) },
    timeZone,
    now,
  );

  return {
    preset,
    from,
    to,
    label: asCustom.label,
    timeZone,
  };
}

export function resolveSmmFinanceRange(
  preset: SmmFinanceChartPreset,
  timeZone: string,
  now: Date = new Date(),
): ResolvedDateRange {
  const todayStart = startOfZonedDay(now, timeZone);
  const to = addZonedDays(todayStart, timeZone, 1);

  switch (preset) {
    case SmmFinanceChartPreset.LAST_7_DAYS: {
      const from = addZonedDays(todayStart, timeZone, -6);
      return {
        preset: DateRangePreset.CUSTOM,
        from,
        to,
        granularity: DashboardGranularity.DAY,
        timeZone,
        label: resolveDashboardRange(
          DateRangePreset.CUSTOM,
          { from: zonedYmd(from, timeZone), to: zonedYmd(new Date(to.getTime() - 1), timeZone) },
          timeZone,
          now,
        ).label,
      };
    }
    case SmmFinanceChartPreset.LAST_30_DAYS: {
      const from = addZonedDays(todayStart, timeZone, -29);
      return {
        preset: DateRangePreset.CUSTOM,
        from,
        to,
        granularity: DashboardGranularity.DAY,
        timeZone,
        label: resolveDashboardRange(
          DateRangePreset.CUSTOM,
          { from: zonedYmd(from, timeZone), to: zonedYmd(new Date(to.getTime() - 1), timeZone) },
          timeZone,
          now,
        ).label,
      };
    }
    case SmmFinanceChartPreset.LAST_3_MONTHS: {
      const from = startOfZonedDay(addZonedCalendarMonths(todayStart, timeZone, -3), timeZone);
      return {
        preset: DateRangePreset.CUSTOM,
        from,
        to,
        granularity: DashboardGranularity.MONTH,
        timeZone,
        label: resolveDashboardRange(
          DateRangePreset.CUSTOM,
          { from: zonedYmd(from, timeZone), to: zonedYmd(new Date(to.getTime() - 1), timeZone) },
          timeZone,
          now,
        ).label,
      };
    }
    case SmmFinanceChartPreset.LAST_12_MONTHS: {
      const from = startOfZonedDay(addZonedCalendarMonths(todayStart, timeZone, -12), timeZone);
      return {
        preset: DateRangePreset.CUSTOM,
        from,
        to,
        granularity: DashboardGranularity.MONTH,
        timeZone,
        label: resolveDashboardRange(
          DateRangePreset.CUSTOM,
          { from: zonedYmd(from, timeZone), to: zonedYmd(new Date(to.getTime() - 1), timeZone) },
          timeZone,
          now,
        ).label,
      };
    }
    default: {
      const from = addZonedDays(todayStart, timeZone, -29);
      return {
        preset: DateRangePreset.CUSTOM,
        from,
        to,
        granularity: DashboardGranularity.DAY,
        timeZone,
        label: resolveDashboardRange(
          DateRangePreset.CUSTOM,
          { from: zonedYmd(from, timeZone), to: zonedYmd(new Date(to.getTime() - 1), timeZone) },
          timeZone,
          now,
        ).label,
      };
    }
  }
}

function toPeriodMeta(range: ResolvedSmmDashboardRange): SmmDashboardPeriodMeta {
  return {
    preset: range.preset,
    from: zonedYmd(range.from, range.timeZone),
    to: zonedYmd(new Date(range.to.getTime() - 1), range.timeZone),
    label: range.label,
    timeZone: range.timeZone,
  };
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function daysUntilDeadline(
  endDate: Date | null,
  todayStart: Date,
  timeZone: string,
): number | null {
  if (!endDate) return null;
  const endDay = startOfZonedDay(endDate, timeZone);
  return Math.round((endDay.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
}

function isTodayWorkItem(input: {
  status: string;
  deadline: Date | null;
  todayStart: Date;
  tomorrowStart: Date;
}): boolean {
  const { status, deadline, todayStart, tomorrowStart } = input;
  if (deadline) {
    if (deadline < tomorrowStart) return true; // today or overdue
  }
  if (status === SmmTaskStatus.IN_PROGRESS || status === SmmAssignmentStatus.IN_PROGRESS) {
    if (!deadline) return true;
    if (deadline >= todayStart && deadline < tomorrowStart) return true;
  }
  return false;
}

function todayPriority(
  isOverdue: boolean,
  deadline: Date | null,
  todayStart: Date,
  tomorrowStart: Date,
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (isOverdue) return 'HIGH';
  if (deadline && deadline >= todayStart && deadline < tomorrowStart) return 'MEDIUM';
  return 'LOW';
}

function pickManagerName(
  members: Array<{ role: string; user: { fullName: string } }>,
): string | null {
  const owner = members.find((m) => m.role === SmmProjectMemberRole.OWNER);
  if (owner) return owner.user.fullName;
  const manager = members.find((m) => MANAGER_ROLES.has(m.role));
  return manager?.user.fullName ?? null;
}

function contentProgressPctFromCounts(
  byStatus: Map<string, number>,
): number {
  let total = 0;
  let readyLive = 0;
  for (const [status, count] of byStatus) {
    if (status === SmmContentStatus.ARCHIVED) continue;
    total += count;
    const group = smmProgressGroupForStatus(status as SmmContentStatus);
    if (
      group === SmmProgressStatusGroup.READY ||
      group === SmmProgressStatusGroup.LIVE
    ) {
      readyLive += count;
    }
  }
  return pct(readyLive, total);
}

export async function getAgencyDashboard(
  options: AgencyDashboardOptions,
): Promise<SmmAgencyDashboard> {
  const {
    storeId,
    userId,
    userRole,
    preset = SmmDashboardPeriodPreset.THIS_MONTH,
    from: customFrom,
    to: customTo,
    financePreset = SmmFinanceChartPreset.LAST_30_DAYS,
    now = new Date(),
  } = options;

  const store = await prisma.store.findFirst({
    where: { id: storeId },
    select: { timezone: true },
  });
  if (!store) throw ApiError.notFound('Store not found');

  const timeZone = store.timezone;
  const isAdmin = isStoreSmmAdmin(userRole);
  const periodRange = resolveSmmDashboardRange(
    preset,
    { from: customFrom, to: customTo },
    timeZone,
    now,
  );
  const periodMeta = toPeriodMeta(periodRange);

  const todayStart = startOfZonedDay(now, timeZone);
  const tomorrowStart = addZonedDays(todayStart, timeZone, 1);
  const weekStart = startOfZonedWeek(now, timeZone);
  const weekEnd = addZonedDays(weekStart, timeZone, 7);
  const deadlineSoonEnd = addZonedDays(todayStart, timeZone, 15);
  const completedRecentlySince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const projectWhere: Prisma.SmmProjectWhereInput = { storeId };
  if (!isAdmin) {
    projectWhere.members = { some: { userId, isActive: true } };
  }

  const accessibleProjects = await prisma.smmProject.findMany({
    where: projectWhere,
    select: {
      id: true,
      name: true,
      clientName: true,
      status: true,
      budgetPlanned: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      members: {
        where: { isActive: true },
        select: {
          userId: true,
          role: true,
          user: { select: userSelect },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const projectIds = accessibleProjects.map((p) => p.id);
  const projectById = new Map(accessibleProjects.map((p) => [p.id, p]));

  const myRoles = accessibleProjects.flatMap((p) =>
    p.members.filter((m) => m.userId === userId).map((m) => m.role),
  );
  const isClientView =
    !isAdmin && (myRoles.length === 0 || myRoles.every((r) => r === SmmProjectMemberRole.CLIENT));

  const emptyDashboard = (): SmmAgencyDashboard => ({
    period: periodMeta,
    isClientView,
    kpis: {
      activeProjects: 0,
      activeProjectsOpenedInPeriod: 0,
      todayWorkCount: 0,
      todayOverdueCount: 0,
      weekContentPlanned: 0,
      weekContentReadyPct: 0,
      revenue: 0,
      expenses: 0,
      profit: 0,
      contentCosts: 0,
    },
    todayWork: [],
    attention: [],
    projects: [],
    finance: isClientView ? null : { preset: financePreset, revenue: 0, expenses: 0, profit: 0, points: [] },
    team: isClientView ? null : { employeeCount: 0, working: 0, pending: 0, completedRecently: 0, members: [] },
    contentPipeline: [],
    weeklyContent: buildEmptyWeeklyContent(weekStart, timeZone, todayStart),
    clientApprovals: [],
    recentActivity: [],
  });

  if (projectIds.length === 0) {
    const expensesOnly = isClientView
      ? 0
      : fromDbMoneySum(
          (
            await prisma.expense.aggregate({
              where: {
                storeId,
                status: ExpenseStatus.ACTIVE,
                expenseDate: { gte: periodRange.from, lt: periodRange.to },
              },
              _sum: { amount: true },
            })
          )._sum.amount,
        );
    const base = emptyDashboard();
    if (!isClientView && base.finance) {
      const financeRange = resolveSmmFinanceRange(financePreset, timeZone, now);
      const financeExpenses = fromDbMoneySum(
        (
          await prisma.expense.aggregate({
            where: {
              storeId,
              status: ExpenseStatus.ACTIVE,
              expenseDate: { gte: financeRange.from, lt: financeRange.to },
            },
            _sum: { amount: true },
          })
        )._sum.amount,
      );
      const expenseRows = await prisma.expense.findMany({
        where: {
          storeId,
          status: ExpenseStatus.ACTIVE,
          expenseDate: { gte: financeRange.from, lt: financeRange.to },
        },
        select: { expenseDate: true, amount: true },
      });
      base.kpis.expenses = expensesOnly;
      base.kpis.profit = -expensesOnly;
      base.finance = buildFinanceBlock(financePreset, financeRange, [], expenseRows, financeExpenses);
    } else {
      base.kpis.expenses = expensesOnly;
      base.kpis.profit = -expensesOnly;
    }
    return base;
  }

  const contentStatusFilter: Prisma.SmmContentItemWhereInput = isClientView
    ? { status: { in: [...CLIENT_VISIBLE_CONTENT_STATUSES] } }
    : {};

  const financeRange = isClientView
    ? null
    : resolveSmmFinanceRange(financePreset, timeZone, now);

  const [
    openTasks,
    openAssignments,
    weekContentRows,
    expenseAgg,
    contentCostAgg,
    contentStatusGroups,
    pendingApprovals,
    internalReviewCount,
    recentActivities,
    allContentForProjects,
    allTasksForProjects,
    allCostsForProjects,
    teamAssignments,
    teamTasks,
    recentlyCompletedTasks,
    financeExpenseRows,
    financeExpenseAgg,
  ] = await Promise.all([
    prisma.smmContentTask.findMany({
      where: {
        projectId: { in: projectIds },
        status: { in: [...OPEN_TASK_STATUSES] },
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        status: true,
        deadline: true,
        user: { select: userSelect },
      },
    }),
    prisma.smmContentAssignment.findMany({
      where: {
        contentItem: { projectId: { in: projectIds }, archivedAt: null },
        status: { in: [...OPEN_ASSIGNMENT_STATUSES] },
      },
      select: {
        id: true,
        role: true,
        status: true,
        deadline: true,
        estimatedMinutes: true,
        userId: true,
        user: { select: userSelect },
        contentItem: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
    }),
    prisma.smmContentItem.findMany({
      where: {
        projectId: { in: projectIds },
        archivedAt: null,
        ...contentStatusFilter,
        OR: [
          { publishAt: { gte: weekStart, lt: weekEnd } },
          {
            publishAt: null,
            createdAt: { gte: weekStart, lt: weekEnd },
          },
        ],
      },
      select: { id: true, status: true, publishAt: true, createdAt: true, contentType: true },
    }),
    prisma.expense.aggregate({
      where: {
        storeId,
        status: ExpenseStatus.ACTIVE,
        expenseDate: { gte: periodRange.from, lt: periodRange.to },
      },
      _sum: { amount: true },
    }),
    isClientView
      ? Promise.resolve({ _sum: { amount: null as bigint | null } })
      : prisma.smmContentCost.aggregate({
          where: {
            projectId: { in: projectIds },
            costDate: { gte: periodRange.from, lt: periodRange.to },
          },
          _sum: { amount: true },
        }),
    prisma.smmContentItem.groupBy({
      by: ['status'],
      where: {
        projectId: { in: projectIds },
        archivedAt: null,
        ...contentStatusFilter,
      },
      _count: { _all: true },
    }),
    prisma.smmContentApproval.findMany({
      where: {
        decision: SmmApprovalDecision.PENDING,
        contentItem: {
          projectId: { in: projectIds },
          archivedAt: null,
          ...(isClientView
            ? { status: { in: [...CLIENT_VISIBLE_CONTENT_STATUSES] } }
            : {}),
        },
      },
      select: {
        id: true,
        createdAt: true,
        contentItem: {
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
            assignments: {
              where: { status: { in: [...OPEN_ASSIGNMENT_STATUSES] } },
              select: { user: { select: userSelect } },
              take: 1,
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
    prisma.smmContentItem.count({
      where: {
        projectId: { in: projectIds },
        archivedAt: null,
        status: SmmContentStatus.INTERNAL_REVIEW,
      },
    }),
    prisma.smmActivity.findMany({
      where: {
        projectId: { in: projectIds },
        ...(isClientView
          ? {
              OR: [
                { eventType: { contains: 'APPROVAL' } },
                { eventType: { contains: 'STATUS' } },
              ],
            }
          : {}),
      },
      include: {
        actor: { select: userSelect },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.smmContentItem.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds }, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.smmContentTask.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    isClientView
      ? Promise.resolve(
          [] as Array<{ projectId: string; _sum: { amount: bigint | null } }>,
        )
      : prisma.smmContentCost.groupBy({
          by: ['projectId'],
          where: { projectId: { in: projectIds } },
          _sum: { amount: true },
        }),
    isClientView
      ? Promise.resolve(
          [] as Array<{
            userId: string;
            status: string;
            estimatedMinutes: number | null;
            user: { id: string; fullName: string };
          }>,
        )
      : prisma.smmContentAssignment.findMany({
          where: {
            contentItem: { projectId: { in: projectIds }, archivedAt: null },
            status: { in: [...OPEN_ASSIGNMENT_STATUSES] },
          },
          select: {
            userId: true,
            status: true,
            estimatedMinutes: true,
            user: { select: userSelect },
          },
        }),
    isClientView
      ? Promise.resolve(
          [] as Array<{
            userId: string;
            status: string;
            user: { id: string; fullName: string };
          }>,
        )
      : prisma.smmContentTask.findMany({
          where: {
            projectId: { in: projectIds },
            status: { in: [...OPEN_TASK_STATUSES] },
          },
          select: {
            userId: true,
            status: true,
            user: { select: userSelect },
          },
        }),
    isClientView
      ? Promise.resolve([] as Array<{ userId: string }>)
      : prisma.smmContentTask.findMany({
          where: {
            projectId: { in: projectIds },
            status: SmmTaskStatus.COMPLETED,
            completedAt: { gte: completedRecentlySince },
          },
          select: { userId: true },
        }),
    !financeRange
      ? Promise.resolve([] as Array<{ expenseDate: Date; amount: bigint }>)
      : prisma.expense.findMany({
          where: {
            storeId,
            status: ExpenseStatus.ACTIVE,
            expenseDate: { gte: financeRange.from, lt: financeRange.to },
          },
          select: { expenseDate: true, amount: true },
        }),
    !financeRange
      ? Promise.resolve({ _sum: { amount: null as bigint | null } })
      : prisma.expense.aggregate({
          where: {
            storeId,
            status: ExpenseStatus.ACTIVE,
            expenseDate: { gte: financeRange.from, lt: financeRange.to },
          },
          _sum: { amount: true },
        }),
  ]);
  // --- KPIs ---
  const activeProjects = accessibleProjects.filter((p) => p.status === SmmProjectStatus.ACTIVE);
  const activeProjectsOpenedInPeriod = activeProjects.filter(
    (p) => p.createdAt >= periodRange.from && p.createdAt < periodRange.to,
  ).length;

  const todayWorkItems: SmmDashboardTodayItem[] = [];
  for (const task of openTasks) {
    if (
      !isTodayWorkItem({
        status: task.status,
        deadline: task.deadline,
        todayStart,
        tomorrowStart,
      })
    ) {
      continue;
    }
    const project = projectById.get(task.projectId);
    if (!project) continue;
    const isOverdue = !!task.deadline && task.deadline < todayStart;
    todayWorkItems.push({
      id: task.id,
      kind: 'TASK',
      title: task.title,
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      assigneeName: task.user.fullName,
      status: task.status,
      priority: todayPriority(isOverdue, task.deadline, todayStart, tomorrowStart),
      deadline: task.deadline ? task.deadline.toISOString() : null,
      isOverdue,
      href: `/smm/projects/${project.id}/tasks`,
    });
  }
  for (const assignment of openAssignments) {
    if (
      !isTodayWorkItem({
        status: assignment.status,
        deadline: assignment.deadline,
        todayStart,
        tomorrowStart,
      })
    ) {
      continue;
    }
    const project = projectById.get(assignment.contentItem.projectId);
    if (!project) continue;
    const isOverdue = !!assignment.deadline && assignment.deadline < todayStart;
    todayWorkItems.push({
      id: assignment.id,
      kind: 'ASSIGNMENT',
      title: assignment.contentItem.title || assignment.role,
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      assigneeName: assignment.user.fullName,
      status: assignment.status,
      priority: todayPriority(isOverdue, assignment.deadline, todayStart, tomorrowStart),
      deadline: assignment.deadline ? assignment.deadline.toISOString() : null,
      isOverdue,
      href: `/smm/projects/${project.id}/content/${assignment.contentItem.id}`,
    });
  }

  todayWorkItems.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    const pri = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    if (pri[a.priority] !== pri[b.priority]) return pri[a.priority] - pri[b.priority];
    const aDl = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
    const bDl = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
    if (aDl !== bDl) return aDl - bDl;
    return a.title.localeCompare(b.title);
  });

  const todayWork = todayWorkItems.slice(0, 15);
  const todayOverdueCount = todayWorkItems.filter((i) => i.isOverdue).length;

  const weekContentPlanned = weekContentRows.length;
  const weekContentReady = weekContentRows.filter((r) =>
    READY_OR_LIVE_STATUSES.includes(r.status as SmmContentStatus),
  ).length;

  let revenue = 0;
  for (const project of accessibleProjects) {
    const bookedAt = project.startDate ?? project.createdAt;
    if (bookedAt >= periodRange.from && bookedAt < periodRange.to) {
      revenue += fromDbMoney(project.budgetPlanned);
    }
  }

  const expenses = fromDbMoneySum(expenseAgg._sum.amount);
  const contentCosts = isClientView ? 0 : fromDbMoneySum(contentCostAgg._sum.amount);
  const profit = revenue - expenses;

  // --- Attention ---
  const overdueTaskCount = openTasks.filter((t) => t.deadline && t.deadline < todayStart).length;
  const overdueAssignmentCount = openAssignments.filter(
    (a) => a.deadline && a.deadline < todayStart,
  ).length;
  const overdueTotal = overdueTaskCount + overdueAssignmentCount;

  const clientApprovalCount = pendingApprovals.filter(
    (a) =>
      a.contentItem.status === SmmContentStatus.CLIENT_REVIEW ||
      CLIENT_VISIBLE_CONTENT_STATUSES.includes(a.contentItem.status as SmmContentStatus),
  ).length;

  const deadlineSoonCount = activeProjects.filter((p) => {
    if (!p.endDate) return false;
    return p.endDate >= todayStart && p.endDate < deadlineSoonEnd;
  }).length;

  const costByProject = new Map(
    allCostsForProjects.map((row) => [row.projectId, fromDbMoneySum(row._sum.amount)]),
  );

  let budgetHotCount = 0;
  if (!isClientView) {
    for (const project of activeProjects) {
      const planned = fromDbMoney(project.budgetPlanned);
      if (planned <= 0) continue;
      const spent = costByProject.get(project.id) ?? 0;
      if (spent / planned >= 0.9) budgetHotCount += 1;
    }
  }

  const attention: SmmDashboardAttentionItem[] = [];
  if (overdueTotal > 0) {
    attention.push({
      kind: 'OVERDUE_TASKS',
      severity: 'critical',
      count: overdueTotal,
      label: `${overdueTotal} muddati o‘tgan topshiriq`,
      href: '/smm/projects',
    });
  }
  if (clientApprovalCount > 0) {
    attention.push({
      kind: 'CLIENT_APPROVAL',
      severity: 'warning',
      count: clientApprovalCount,
      label: `${clientApprovalCount} mijoz tasdiqlashi kutilmoqda`,
      href: '/smm/projects',
    });
  }
  if (deadlineSoonCount > 0) {
    attention.push({
      kind: 'DEADLINE',
      severity: 'warning',
      count: deadlineSoonCount,
      label: `${deadlineSoonCount} loyiha muddati yaqin`,
      href: '/smm/projects',
    });
  }
  if (budgetHotCount > 0) {
    attention.push({
      kind: 'BUDGET',
      severity: 'critical',
      count: budgetHotCount,
      label: `${budgetHotCount} loyiha byudjetining 90%+ sarflangan`,
      href: '/smm/projects',
    });
  }
  if (!isClientView && internalReviewCount > 0) {
    attention.push({
      kind: 'INTERNAL_REVIEW',
      severity: 'info',
      count: internalReviewCount,
      label: `${internalReviewCount} ichki tekshiruvdagi kontent`,
      href: '/smm/projects',
    });
  }

  // --- Project cards ---
  const contentByProject = new Map<string, Map<string, number>>();
  for (const row of allContentForProjects) {
    let map = contentByProject.get(row.projectId);
    if (!map) {
      map = new Map();
      contentByProject.set(row.projectId, map);
    }
    map.set(row.status, row._count._all);
  }

  const tasksByProject = new Map<
    string,
    { completed: number; total: number; overdue: number }
  >();
  for (const row of allTasksForProjects) {
    let entry = tasksByProject.get(row.projectId);
    if (!entry) {
      entry = { completed: 0, total: 0, overdue: 0 };
      tasksByProject.set(row.projectId, entry);
    }
    if (row.status !== SmmTaskStatus.CANCELLED) {
      entry.total += row._count._all;
    }
    if (row.status === SmmTaskStatus.COMPLETED) {
      entry.completed += row._count._all;
    }
  }
  for (const task of openTasks) {
    if (task.deadline && task.deadline < todayStart) {
      const entry = tasksByProject.get(task.projectId);
      if (entry) entry.overdue += 1;
      else tasksByProject.set(task.projectId, { completed: 0, total: 0, overdue: 1 });
    }
  }

  const overdueAssignmentsByProject = new Map<string, number>();
  for (const a of openAssignments) {
    if (a.deadline && a.deadline < todayStart) {
      const pid = a.contentItem.projectId;
      overdueAssignmentsByProject.set(pid, (overdueAssignmentsByProject.get(pid) ?? 0) + 1);
    }
  }

  const pendingClientByProject = new Map<string, number>();
  for (const a of pendingApprovals) {
    if (
      a.contentItem.status === SmmContentStatus.CLIENT_REVIEW ||
      CLIENT_VISIBLE_CONTENT_STATUSES.includes(a.contentItem.status as SmmContentStatus)
    ) {
      const pid = a.contentItem.projectId;
      pendingClientByProject.set(pid, (pendingClientByProject.get(pid) ?? 0) + 1);
    }
  }

  const internalReviewByProject = new Map<string, number>();
  for (const row of allContentForProjects) {
    if (row.status === SmmContentStatus.INTERNAL_REVIEW) {
      internalReviewByProject.set(row.projectId, row._count._all);
    }
  }

  const projectCards: SmmDashboardProjectCard[] = activeProjects.slice(0, 8).map((project) => {
    const statusMap = contentByProject.get(project.id) ?? new Map();
    const contentProgress = contentProgressPctFromCounts(statusMap);
    const taskStats = tasksByProject.get(project.id) ?? {
      completed: 0,
      total: 0,
      overdue: 0,
    };
    const overdueAssignments = overdueAssignmentsByProject.get(project.id) ?? 0;
    const pendingClientApprovals = pendingClientByProject.get(project.id) ?? 0;
    const pendingInternalReviews = internalReviewByProject.get(project.id) ?? 0;
    const budgetPlanned =
      project.budgetPlanned === null || project.budgetPlanned === undefined
        ? null
        : fromDbMoney(project.budgetPlanned);
    const contentCostTotal = costByProject.get(project.id) ?? 0;
    const daysLeft = daysUntilDeadline(project.endDate, todayStart, timeZone);

    const health: SmmProjectHealth = deriveSmmProjectHealth({
      overdueTasks: taskStats.overdue,
      overdueAssignments,
      contentProgressPct: contentProgress,
      pendingClientApprovals,
      daysUntilDeadline: daysLeft,
      budgetPlanned: isClientView ? null : budgetPlanned,
      contentCostTotal: isClientView ? 0 : contentCostTotal,
    });

    return {
      id: project.id,
      name: project.name,
      clientName: project.clientName,
      status: project.status as SmmProjectStatus,
      contentProgressPct: contentProgress,
      taskProgressPct: pct(taskStats.completed, taskStats.total),
      deadline: project.endDate ? project.endDate.toISOString() : null,
      teamCount: project.members.length,
      managerName: pickManagerName(project.members),
      health,
      overdueTasks: taskStats.overdue + overdueAssignments,
      pendingClientApprovals,
      pendingInternalReviews,
      budgetPlanned: isClientView ? null : budgetPlanned,
      contentCostTotal: isClientView ? 0 : contentCostTotal,
    };
  });

  // --- Finance ---
  let finance: SmmDashboardFinance | null = null;
  if (!isClientView && financeRange) {
    const bookedProjects = accessibleProjects
      .filter((p) => {
        const bookedAt = p.startDate ?? p.createdAt;
        return bookedAt >= financeRange.from && bookedAt < financeRange.to;
      })
      .map((p) => ({
        bookedAt: p.startDate ?? p.createdAt,
        amount: fromDbMoney(p.budgetPlanned),
      }));
    const financeExpensesTotal = fromDbMoneySum(financeExpenseAgg._sum.amount);
    finance = buildFinanceBlock(
      financePreset,
      financeRange,
      bookedProjects,
      financeExpenseRows,
      financeExpensesTotal,
    );
  }

  // --- Team ---
  let team: SmmDashboardTeam | null = null;
  if (!isClientView) {
    team = buildTeamBlock({
      projects: accessibleProjects,
      assignments: teamAssignments,
      tasks: teamTasks,
      recentlyCompletedUserIds: recentlyCompletedTasks.map((t) => t.userId),
    });
  }

  // --- Content pipeline ---
  const contentPipeline: SmmDashboardContentPipelineBucket[] = contentStatusGroups.map((row) => ({
    status: row.status as SmmContentStatus,
    count: row._count._all,
  }));

  // --- Weekly content ---
  const weeklyContent = buildWeeklyContent(weekStart, timeZone, todayStart, weekContentRows);

  // --- Client approvals ---
  const clientApprovals: SmmDashboardApprovalItem[] = pendingApprovals.slice(0, 8).map((a) => {
    const project = projectById.get(a.contentItem.projectId)!;
    const waitingHours = Math.max(
      0,
      Math.round((now.getTime() - a.createdAt.getTime()) / (60 * 60 * 1000)),
    );
    const assignee = a.contentItem.assignments[0]?.user.fullName ?? null;
    const responsibleName = assignee ?? pickManagerName(project.members);
    return {
      approvalId: a.id,
      contentItemId: a.contentItem.id,
      contentTitle: a.contentItem.title,
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      submittedAt: a.createdAt.toISOString(),
      waitingHours,
      responsibleName,
      href: `/smm/projects/${project.id}/content/${a.contentItem.id}`,
    };
  });

  // --- Recent activity ---
  const recentActivity: SmmDashboardActivityItem[] = recentActivities.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    projectName: row.project.name,
    summary: row.summary,
    actorName: row.actor?.fullName ?? null,
    eventType: row.eventType,
    createdAt: row.createdAt.toISOString(),
    href:
      row.entityType === 'SMM_CONTENT_ITEM' && row.entityId
        ? `/smm/projects/${row.projectId}/content/${row.entityId}`
        : `/smm/projects/${row.projectId}`,
  }));

  return {
    period: periodMeta,
    isClientView,
    kpis: {
      activeProjects: activeProjects.length,
      activeProjectsOpenedInPeriod,
      todayWorkCount: todayWorkItems.length,
      todayOverdueCount,
      weekContentPlanned,
      weekContentReadyPct: pct(weekContentReady, weekContentPlanned),
      revenue,
      expenses,
      profit,
      contentCosts,
    },
    todayWork,
    attention,
    projects: projectCards,
    finance,
    team,
    contentPipeline,
    weeklyContent,
    clientApprovals,
    recentActivity,
  };
}

function buildEmptyWeeklyContent(
  weekStart: Date,
  timeZone: string,
  todayStart: Date,
): SmmDashboardWeeklyDay[] {
  return buildWeeklyContent(weekStart, timeZone, todayStart, []);
}

function buildWeeklyContent(
  weekStart: Date,
  timeZone: string,
  todayStart: Date,
  rows: Array<{ publishAt: Date | null; createdAt: Date; contentType: string }>,
): SmmDashboardWeeklyDay[] {
  const days: SmmDashboardWeeklyDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const dayStart = addZonedDays(weekStart, timeZone, i);
    const dayEnd = addZonedDays(dayStart, timeZone, 1);
    const parts = zonedParts(dayStart, timeZone);
    const date = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
    const jsWeekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    const mondayBased = (jsWeekday + 6) % 7;

    let reels = 0;
    let posts = 0;
    let stories = 0;
    let other = 0;
    for (const row of rows) {
      const at = row.publishAt ?? row.createdAt;
      if (at < dayStart || at >= dayEnd) continue;
      if (row.contentType === SmmContentType.REELS) reels += 1;
      else if (row.contentType === SmmContentType.POST) posts += 1;
      else if (row.contentType === SmmContentType.STORY) stories += 1;
      else other += 1;
    }

    days.push({
      date,
      weekday: mondayBased,
      label: WEEKDAY_LABELS[mondayBased] ?? 'Du',
      isToday: dayStart.getTime() === todayStart.getTime(),
      reels,
      posts,
      stories,
      other,
    });
  }
  return days;
}

function buildFinanceBlock(
  preset: SmmFinanceChartPreset,
  financeRange: ResolvedDateRange,
  bookedProjects: Array<{ bookedAt: Date; amount: number }>,
  expenseRows: Array<{ expenseDate: Date; amount: bigint }>,
  expensesTotal: number,
): SmmDashboardFinance {
  const buckets = buildRangeBuckets(financeRange);
  const points: SmmDashboardFinancePoint[] = buckets.map((bucket) => {
    let revenue = 0;
    for (const p of bookedProjects) {
      if (p.bookedAt >= bucket.start && p.bookedAt < bucket.end) revenue += p.amount;
    }
    let expenses = 0;
    for (const e of expenseRows) {
      if (e.expenseDate >= bucket.start && e.expenseDate < bucket.end) {
        expenses += fromDbMoney(e.amount);
      }
    }
    return {
      label: bucket.label,
      start: bucket.start.toISOString(),
      revenue,
      expenses,
      profit: revenue - expenses,
    };
  });

  const revenue = bookedProjects.reduce((sum, p) => sum + p.amount, 0);
  return {
    preset,
    revenue,
    expenses: expensesTotal,
    profit: revenue - expensesTotal,
    points,
  };
}

function buildTeamBlock(input: {
  projects: Array<{
    members: Array<{ userId: string; role: string; user: { id: string; fullName: string } }>;
  }>;
  assignments: Array<{
    userId: string;
    status: string;
    estimatedMinutes: number | null;
    user: { id: string; fullName: string };
  }>;
  tasks: Array<{
    userId: string;
    status: string;
    user: { id: string; fullName: string };
  }>;
  recentlyCompletedUserIds: string[];
}): SmmDashboardTeam {
  const employees = new Map<string, { fullName: string }>();
  for (const project of input.projects) {
    for (const member of project.members) {
      if (member.role === SmmProjectMemberRole.CLIENT) continue;
      employees.set(member.userId, { fullName: member.user.fullName });
    }
  }

  type Load = {
    fullName: string;
    activeAssignments: number;
    estimatedMinutes: number;
    hasAnyEstimate: boolean;
    inProgressCount: number;
    pendingCount: number;
  };

  const loads = new Map<string, Load>();
  for (const [userId, emp] of employees) {
    loads.set(userId, {
      fullName: emp.fullName,
      activeAssignments: 0,
      estimatedMinutes: 0,
      hasAnyEstimate: false,
      inProgressCount: 0,
      pendingCount: 0,
    });
  }

  for (const a of input.assignments) {
    if (!employees.has(a.userId)) continue;
    const load = loads.get(a.userId)!;
    load.activeAssignments += 1;
    if (a.status === SmmAssignmentStatus.IN_PROGRESS) load.inProgressCount += 1;
    if (a.status === SmmAssignmentStatus.PENDING) load.pendingCount += 1;
    if (a.estimatedMinutes != null) {
      load.hasAnyEstimate = true;
      load.estimatedMinutes += a.estimatedMinutes;
    }
  }

  for (const t of input.tasks) {
    if (!employees.has(t.userId)) continue;
    const load = loads.get(t.userId)!;
    load.activeAssignments += 1;
    if (t.status === SmmTaskStatus.IN_PROGRESS) load.inProgressCount += 1;
    if (t.status === SmmTaskStatus.PENDING) load.pendingCount += 1;
  }

  let working = 0;
  let pending = 0;
  const openUserIds = new Set<string>();
  for (const [userId, load] of loads) {
    if (load.activeAssignments <= 0) continue;
    openUserIds.add(userId);
    if (load.inProgressCount > 0) working += 1;
    else if (load.pendingCount > 0) pending += 1;
  }

  const completedRecently = new Set(input.recentlyCompletedUserIds).size
    ? [...new Set(input.recentlyCompletedUserIds)].filter((id) => !openUserIds.has(id)).length
    : 0;

  const members: SmmDashboardTeamMemberLoad[] = [...loads.entries()]
    .map(([userId, load]) => ({
      userId,
      fullName: load.fullName,
      activeAssignments: load.activeAssignments,
      estimatedMinutes: load.estimatedMinutes,
      workloadPct: load.hasAnyEstimate
        ? Math.min(100, Math.round((load.estimatedMinutes / (40 * 60)) * 100))
        : null,
      inProgressCount: load.inProgressCount,
      pendingCount: load.pendingCount,
    }))
    .sort((a, b) => b.activeAssignments - a.activeAssignments)
    .slice(0, 8);

  return {
    employeeCount: employees.size,
    working,
    pending,
    completedRecently,
    members,
  };
}
