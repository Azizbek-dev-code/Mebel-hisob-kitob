import { createBrowserRouter, Navigate, useParams, type RouteObject } from 'react-router-dom';
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';

import { PersonalEntryType } from '@furniture-erp/shared';

import { Skeleton } from '@/components/ui/Skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { PersonalLayout } from '@/features/personal/layout/PersonalLayout';
import { MarketingLayout } from '@/features/marketing/components/MarketingLayout';

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

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <Skeleton className="h-40 w-full max-w-lg" />
      <span className="sr-only">Yuklanmoqda…</span>
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

function lazyPage<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule & string,
) {
  return lazy(() =>
    loader().then((mod) => ({
      // Pages may accept route-level props (e.g. filter / type).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: mod[exportName] as ComponentType<any>,
    })),
  );
}

const CustomersPage = lazyPage(() => import('@/features/customers/pages/CustomersPage'), 'CustomersPage');
const CustomerDetailPage = lazyPage(
  () => import('@/features/customers/pages/CustomerDetailPage'),
  'CustomerDetailPage',
);
const DashboardPage = lazyPage(() => import('@/features/dashboard/pages/DashboardPage'), 'DashboardPage');
const DebtsPage = lazyPage(() => import('@/features/debts/pages/DebtsPage'), 'DebtsPage');
const ExpensesPage = lazyPage(() => import('@/features/expenses/pages/ExpensesPage'), 'ExpensesPage');
const InventoryPage = lazyPage(() => import('@/features/inventory/pages/InventoryPage'), 'InventoryPage');
const PersonalBillingPage = lazyPage(
  () => import('@/features/personal/billing/pages/PersonalBillingPage'),
  'PersonalBillingPage',
);
const PersonalDashboardPage = lazyPage(
  () => import('@/features/personal/dashboard/pages/PersonalDashboardPage'),
  'PersonalDashboardPage',
);
const PersonalFinanceHubPage = lazyPage(
  () => import('@/features/personal/finance/pages/PersonalFinanceHubPage'),
  'PersonalFinanceHubPage',
);
const PersonalGrowthFocusPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthFocusPage'),
  'PersonalGrowthFocusPage',
);
const PersonalGrowthHabitsPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthHabitsPage'),
  'PersonalGrowthHabitsPage',
);
const PersonalGrowthHabitsProgressPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthHabitsProgressPage'),
  'PersonalGrowthHabitsProgressPage',
);
const PersonalGrowthHabitDetailPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthHabitDetailPage'),
  'PersonalGrowthHabitDetailPage',
);
const PersonalGrowthLearningPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthLearningPage'),
  'PersonalGrowthLearningPage',
);
const PersonalGrowthLevelPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthLevelPage'),
  'PersonalGrowthLevelPage',
);
const PersonalGrowthAchievementsPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthAchievementsPage'),
  'PersonalGrowthAchievementsPage',
);
const PersonalGrowthFriendsPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthFriendsPage'),
  'PersonalGrowthFriendsPage',
);
const PersonalGrowthChallengesPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthChallengesPage'),
  'PersonalGrowthChallengesPage',
);
const PersonalGrowthSocialPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthSocialPage'),
  'PersonalGrowthSocialPage',
);
const PersonalGrowthReviewsPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthReviewsPage'),
  'PersonalGrowthReviewsPage',
);
const PersonalGrowthHubPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthHubPage'),
  'PersonalGrowthHubPage',
);
const PersonalGrowthTodosPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGrowthTodosPage'),
  'PersonalGrowthTodosPage',
);
const PersonalGlobalRankingPage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGlobalRankingPage'),
  'PersonalGlobalRankingPage',
);
const PersonalGlobalRankingProfilePage = lazyPage(
  () => import('@/features/personal/growth/pages/PersonalGlobalRankingProfilePage'),
  'PersonalGlobalRankingProfilePage',
);
const PersonalHistoryPage = lazyPage(
  () => import('@/features/personal/history/pages/PersonalHistoryPage'),
  'PersonalHistoryPage',
);
const PersonalCategoriesPage = lazyPage(
  () => import('@/features/personal/ledger/pages/PersonalCategoriesPage'),
  'PersonalCategoriesPage',
);
const PersonalEntriesPage = lazyPage(
  () => import('@/features/personal/ledger/pages/PersonalEntriesPage'),
  'PersonalEntriesPage',
);
const PersonalWalletsPage = lazyPage(
  () => import('@/features/personal/ledger/pages/PersonalWalletsPage'),
  'PersonalWalletsPage',
);
const PersonalBudgetsPage = lazyPage(
  () => import('@/features/personal/planning/pages/PersonalBudgetsPage'),
  'PersonalBudgetsPage',
);
const PersonalGoalsPage = lazyPage(
  () => import('@/features/personal/planning/pages/PersonalGoalsPage'),
  'PersonalGoalsPage',
);
const PersonalPlanPage = lazyPage(
  () => import('@/features/personal/plan/pages/PersonalPlanPage'),
  'PersonalPlanPage',
);
const PersonalAnalyticsPage = lazyPage(
  () => import('@/features/personal/analytics/pages/PersonalAnalyticsPage'),
  'PersonalAnalyticsPage',
);
const PersonalDebtsPage = lazyPage(
  () => import('@/features/personal/lifecycle/pages/PersonalDebtsPage'),
  'PersonalDebtsPage',
);
const PersonalNotificationsPage = lazyPage(
  () => import('@/features/personal/lifecycle/pages/PersonalNotificationsPage'),
  'PersonalNotificationsPage',
);
const PersonalRecurringPage = lazyPage(
  () => import('@/features/personal/lifecycle/pages/PersonalRecurringPage'),
  'PersonalRecurringPage',
);
const OnboardingCompletePage = lazyPage(
  () => import('@/features/personal/onboarding/pages/OnboardingCompletePage'),
  'OnboardingCompletePage',
);
const OnboardingPage = lazyPage(
  () => import('@/features/personal/onboarding/pages/OnboardingPage'),
  'OnboardingPage',
);
const PersonalSettingsPage = lazyPage(
  () => import('@/features/personal/settings/pages/PersonalSettingsPage'),
  'PersonalSettingsPage',
);
const PersonalProfileEditPage = lazyPage(
  () => import('@/features/personal/settings/pages/PersonalProfileEditPage'),
  'PersonalProfileEditPage',
);
const PersonalSecurityPage = lazyPage(
  () => import('@/features/personal/settings/pages/PersonalSecurityPage'),
  'PersonalSecurityPage',
);
const PersonalFeedbackPage = lazyPage(
  () => import('@/features/personal/settings/pages/PersonalFeedbackPage'),
  'PersonalFeedbackPage',
);
const PersonalPrivacyPage = lazyPage(
  () => import('@/features/personal/settings/pages/PersonalPrivacyPage'),
  'PersonalPrivacyPage',
);
const ReferralDashboardPage = lazyPage(
  () => import('@/features/referrals/pages/ReferralDashboardPage'),
  'ReferralDashboardPage',
);
const StoreReferralPage = lazyPage(
  () => import('@/features/referrals/pages/ReferralDashboardPage'),
  'StoreReferralPage',
);
const ReferralLandingPage = lazyPage(
  () => import('@/features/referrals/pages/ReferralLandingPage'),
  'ReferralLandingPage',
);
const AccessBlockedPage = lazyPage(
  () => import('@/features/platform/pages/AccessBlockedPage'),
  'AccessBlockedPage',
);
const PlatformAnalyticsExpensesPage = lazyPage(
  () => import('@/features/platform/pages/PlatformAnalyticsPages'),
  'PlatformAnalyticsExpensesPage',
);
const PlatformAnalyticsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformAnalyticsPages'),
  'PlatformAnalyticsPage',
);
const PlatformAnalyticsProfitPage = lazyPage(
  () => import('@/features/platform/pages/PlatformAnalyticsPages'),
  'PlatformAnalyticsProfitPage',
);
const PlatformAnalyticsRevenuePage = lazyPage(
  () => import('@/features/platform/pages/PlatformAnalyticsPages'),
  'PlatformAnalyticsRevenuePage',
);
const PlatformAnalyticsStoresPage = lazyPage(
  () => import('@/features/platform/pages/PlatformAnalyticsPages'),
  'PlatformAnalyticsStoresPage',
);
const PlatformUsageFeaturesPage = lazyPage(
  () => import('@/features/platform/pages/PlatformUsageAnalyticsPages'),
  'PlatformUsageFeaturesPage',
);
const PlatformUsageOverviewPage = lazyPage(
  () => import('@/features/platform/pages/PlatformUsageAnalyticsPages'),
  'PlatformUsageOverviewPage',
);
const PlatformUsageRetentionPage = lazyPage(
  () => import('@/features/platform/pages/PlatformUsageAnalyticsPages'),
  'PlatformUsageRetentionPage',
);
const PlatformUsageUserDetailPage = lazyPage(
  () => import('@/features/platform/pages/PlatformUsageAnalyticsPages'),
  'PlatformUsageUserDetailPage',
);
const PlatformUsageUsersPage = lazyPage(
  () => import('@/features/platform/pages/PlatformUsageAnalyticsPages'),
  'PlatformUsageUsersPage',
);
const PlatformDashboardPage = lazyPage(
  () => import('@/features/platform/pages/PlatformDashboardPage'),
  'PlatformDashboardPage',
);
const PlatformExpensesPage = lazyPage(
  () => import('@/features/platform/pages/PlatformExpensesPage'),
  'PlatformExpensesPage',
);
const PlatformOnboardingPage = lazyPage(
  () => import('@/features/platform/pages/PlatformOnboardingPage'),
  'PlatformOnboardingPage',
);
const PlatformOnboardingAnswersPage = lazyPage(
  () => import('@/features/platform/pages/PlatformOnboardingAdminPages'),
  'PlatformOnboardingAnswersPage',
);
const PlatformOnboardingNeedsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformOnboardingAdminPages'),
  'PlatformOnboardingNeedsPage',
);
const PlatformOnboardingQuestionsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformOnboardingAdminPages'),
  'PlatformOnboardingQuestionsPage',
);
const PlatformOnboardingSolutionsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformOnboardingAdminPages'),
  'PlatformOnboardingSolutionsPage',
);
const PlatformPersonalPage = lazyPage(
  () => import('@/features/platform/pages/PlatformPersonalPage'),
  'PlatformPersonalPage',
);
const PlatformFinanceIncomePage = lazyPage(
  () => import('@/features/platform/pages/PlatformHubPages'),
  'PlatformFinanceIncomePage',
);
const PlatformFinanceOverviewPage = lazyPage(
  () => import('@/features/platform/pages/PlatformHubPages'),
  'PlatformFinanceOverviewPage',
);
const PlatformSubscriptionsOverviewPage = lazyPage(
  () => import('@/features/platform/pages/PlatformHubPages'),
  'PlatformSubscriptionsOverviewPage',
);
const PlatformAccountsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformAccountsPage'),
  'PlatformAccountsPage',
);
const PlatformAccountDetailPage = lazyPage(
  () => import('@/features/platform/pages/PlatformAccountDetailPage'),
  'PlatformAccountDetailPage',
);
const PlatformReferralPage = lazyPage(
  () => import('@/features/platform/pages/PlatformReferralPage'),
  'PlatformReferralPage',
);
const PlatformReferralSettingsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformReferralPage'),
  'PlatformReferralSettingsPage',
);
const PlatformReferralUsersPage = lazyPage(
  () => import('@/features/platform/pages/PlatformReferralPage'),
  'PlatformReferralUsersPage',
);
const PlatformReferralWithdrawalsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformReferralPage'),
  'PlatformReferralWithdrawalsPage',
);
const PlatformPaymentsHistoryPage = lazyPage(
  () => import('@/features/platform/pages/PlatformPaymentsPages'),
  'PlatformPaymentsHistoryPage',
);
const PlatformPaymentsOverduePage = lazyPage(
  () => import('@/features/platform/pages/PlatformPaymentsPages'),
  'PlatformPaymentsOverduePage',
);
const PlatformPaymentsPendingPage = lazyPage(
  () => import('@/features/platform/pages/PlatformPaymentsPages'),
  'PlatformPaymentsPendingPage',
);
const PlatformPlansPage = lazyPage(
  () => import('@/features/platform/pages/PlatformPlansPage'),
  'PlatformPlansPage',
);
const PlatformPnlPage = lazyPage(() => import('@/features/platform/pages/PlatformPnlPage'), 'PlatformPnlPage');
const PlatformAccountDeletionsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformAccountDeletionsPage'),
  'PlatformAccountDeletionsPage',
);
const PlatformSettingsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformSettingsPage'),
  'PlatformSettingsPage',
);
const PlatformTelegramAutomationsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformTelegramPages'),
  'PlatformTelegramAutomationsPage',
);
const PlatformTelegramBroadcastPage = lazyPage(
  () => import('@/features/platform/pages/PlatformTelegramPages'),
  'PlatformTelegramBroadcastPage',
);
const PlatformTelegramBotPage = lazyPage(
  () => import('@/features/platform/pages/PlatformTelegramPages'),
  'PlatformTelegramBotPage',
);
const PlatformTelegramMenuPage = lazyPage(
  () => import('@/features/platform/pages/PlatformTelegramPages'),
  'PlatformTelegramMenuPage',
);
const PlatformTelegramPage = lazyPage(
  () => import('@/features/platform/pages/PlatformTelegramPages'),
  'PlatformTelegramPage',
);
const PlatformTelegramStartPage = lazyPage(
  () => import('@/features/platform/pages/PlatformTelegramPages'),
  'PlatformTelegramStartPage',
);
const PlatformTelegramStatsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformTelegramPages'),
  'PlatformTelegramStatsPage',
);
const PlatformTelegramUsersPage = lazyPage(
  () => import('@/features/platform/pages/PlatformTelegramPages'),
  'PlatformTelegramUsersPage',
);
const PlatformShopDetailPage = lazyPage(
  () => import('@/features/platform/pages/PlatformShopDetailPage'),
  'PlatformShopDetailPage',
);
const PlatformShopsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformShopsPage'),
  'PlatformShopsPage',
);
const PlatformSubscriptionRequestsPage = lazyPage(
  () => import('@/features/platform/pages/PlatformSubscriptionRequestsPage'),
  'PlatformSubscriptionRequestsPage',
);
const NewPurchasePage = lazyPage(
  () => import('@/features/purchasing/pages/NewPurchasePage'),
  'NewPurchasePage',
);
const PurchaseDetailPage = lazyPage(
  () => import('@/features/purchasing/pages/PurchaseDetailPage'),
  'PurchaseDetailPage',
);
const PurchasesPage = lazyPage(() => import('@/features/purchasing/pages/PurchasesPage'), 'PurchasesPage');
const SupplierDetailPage = lazyPage(
  () => import('@/features/purchasing/pages/SupplierDetailPage'),
  'SupplierDetailPage',
);
const SuppliersPage = lazyPage(() => import('@/features/purchasing/pages/SuppliersPage'), 'SuppliersPage');
const ProductsPage = lazyPage(() => import('@/features/products/pages/ProductsPage'), 'ProductsPage');
const ProductDetailPage = lazyPage(
  () => import('@/features/products/pages/ProductDetailPage'),
  'ProductDetailPage',
);
const ReportsPage = lazyPage(() => import('@/features/reports/pages/ReportsPage'), 'ReportsPage');
const AssemblyTasksPage = lazyPage(
  () => import('@/features/sales/pages/AssemblyTasksPage'),
  'AssemblyTasksPage',
);
const DeliveryPage = lazyPage(() => import('@/features/sales/pages/DeliveryPage'), 'DeliveryPage');
const EditSalePage = lazyPage(() => import('@/features/sales/pages/EditSalePage'), 'EditSalePage');
const NewSalePage = lazyPage(() => import('@/features/sales/pages/NewSalePage'), 'NewSalePage');
const SaleDetailPage = lazyPage(() => import('@/features/sales/pages/SaleDetailPage'), 'SaleDetailPage');
const SalesPage = lazyPage(() => import('@/features/sales/pages/SalesPage'), 'SalesPage');
const BackupPage = lazyPage(() => import('@/features/settings/pages/BackupPage'), 'BackupPage');
const SettingsPage = lazyPage(() => import('@/features/settings/pages/SettingsPage'), 'SettingsPage');
const SettingsAccountPage = lazyPage(
  () => import('@/features/settings/pages/SettingsAccountPage'),
  'SettingsAccountPage',
);
const SettingsSecurityPage = lazyPage(
  () => import('@/features/settings/pages/SettingsSecurityPage'),
  'SettingsSecurityPage',
);
const SettingsShopPage = lazyPage(
  () => import('@/features/settings/pages/SettingsShopPage'),
  'SettingsShopPage',
);
const SettingsDangerPage = lazyPage(
  () => import('@/features/settings/pages/SettingsDangerPage'),
  'SettingsDangerPage',
);
const BusinessNotificationsPage = lazyPage(
  () => import('@/features/notifications/BusinessNotificationsPage'),
  'BusinessNotificationsPage',
);
const ForbiddenPage = lazyPage(
  () => import('@/features/store-creation/pages/ForbiddenPage'),
  'ForbiddenPage',
);
const PlatformStoreRequestDetailPage = lazyPage(
  () => import('@/features/store-creation/pages/PlatformStoreRequestDetailPage'),
  'PlatformStoreRequestDetailPage',
);
const PlatformStoreRequestsPage = lazyPage(
  () => import('@/features/store-creation/pages/PlatformStoreRequestsPage'),
  'PlatformStoreRequestsPage',
);
const RegisterStorePage = lazyPage(
  () => import('@/features/store-creation/pages/RegisterStorePage'),
  'RegisterStorePage',
);
const StoreRequestStatusPage = lazyPage(
  () => import('@/features/store-creation/pages/StoreRequestStatusPage'),
  'StoreRequestStatusPage',
);
const AuditPage = lazyPage(() => import('@/features/audit/pages/AuditPage'), 'AuditPage');
const StoreBillingPage = lazyPage(
  () => import('@/features/subscription/pages/StoreBillingPage'),
  'StoreBillingPage',
);
const SystemCheckPage = lazyPage(() => import('@/features/system/pages/SystemCheckPage'), 'SystemCheckPage');
const MySalesPage = lazyPage(() => import('@/features/workers/pages/MySalesPage'), 'MySalesPage');
const SellerReportPage = lazyPage(
  () => import('@/features/workers/pages/SellerReportPage'),
  'SellerReportPage',
);
const NewWorkerPage = lazyPage(() => import('@/features/workers/pages/NewWorkerPage'), 'NewWorkerPage');
const FeeReconciliationPage = lazyPage(
  () => import('@/features/workers/pages/FeeReconciliationPage'),
  'FeeReconciliationPage',
);
const ProfileFinancesPage = lazyPage(
  () => import('@/features/workers/pages/ProfileFinancesPage'),
  'ProfileFinancesPage',
);
const ProfilePage = lazyPage(() => import('@/features/workers/pages/ProfilePage'), 'ProfilePage');
const WorkerCompensationPage = lazyPage(
  () => import('@/features/workers/pages/WorkerCompensationPage'),
  'WorkerCompensationPage',
);
const WorkerCompensationPreviewPage = lazyPage(
  () => import('@/features/workers/pages/WorkerCompensationPreviewPage'),
  'WorkerCompensationPreviewPage',
);
const WorkerDashboardPage = lazyPage(
  () => import('@/features/workers/pages/WorkerDashboardPage'),
  'WorkerDashboardPage',
);
const WorkerDetailPage = lazyPage(
  () => import('@/features/workers/pages/WorkerDetailPage'),
  'WorkerDetailPage',
);
const WorkerEditPage = lazyPage(() => import('@/features/workers/pages/WorkerEditPage'), 'WorkerEditPage');
const WorkerFinancesPage = lazyPage(
  () => import('@/features/workers/pages/WorkerFinancesPage'),
  'WorkerFinancesPage',
);
const WorkersPage = lazyPage(() => import('@/features/workers/pages/WorkersPage'), 'WorkersPage');
const MarketingHomePage = lazyPage(
  () => import('@/features/marketing/pages/MarketingHomePage'),
  'MarketingHomePage',
);
const MarketingFinancePage = lazyPage(
  () => import('@/features/marketing/pages/feature-pages'),
  'MarketingFinancePage',
);
const MarketingGoalsPage = lazyPage(
  () => import('@/features/marketing/pages/feature-pages'),
  'MarketingGoalsPage',
);
const MarketingHabitsPage = lazyPage(
  () => import('@/features/marketing/pages/feature-pages'),
  'MarketingHabitsPage',
);
const MarketingPomodoroPage = lazyPage(
  () => import('@/features/marketing/pages/feature-pages'),
  'MarketingPomodoroPage',
);
const MarketingTodoPage = lazyPage(
  () => import('@/features/marketing/pages/feature-pages'),
  'MarketingTodoPage',
);
const MarketingAboutPage = lazyPage(
  () => import('@/features/marketing/pages/MarketingMetaPages'),
  'MarketingAboutPage',
);
const MarketingFaqPage = lazyPage(
  () => import('@/features/marketing/pages/MarketingMetaPages'),
  'MarketingFaqPage',
);
const MarketingPricingPage = lazyPage(
  () => import('@/features/marketing/pages/MarketingMetaPages'),
  'MarketingPricingPage',
);
const NotFoundPage = lazyPage(
  () => import('@/features/marketing/pages/MarketingMetaPages'),
  'NotFoundPage',
);

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
    children: [
      {
        element: withSuspense(<MarketingLayout />),
        children: [
          { path: ROUTES.home, element: <MarketingHomePage /> },
          { path: ROUTES.marketingTodo, element: <MarketingTodoPage /> },
          { path: ROUTES.marketingHabits, element: <MarketingHabitsPage /> },
          { path: ROUTES.marketingPomodoro, element: <MarketingPomodoroPage /> },
          { path: ROUTES.marketingFinance, element: <MarketingFinancePage /> },
          { path: ROUTES.marketingGoals, element: <MarketingGoalsPage /> },
          { path: ROUTES.marketingPricing, element: <MarketingPricingPage /> },
          { path: ROUTES.marketingAbout, element: <MarketingAboutPage /> },
          { path: ROUTES.marketingFaq, element: <MarketingFaqPage /> },
        ],
      },
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.forgotPassword, element: <ForgotPasswordPage /> },
    ],
  },
  { path: ROUTES.registerStore, element: withSuspense(<RegisterStorePage />) },
  { path: '/register-store/:id', element: withSuspense(<StoreRequestStatusPage />) },
  { path: '/ref/:code', element: withSuspense(<ReferralLandingPage />) },
  { path: ROUTES.onboarding, element: withSuspense(<OnboardingPage />) },
  { path: ROUTES.onboardingComplete, element: withSuspense(<OnboardingCompletePage />) },
  {
    element: <PersonalProtectedRoute />,
    children: [
      {
        element: withSuspense(<PersonalLayout />),
        children: [
          { path: ROUTES.personalDashboard, element: <PersonalDashboardPage /> },
          { path: ROUTES.personalPlan, element: <PersonalPlanPage /> },
          { path: ROUTES.personalGrowth, element: <PersonalGrowthHubPage /> },
          { path: ROUTES.personalGrowthTodos, element: <PersonalGrowthTodosPage /> },
          { path: ROUTES.personalGrowthFocus, element: <PersonalGrowthFocusPage /> },
          { path: ROUTES.personalGrowthHabits, element: <PersonalGrowthHabitsPage /> },
          { path: ROUTES.personalGrowthHabitsProgress, element: <PersonalGrowthHabitsProgressPage /> },
          { path: '/personal/growth/habits/:habitId', element: <PersonalGrowthHabitDetailPage /> },
          { path: ROUTES.personalGrowthLearning, element: <PersonalGrowthLearningPage /> },
          {
            path: ROUTES.personalGrowthGoals,
            element: <Navigate to={ROUTES.personalGrowthLearning} replace />,
          },
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
            element: <Navigate to={ROUTES.personalNotifications} replace />,
          },
          { path: ROUTES.personalGrowthReviews, element: <PersonalGrowthReviewsPage /> },
          { path: ROUTES.personalFinance, element: <PersonalFinanceHubPage /> },
          { path: ROUTES.personalProfile, element: <PersonalSettingsPage /> },
          { path: ROUTES.personalProfileEdit, element: <PersonalProfileEditPage /> },
          { path: ROUTES.personalSecurity, element: <PersonalSecurityPage /> },
          { path: ROUTES.personalFeedback, element: <PersonalFeedbackPage /> },
          { path: ROUTES.personalPrivacy, element: <PersonalPrivacyPage /> },
          { path: ROUTES.personalRanking, element: <PersonalGlobalRankingPage /> },
          { path: '/personal/ranking/:identityId', element: <PersonalGlobalRankingProfilePage /> },
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
      { path: ROUTES.systemCheck, element: withSuspense(<SystemCheckPage />) },
      { path: ROUTES.accessBlocked, element: withSuspense(<AccessBlockedPage />) },
      {
        element: withSuspense(<AppLayout />),
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
          { path: ROUTES.platformTelegram, element: platformOnly(<PlatformTelegramPage />) },
          { path: ROUTES.platformTelegramBot, element: platformOnly(<PlatformTelegramBotPage />) },
          { path: ROUTES.platformTelegramStart, element: platformOnly(<PlatformTelegramStartPage />) },
          { path: ROUTES.platformTelegramMenu, element: platformOnly(<PlatformTelegramMenuPage />) },
          {
            path: ROUTES.platformTelegramBroadcast,
            element: platformOnly(<PlatformTelegramBroadcastPage />),
          },
          {
            path: ROUTES.platformTelegramAutomations,
            element: platformOnly(<PlatformTelegramAutomationsPage />),
          },
          { path: ROUTES.platformTelegramStats, element: platformOnly(<PlatformTelegramStatsPage />) },
          { path: ROUTES.platformTelegramUsers, element: platformOnly(<PlatformTelegramUsersPage />) },
          { path: ROUTES.platformUsage, element: platformOnly(<PlatformUsageOverviewPage />) },
          { path: ROUTES.platformUsageUsers, element: platformOnly(<PlatformUsageUsersPage />) },
          { path: '/platform/usage/users/:id', element: platformOnly(<PlatformUsageUserDetailPage />) },
          { path: ROUTES.platformUsageFeatures, element: platformOnly(<PlatformUsageFeaturesPage />) },
          { path: ROUTES.platformUsageRetention, element: platformOnly(<PlatformUsageRetentionPage />) },
          { path: ROUTES.platformUsageSessions, element: platformOnly(<PlatformUsageUsersPage />) },
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
          { path: ROUTES.settingsAccount, element: <SettingsAccountPage /> },
          { path: ROUTES.settingsSecurity, element: <SettingsSecurityPage /> },
          { path: ROUTES.settingsShop, element: <SettingsShopPage /> },
          { path: ROUTES.settingsDanger, element: <SettingsDangerPage /> },
          { path: ROUTES.notifications, element: <BusinessNotificationsPage /> },
          { path: ROUTES.settings, element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    element: withSuspense(<MarketingLayout />),
    children: [{ path: '*', element: <NotFoundPage /> }],
  },
];

export const router = createBrowserRouter(routes);
