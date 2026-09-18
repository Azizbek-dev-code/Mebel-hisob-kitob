import { createBrowserRouter, Navigate, useParams, type RouteObject } from 'react-router-dom';
import type { ReactNode } from 'react';

import { PersonalEntryType } from '@furniture-erp/shared';

import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { CustomersPage } from '@/features/customers/pages/CustomersPage';
import { CustomerDetailPage } from '@/features/customers/pages/CustomerDetailPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { DebtsPage } from '@/features/debts/pages/DebtsPage';
import { ExpensesPage } from '@/features/expenses/pages/ExpensesPage';
import { InventoryPage } from '@/features/inventory/pages/InventoryPage';
import { PersonalBillingPage } from '@/features/personal/billing/pages/PersonalBillingPage';
import { PersonalDashboardPage } from '@/features/personal/dashboard/pages/PersonalDashboardPage';
import { PersonalFinanceHubPage } from '@/features/personal/finance/pages/PersonalFinanceHubPage';
import { PersonalGrowthFocusPage } from '@/features/personal/growth/pages/PersonalGrowthFocusPage';
import { PersonalGrowthHabitsPage } from '@/features/personal/growth/pages/PersonalGrowthHabitsPage';
import { PersonalGrowthLearningPage } from '@/features/personal/growth/pages/PersonalGrowthLearningPage';
import { PersonalGrowthLevelPage } from '@/features/personal/growth/pages/PersonalGrowthLevelPage';
import { PersonalGrowthAchievementsPage } from '@/features/personal/growth/pages/PersonalGrowthAchievementsPage';
import { PersonalGrowthFriendsPage } from '@/features/personal/growth/pages/PersonalGrowthFriendsPage';
import { PersonalGrowthChallengesPage } from '@/features/personal/growth/pages/PersonalGrowthChallengesPage';
import { PersonalGrowthSocialPage } from '@/features/personal/growth/pages/PersonalGrowthSocialPage';
import { PersonalGrowthNotificationsPage } from '@/features/personal/growth/pages/PersonalGrowthNotificationsPage';
import { PersonalGrowthReviewsPage } from '@/features/personal/growth/pages/PersonalGrowthReviewsPage';
import { PersonalGrowthHubPage } from '@/features/personal/growth/pages/PersonalGrowthHubPage';
import { PersonalGrowthTodosPage } from '@/features/personal/growth/pages/PersonalGrowthTodosPage';
import { PersonalHistoryPage } from '@/features/personal/history/pages/PersonalHistoryPage';
import { PersonalLayout } from '@/features/personal/layout/PersonalLayout';
import { PersonalCategoriesPage } from '@/features/personal/ledger/pages/PersonalCategoriesPage';
import { PersonalEntriesPage } from '@/features/personal/ledger/pages/PersonalEntriesPage';
import { PersonalWalletsPage } from '@/features/personal/ledger/pages/PersonalWalletsPage';
import { PersonalBudgetsPage } from '@/features/personal/planning/pages/PersonalBudgetsPage';
import { PersonalGoalsPage } from '@/features/personal/planning/pages/PersonalGoalsPage';
import { PersonalPlanPage } from '@/features/personal/plan/pages/PersonalPlanPage';
import { PersonalAnalyticsPage } from '@/features/personal/analytics/pages/PersonalAnalyticsPage';
import { PersonalDebtsPage } from '@/features/personal/lifecycle/pages/PersonalDebtsPage';
import { PersonalNotificationsPage } from '@/features/personal/lifecycle/pages/PersonalNotificationsPage';
import { PersonalRecurringPage } from '@/features/personal/lifecycle/pages/PersonalRecurringPage';
import { OnboardingCompletePage } from '@/features/personal/onboarding/pages/OnboardingCompletePage';
import { OnboardingPage } from '@/features/personal/onboarding/pages/OnboardingPage';
import { PersonalSettingsPage } from '@/features/personal/settings/pages/PersonalSettingsPage';
import { ReferralDashboardPage, StoreReferralPage } from '@/features/referrals/pages/ReferralDashboardPage';
import { ReferralLandingPage } from '@/features/referrals/pages/ReferralLandingPage';
import { AccessBlockedPage } from '@/features/platform/pages/AccessBlockedPage';
import {
  PlatformAnalyticsExpensesPage,
  PlatformAnalyticsPage,
  PlatformAnalyticsProfitPage,
  PlatformAnalyticsRevenuePage,
  PlatformAnalyticsStoresPage,
} from '@/features/platform/pages/PlatformAnalyticsPages';
import { PlatformDashboardPage } from '@/features/platform/pages/PlatformDashboardPage';
import { PlatformExpensesPage } from '@/features/platform/pages/PlatformExpensesPage';
import { PlatformOnboardingPage } from '@/features/platform/pages/PlatformOnboardingPage';
import {
  PlatformOnboardingAnswersPage,
  PlatformOnboardingNeedsPage,
  PlatformOnboardingQuestionsPage,
  PlatformOnboardingSolutionsPage,
} from '@/features/platform/pages/PlatformOnboardingAdminPages';
import { PlatformPersonalPage } from '@/features/platform/pages/PlatformPersonalPage';
import {
  PlatformFinanceIncomePage,
  PlatformFinanceOverviewPage,
  PlatformSubscriptionsOverviewPage,
} from '@/features/platform/pages/PlatformHubPages';
import { PlatformAccountsPage } from '@/features/platform/pages/PlatformAccountsPage';
import { PlatformAccountDetailPage } from '@/features/platform/pages/PlatformAccountDetailPage';
import {
  PlatformReferralPage,
  PlatformReferralSettingsPage,
  PlatformReferralUsersPage,
  PlatformReferralWithdrawalsPage,
} from '@/features/platform/pages/PlatformReferralPage';
import {
  PlatformPaymentsHistoryPage,
  PlatformPaymentsOverduePage,
  PlatformPaymentsPendingPage,
} from '@/features/platform/pages/PlatformPaymentsPages';
import { PlatformPlansPage } from '@/features/platform/pages/PlatformPlansPage';
import { PlatformPnlPage } from '@/features/platform/pages/PlatformPnlPage';
import { PlatformAccountDeletionsPage } from '@/features/platform/pages/PlatformAccountDeletionsPage';
import { PlatformSettingsPage } from '@/features/platform/pages/PlatformSettingsPage';
import { PlatformShopDetailPage } from '@/features/platform/pages/PlatformShopDetailPage';
import { PlatformShopsPage } from '@/features/platform/pages/PlatformShopsPage';
import { PlatformSubscriptionRequestsPage } from '@/features/platform/pages/PlatformSubscriptionRequestsPage';
import { NewPurchasePage } from '@/features/purchasing/pages/NewPurchasePage';
import { PurchaseDetailPage } from '@/features/purchasing/pages/PurchaseDetailPage';
import { PurchasesPage } from '@/features/purchasing/pages/PurchasesPage';
import { SupplierDetailPage } from '@/features/purchasing/pages/SupplierDetailPage';
import { SuppliersPage } from '@/features/purchasing/pages/SuppliersPage';
import { ProductsPage } from '@/features/products/pages/ProductsPage';
import { ProductDetailPage } from '@/features/products/pages/ProductDetailPage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage';
import { AssemblyTasksPage } from '@/features/sales/pages/AssemblyTasksPage';
import { DeliveryPage } from '@/features/sales/pages/DeliveryPage';
import { EditSalePage } from '@/features/sales/pages/EditSalePage';
import { NewSalePage } from '@/features/sales/pages/NewSalePage';
import { SaleDetailPage } from '@/features/sales/pages/SaleDetailPage';
import { SalesPage } from '@/features/sales/pages/SalesPage';
import { BackupPage } from '@/features/settings/pages/BackupPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { ForbiddenPage } from '@/features/store-creation/pages/ForbiddenPage';
import { PlatformStoreRequestDetailPage } from '@/features/store-creation/pages/PlatformStoreRequestDetailPage';
import { PlatformStoreRequestsPage } from '@/features/store-creation/pages/PlatformStoreRequestsPage';
import { RegisterStorePage } from '@/features/store-creation/pages/RegisterStorePage';
import { StoreRequestStatusPage } from '@/features/store-creation/pages/StoreRequestStatusPage';
import { AuditPage } from '@/features/audit/pages/AuditPage';
import { StoreBillingPage } from '@/features/subscription/pages/StoreBillingPage';
import { SystemCheckPage } from '@/features/system/pages/SystemCheckPage';
import { MySalesPage } from '@/features/workers/pages/MySalesPage';
import { SellerReportPage } from '@/features/workers/pages/SellerReportPage';
import { NewWorkerPage } from '@/features/workers/pages/NewWorkerPage';
import { FeeReconciliationPage } from '@/features/workers/pages/FeeReconciliationPage';
import { ProfileFinancesPage } from '@/features/workers/pages/ProfileFinancesPage';
import { ProfilePage } from '@/features/workers/pages/ProfilePage';
import { WorkerCompensationPage } from '@/features/workers/pages/WorkerCompensationPage';
import { WorkerCompensationPreviewPage } from '@/features/workers/pages/WorkerCompensationPreviewPage';
import { WorkerDashboardPage } from '@/features/workers/pages/WorkerDashboardPage';
import { WorkerDetailPage } from '@/features/workers/pages/WorkerDetailPage';
import { WorkerEditPage } from '@/features/workers/pages/WorkerEditPage';
import { WorkerFinancesPage } from '@/features/workers/pages/WorkerFinancesPage';
import { WorkersPage } from '@/features/workers/pages/WorkersPage';

