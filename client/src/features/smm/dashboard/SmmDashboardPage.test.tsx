import {
  SmmDashboardPeriodPreset,
  SmmFinanceChartPreset,
  SmmProjectHealth,
  SmmProjectStatus,
  type SmmAgencyDashboard,
} from '@furniture-erp/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import { TEST_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import { SmmDashboardPage } from '../pages/SmmDashboardPage';

function makeDashboard(overrides: Partial<SmmAgencyDashboard> = {}): SmmAgencyDashboard {
  return {
    period: {
      preset: SmmDashboardPeriodPreset.THIS_MONTH,
      from: '2026-09-01',
      to: '2026-09-29',
      label: 'Bu oy',
      timeZone: 'Asia/Tashkent',
    },
    isClientView: false,
    kpis: {
      activeProjects: 2,
      activeProjectsOpenedInPeriod: 1,
      todayWorkCount: 3,
      todayOverdueCount: 1,
      weekContentPlanned: 5,
      weekContentReadyPct: 40,
      revenue: 12_000_000,
      expenses: 3_500_000,
      profit: 8_500_000,
      contentCosts: 1_000_000,
    },
    todayWork: [
      {
        id: 'task_1',
        kind: 'TASK',
        title: 'Reel montaj',
        projectId: 'proj_1',
        projectName: 'Acme brand',
        clientName: 'Acme',
        assigneeName: 'Dilnoza',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        deadline: '2026-09-29T12:00:00.000Z',
        isOverdue: true,
        href: '/smm/projects/proj_1/tasks',
      },
    ],
    attention: [],
    projects: [
      {
        id: 'proj_1',
        name: 'Acme brand',
        clientName: 'Acme',
        status: SmmProjectStatus.ACTIVE,
        contentProgressPct: 55,
        taskProgressPct: 40,
        deadline: '2026-10-15',
        teamCount: 3,
        managerName: 'Aziz',
        health: SmmProjectHealth.NEEDS_ATTENTION,
        overdueTasks: 1,
        pendingClientApprovals: 0,
        pendingInternalReviews: 0,
        budgetPlanned: 10_000_000,
        contentCostTotal: 2_000_000,
      },
    ],
    finance: {
      preset: SmmFinanceChartPreset.LAST_30_DAYS,
      revenue: 12_000_000,
      expenses: 3_500_000,
      profit: 8_500_000,
      points: [
        {
          label: '01.09',
          start: '2026-09-01',
          revenue: 1_000_000,
          expenses: 200_000,
          profit: 800_000,
        },
        {
          label: '15.09',
          start: '2026-09-15',
          revenue: 2_000_000,
          expenses: 400_000,
          profit: 1_600_000,
        },
      ],
    },
    team: {
      employeeCount: 2,
      working: 1,
      pending: 1,
      completedRecently: 4,
      members: [
        {
          userId: 'u1',
          fullName: 'Dilnoza',
          activeAssignments: 3,
          estimatedMinutes: 0,
          workloadPct: null,
          inProgressCount: 1,
          pendingCount: 2,
        },
      ],
    },
    contentPipeline: [
      { status: 'IDEA', count: 2 },
      { status: 'PRODUCTION', count: 1 },
      { status: 'PUBLISHED', count: 3 },
    ],
    weeklyContent: [
      {
        date: '2026-09-29',
        weekday: 1,
        label: 'Du',
        isToday: true,
        reels: 1,
        posts: 0,
        stories: 1,
        other: 0,
      },
    ],
    clientApprovals: [],
    recentActivity: [
      {
        id: 'act_1',
        projectId: 'proj_1',
        projectName: 'Acme brand',
        summary: 'Kontent nashr etildi',
        actorName: 'Dilnoza',
        eventType: 'CONTENT_PUBLISHED',
        createdAt: '2026-09-28T10:00:00.000Z',
        href: '/smm/projects/proj_1',
      },
    ],
    ...overrides,
  };
}

function mockDashboard(dashboard: SmmAgencyDashboard = makeDashboard()) {
  return mockApi({
    '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
    '/smm/dashboard': {
      status: 200,
      body: { success: true, data: { dashboard } },
    },
  });
}

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <SmmDashboardPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SmmDashboardPage', () => {
  it('loads agency dashboard and renders KPIs, empty attention, and projects', async () => {
    const fetchMock = mockDashboard();
    renderPage();

    expect(
      await screen.findByRole('heading', { name: i18n.t('smm.dashboardTitle') }),
    ).toBeInTheDocument();

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(urls.some((url) => url.includes('/smm/dashboard'))).toBe(true);
    });

    expect(await screen.findByText(i18n.t('smm.kpiActiveProjects'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('smm.kpiOpenedInPeriod', { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('smm.kpiTodayWork'))).toBeInTheDocument();
    expect(screen.getAllByText(i18n.t('smm.kpiRevenue')).length).toBeGreaterThan(0);

    expect(await screen.findByText(i18n.t('smm.attentionEmptyTitle'))).toBeInTheDocument();
    expect(screen.getByText('Acme brand')).toBeInTheDocument();
    expect(screen.getByText('Reel montaj')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('smm.health.NEEDS_ATTENTION'))).toBeInTheDocument();
  });

  it('shows empty-project CTA without treating it as an error', async () => {
    mockDashboard(
      makeDashboard({
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
        projects: [],
        todayWork: [],
        recentActivity: [],
        contentPipeline: [],
      }),
    );
    renderPage();

    expect(await screen.findAllByText(i18n.t('smm.dashboardEmptyTitle'))).toHaveLength(1);
    expect(screen.queryByText(i18n.t('smm.dashboardLoadFailed'))).not.toBeInTheDocument();
  });

  it('shows page-level error with retry when the dashboard request fails', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_ADMIN } } },
      '/smm/dashboard': {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Dashboard failed' },
        },
      },
    });
    renderPage();

    expect(await screen.findByText(i18n.t('smm.dashboardLoadFailed'))).toBeInTheDocument();
  });
});