import { ProtectedRoute, PersonalProtectedRoute, PublicOnlyRoute } from './guards';
import {
  canManageExpenses,
  canManageInventory,
  canManageStoreSettings,
  canManageWorkers,
  canReadAuditLog,
  canReviewStoreCreationRequests,
} from './navigation';
import { ROUTES } from './paths';

export { ROUTES } from './paths';

function HomeDashboard() {
  const { data: user } = useCurrentUser();
  if (canReviewStoreCreationRequests(user)) {
    return <PlatformDashboardPage />;
  }
  // Financial analytics dashboard is store ADMIN only.
  // Employees (and cashiers) get the personal "My Work" home instead.
  if (canManageExpenses(user)) {
    return <DashboardPage />;
  }
  return <WorkerDashboardPage />;
}

function RequireWorkerManager({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return null;
  if (!canManageWorkers(user)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return children;
}

/** Compatibility: old /masters/:id URLs open the unified worker detail. */
function MasterToWorkerRedirect() {
  const { id } = useParams();
  if (!id) return <Navigate to={`${ROUTES.workers}?responsibility=ASSEMBLER`} replace />;
  return <Navigate to={ROUTES.workerDetail(id)} replace />;
}

function RequireExpenseManager({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return null;
  if (!canManageExpenses(user)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return children;
}

function RequireStoreSettingsManager({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return null;
  if (!canManageStoreSettings(user)) {
    return <Navigate to={ROUTES.settings} replace />;
  }
  return children;
}

function RequireAuditReader({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return null;
  if (!canReadAuditLog(user)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return children;
}

function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return null;
  if (!canReviewStoreCreationRequests(user)) {
    return <ForbiddenPage />;
  }
  return children;
}

function platformOnly(page: ReactNode) {
  return <RequirePlatformAdmin>{page}</RequirePlatformAdmin>;
}

function RequireInventoryManager({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return null;
  if (!canManageInventory(user)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return children;
}

/**
 * Exported separately from the router so tests can mount the same tree in memory
 * and check the real guards, redirects and layout rather than a copy of them.
 */
export const routes: RouteObject[] = [
  {
    element: <PublicOnlyRoute />,
    children: [{ path: ROUTES.login, element: <LoginPage /> }],
  },
  { path: ROUTES.registerStore, element: <RegisterStorePage /> },
  { path: '/register-store/:id', element: <StoreRequestStatusPage /> },
  { path: '/ref/:code', element: <ReferralLandingPage /> },
  { path: ROUTES.onboarding, element: <OnboardingPage /> },
  { path: ROUTES.onboardingComplete, element: <OnboardingCompletePage /> },
  {
    element: <PersonalProtectedRoute />,
    children: [
      {
        element: <PersonalLayout />,
        children: [
          { path: ROUTES.personalDashboard, element: <PersonalDashboardPage /> },
          { path: ROUTES.personalPlan, element: <PersonalPlanPage /> },
          { path: ROUTES.personalGrowth, element: <PersonalGrowthHubPage /> },
          { path: ROUTES.personalGrowthTodos, element: <PersonalGrowthTodosPage /> },
          { path: ROUTES.personalGrowthFocus, element: <PersonalGrowthFocusPage /> },
          { path: ROUTES.personalGrowthHabits, element: <PersonalGrowthHabitsPage /> },
          { path: ROUTES.personalGrowthLearning, element: <PersonalGrowthLearningPage /> },
          { path: ROUTES.personalGrowthLevel, element: <PersonalGrowthLevelPage /> },
          {
            path: ROUTES.personalGrowthAchievements,
            element: <PersonalGrowthAchievementsPage />,
          },
          { path: ROUTES.personalGrowthFriends, element: <PersonalGrowthFriendsPage /> },
          { path: ROUTES.personalGrowthChallenges, element: <PersonalGrowthChallengesPage /> },
          { path: ROUTES.personalGrowthSocial, element: <PersonalGrowthSocialPage /> },
          {
            path: ROUTES.personalGrowthNotifications,
            element: <PersonalGrowthNotificationsPage />,
          },
          { path: ROUTES.personalGrowthReviews, element: <PersonalGrowthReviewsPage /> },
          { path: ROUTES.personalFinance, element: <PersonalFinanceHubPage /> },
          { path: ROUTES.personalProfile, element: <PersonalSettingsPage /> },
          {
            path: ROUTES.personalSettings,
            element: <Navigate to={ROUTES.personalProfile} replace />,
          },
          { path: ROUTES.personalHistory, element: <PersonalHistoryPage /> },
          { path: ROUTES.personalAccounts, element: <PersonalWalletsPage /> },
          {
            path: ROUTES.personalIncome,
            element: <PersonalEntriesPage type={PersonalEntryType.INCOME} />,
          },
          {
            path: ROUTES.personalExpenses,
            element: <PersonalEntriesPage type={PersonalEntryType.EXPENSE} />,
          },
          { path: ROUTES.personalCategories, element: <PersonalCategoriesPage /> },
          { path: ROUTES.personalBudgets, element: <PersonalBudgetsPage /> },
          { path: ROUTES.personalGoals, element: <PersonalGoalsPage /> },
          { path: ROUTES.personalAnalytics, element: <PersonalAnalyticsPage /> },
          { path: ROUTES.personalRecurring, element: <PersonalRecurringPage /> },
          { path: ROUTES.personalDebts, element: <PersonalDebtsPage /> },
          { path: ROUTES.personalNotifications, element: <PersonalNotificationsPage /> },
          { path: ROUTES.personalBilling, element: <PersonalBillingPage /> },
          { path: ROUTES.personalReferral, element: <ReferralDashboardPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },
      { path: ROUTES.systemCheck, element: <SystemCheckPage /> },
      { path: ROUTES.accessBlocked, element: <AccessBlockedPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.dashboard, element: <HomeDashboard /> },
          { path: ROUTES.billing, element: <StoreBillingPage /> },
          { path: ROUTES.storeReferral, element: <StoreReferralPage /> },
          { path: ROUTES.platformAccounts, element: platformOnly(<PlatformAccountsPage filter="all" />) },
          {
            path: ROUTES.platformAccountsPersonal,
            element: platformOnly(<PlatformAccountsPage filter="personal" />),
          },
          {
            path: ROUTES.platformAccountsBusiness,
            element: platformOnly(<PlatformAccountsPage filter="business" />),
          },
          {
            path: '/platform/accounts/w/:id',
            element: platformOnly(<PlatformAccountDetailPage />),
          },
          { path: ROUTES.platformSubscriptions, element: platformOnly(<PlatformSubscriptionsOverviewPage />) },
          { path: ROUTES.platformFinance, element: platformOnly(<PlatformFinanceOverviewPage />) },
          { path: ROUTES.platformFinanceIncome, element: platformOnly(<PlatformFinanceIncomePage />) },
          { path: ROUTES.platformReferral, element: platformOnly(<PlatformReferralPage />) },
          { path: ROUTES.platformReferralUsers, element: platformOnly(<PlatformReferralUsersPage />) },
          {
            path: ROUTES.platformReferralWithdrawals,
            element: platformOnly(<PlatformReferralWithdrawalsPage />),
          },
          {
            path: ROUTES.platformReferralSettings,
            element: platformOnly(<PlatformReferralSettingsPage />),
          },
          { path: ROUTES.platformStoreRequests, element: platformOnly(<PlatformStoreRequestsPage />) },
          {
            path: '/platform/stores/requests/:id',
            element: platformOnly(<PlatformStoreRequestDetailPage />),
          },
          { path: ROUTES.platformShops, element: platformOnly(<PlatformShopsPage filter="all" />) },
          {
            path: ROUTES.platformShopsActive,
            element: platformOnly(<PlatformShopsPage filter="active" />),
          },
          {
            path: ROUTES.platformShopsPendingPayment,
            element: platformOnly(<PlatformShopsPage filter="pending-payment" />),
          },
          {
            path: ROUTES.platformShopsBlocked,
            element: platformOnly(<PlatformShopsPage filter="blocked" />),
          },
          {
            path: '/platform/shops/:id',
            element: platformOnly(<PlatformShopDetailPage />),
          },
          {
            path: ROUTES.adminStores,
            element: platformOnly(<PlatformShopsPage filter="all" />),
          },
          {
            path: '/admin/stores/:id',
            element: platformOnly(<PlatformShopDetailPage />),
          },
          {
            path: ROUTES.platformSubscriptionRequests,
            element: platformOnly(<PlatformSubscriptionRequestsPage />),
          },
          {
            path: ROUTES.adminSubscriptionRequests,
            element: platformOnly(<PlatformSubscriptionRequestsPage />),
          },
          { path: ROUTES.platformPayments, element: platformOnly(<PlatformPaymentsHistoryPage />) },
          {
            path: ROUTES.platformPaymentsPending,
            element: platformOnly(<PlatformPaymentsPendingPage />),
          },
          {
            path: ROUTES.platformPaymentsOverdue,
            element: platformOnly(<PlatformPaymentsOverduePage />),
          },
          { path: ROUTES.platformPlans, element: platformOnly(<PlatformPlansPage />) },
          { path: ROUTES.platformExpenses, element: platformOnly(<PlatformExpensesPage />) },
          { path: ROUTES.platformPnl, element: platformOnly(<PlatformPnlPage />) },
          { path: ROUTES.platformAnalytics, element: platformOnly(<PlatformAnalyticsPage />) },
          { path: ROUTES.platformOnboarding, element: platformOnly(<PlatformOnboardingPage />) },
          {
            path: ROUTES.platformOnboardingQuestions,
            element: platformOnly(<PlatformOnboardingQuestionsPage />),
          },
          {
            path: ROUTES.platformOnboardingAnswers,
            element: platformOnly(<PlatformOnboardingAnswersPage />),
          },
          {
            path: ROUTES.platformOnboardingNeeds,
            element: platformOnly(<PlatformOnboardingNeedsPage />),
          },
          {
            path: ROUTES.platformOnboardingSolutions,
            element: platformOnly(<PlatformOnboardingSolutionsPage />),
          },
          { path: ROUTES.platformPersonal, element: platformOnly(<PlatformPersonalPage />) },
          {
            path: ROUTES.platformAnalyticsStores,
            element: platformOnly(<PlatformAnalyticsStoresPage />),
          },
          {
            path: ROUTES.platformAnalyticsRevenue,
            element: platformOnly(<PlatformAnalyticsRevenuePage />),
          },
          {
            path: ROUTES.platformAnalyticsExpenses,
            element: platformOnly(<PlatformAnalyticsExpensesPage />),
          },
          {
            path: ROUTES.platformAnalyticsProfit,
            element: platformOnly(<PlatformAnalyticsProfitPage />),
          },
          { path: ROUTES.platformSettings, element: platformOnly(<PlatformSettingsPage />) },
          {
            path: ROUTES.platformAccountDeletions,
            element: platformOnly(<PlatformAccountDeletionsPage />),
          },
          { path: ROUTES.sales, element: <SalesPage /> },
          { path: ROUTES.saleNew, element: <NewSalePage /> },
          { path: '/sales/:id/edit', element: <EditSalePage /> },
          { path: '/sales/:id', element: <SaleDetailPage /> },
          { path: ROUTES.assemblyTasks, element: <AssemblyTasksPage /> },
          { path: ROUTES.delivery, element: <DeliveryPage /> },
          { path: ROUTES.mySales, element: <MySalesPage /> },
          { path: ROUTES.myReports, element: <SellerReportPage /> },
          { path: ROUTES.profile, element: <ProfilePage /> },
          { path: ROUTES.profileFinances, element: <ProfileFinancesPage /> },
          {
            path: ROUTES.products,
            element: (
              <RequireInventoryManager>
                <ProductsPage />
              </RequireInventoryManager>
            ),
          },
          {
            path: '/products/:id',
            element: (
              <RequireInventoryManager>
                <ProductDetailPage />
              </RequireInventoryManager>
            ),
          },
          {
            path: ROUTES.inventory,
            element: (
              <RequireInventoryManager>
                <InventoryPage />
              </RequireInventoryManager>
            ),
          },
          {
            path: ROUTES.purchases,
            element: (
              <RequireInventoryManager>
                <PurchasesPage />
              </RequireInventoryManager>
            ),
          },
          {
            path: ROUTES.purchaseNew,
            element: (
              <RequireInventoryManager>
                <NewPurchasePage />
              </RequireInventoryManager>
            ),
          },
          {
            path: '/purchases/:id',
            element: (
              <RequireInventoryManager>
                <PurchaseDetailPage />
              </RequireInventoryManager>
            ),
          },
          {
            path: ROUTES.suppliers,
            element: (
              <RequireInventoryManager>
                <SuppliersPage />
              </RequireInventoryManager>
            ),
          },
          {
            path: '/suppliers/:id',
            element: (
              <RequireInventoryManager>
                <SupplierDetailPage />
              </RequireInventoryManager>
            ),
          },
          { path: ROUTES.customers, element: <CustomersPage /> },
          { path: '/customers/:id', element: <CustomerDetailPage /> },
          { path: ROUTES.debts, element: <DebtsPage /> },
          {
            path: ROUTES.expenses,
            element: (
              <RequireExpenseManager>
                <ExpensesPage />
              </RequireExpenseManager>
            ),
          },
          {
            path: ROUTES.workers,
            element: (
              <RequireWorkerManager>
                <WorkersPage />
              </RequireWorkerManager>
            ),
          },
          {
            path: ROUTES.workersReconciliation,
            element: (
              <RequireWorkerManager>
                <FeeReconciliationPage />
              </RequireWorkerManager>
            ),
          },
          {
            path: ROUTES.workerNew,
            element: (
              <RequireWorkerManager>
                <NewWorkerPage />
              </RequireWorkerManager>
            ),
          },
          {
            path: '/workers/:id/edit',
            element: (
              <RequireWorkerManager>
                <WorkerEditPage />
              </RequireWorkerManager>
            ),
          },
          {
            path: '/workers/:id/finances',
            element: (
              <RequireWorkerManager>
                <WorkerFinancesPage />
              </RequireWorkerManager>
            ),
          },
          {
            path: '/workers/:id/compensation/preview',
            element: (
              <RequireWorkerManager>
                <WorkerCompensationPreviewPage />
              </RequireWorkerManager>
            ),
          },
          {
            path: '/workers/:id/compensation',
            element: (
              <RequireWorkerManager>
                <WorkerCompensationPage />
              </RequireWorkerManager>
            ),
          },
          {
            path: '/workers/:id',
            element: (
              <RequireWorkerManager>
                <WorkerDetailPage />
              </RequireWorkerManager>
            ),
          },
          {
            path: ROUTES.masters,
            element: (
              <Navigate to={`${ROUTES.workers}?responsibility=ASSEMBLER`} replace />
            ),
          },
          {
            path: '/masters/:id',
            element: <MasterToWorkerRedirect />,
          },
          {
            path: ROUTES.reports,
            element: (
              <RequireExpenseManager>
                <ReportsPage />
              </RequireExpenseManager>
            ),
          },
          {
            path: ROUTES.audit,
            element: (
              <RequireAuditReader>
                <AuditPage />
              </RequireAuditReader>
            ),
          },
          {
            path: ROUTES.settingsBackup,
            element: (
              <RequireStoreSettingsManager>
                <BackupPage />
              </RequireStoreSettingsManager>
            ),
          },
          { path: ROUTES.settings, element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.dashboard} replace />,
  },
];

export const router = createBrowserRouter(routes);
