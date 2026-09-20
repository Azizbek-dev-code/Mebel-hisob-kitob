import { ROUTES } from '@/routes/paths';

export interface PlatformHubTab {
  to: string;
  labelKey: string;
  end?: boolean;
  matchPrefix?: readonly string[];
}

export interface PlatformHub {
  ariaLabelKey: string;
  tabs: readonly PlatformHubTab[];
}

export const PLATFORM_ACCOUNT_HUB: PlatformHub = {
  ariaLabelKey: 'platformAdmin.hub.accountsAria',
  tabs: [
    {
      to: ROUTES.platformAccounts,
      labelKey: 'platformAdmin.hub.all',
      end: true,
      matchPrefix: ['/platform/accounts/w', ROUTES.platformStoreRequests],
    },
    {
      to: ROUTES.platformAccountsPersonal,
      labelKey: 'platformAdmin.hub.personal',
      end: true,
      matchPrefix: [ROUTES.platformPersonal],
    },
    {
      to: ROUTES.platformAccountsBusiness,
      labelKey: 'platformAdmin.hub.business',
      end: true,
      matchPrefix: [ROUTES.platformShops, ROUTES.adminStores],
    },
  ],
};

export const PLATFORM_SUBSCRIPTION_HUB: PlatformHub = {
  ariaLabelKey: 'platformAdmin.hub.subscriptionsAria',
  tabs: [
    { to: ROUTES.platformSubscriptions, labelKey: 'platformAdmin.hub.overview', end: true },
    {
      to: ROUTES.platformSubscriptionRequests,
      labelKey: 'platformAdmin.hub.requests',
      matchPrefix: [ROUTES.platformSubscriptionRequests, ROUTES.adminSubscriptionRequests],
    },
    {
      to: ROUTES.platformPayments,
      labelKey: 'platformAdmin.hub.payments',
      matchPrefix: [ROUTES.platformPayments],
    },
    { to: ROUTES.platformPlans, labelKey: 'platformAdmin.hub.plans', end: true },
  ],
};

export const PLATFORM_FINANCE_HUB: PlatformHub = {
  ariaLabelKey: 'platformAdmin.hub.financeAria',
  tabs: [
    { to: ROUTES.platformFinance, labelKey: 'platformAdmin.hub.overview', end: true },
    { to: ROUTES.platformFinanceIncome, labelKey: 'platformAdmin.hub.income', end: true },
    { to: ROUTES.platformExpenses, labelKey: 'platformAdmin.hub.expenses', end: true },
    { to: ROUTES.platformPnl, labelKey: 'platformAdmin.hub.pnl', end: true },
    {
      to: ROUTES.platformAnalytics,
      labelKey: 'platformAdmin.hub.analytics',
      matchPrefix: [ROUTES.platformAnalytics],
    },
  ],
};

export const PLATFORM_ONBOARDING_HUB: PlatformHub = {
  ariaLabelKey: 'platformAdmin.hub.onboardingAria',
  tabs: [
    { to: ROUTES.platformOnboarding, labelKey: 'platformAdmin.hub.analytics', end: true },
    { to: ROUTES.platformOnboardingQuestions, labelKey: 'platformAdmin.hub.questions', end: true },
    { to: ROUTES.platformOnboardingAnswers, labelKey: 'platformAdmin.hub.answers', end: true },
    { to: ROUTES.platformOnboardingNeeds, labelKey: 'platformAdmin.hub.needs', end: true },
    { to: ROUTES.platformOnboardingSolutions, labelKey: 'platformAdmin.hub.solutions', end: true },
  ],
};

export const PLATFORM_REFERRAL_HUB: PlatformHub = {
  ariaLabelKey: 'platformAdmin.hub.referralAria',
  tabs: [
    { to: ROUTES.platformReferral, labelKey: 'platformAdmin.hub.overview', end: true },
    { to: ROUTES.platformReferralUsers, labelKey: 'platformAdmin.hub.users', end: true },
    { to: ROUTES.platformReferralWithdrawals, labelKey: 'platformAdmin.hub.withdrawals', end: true },
    { to: ROUTES.platformReferralSettings, labelKey: 'platformAdmin.hub.settings', end: true },
  ],
};

export const PLATFORM_TELEGRAM_HUB: PlatformHub = {
  ariaLabelKey: 'platformAdmin.hub.telegramAria',
  tabs: [
    { to: ROUTES.platformTelegram, labelKey: 'platformAdmin.hub.overview', end: true },
    { to: ROUTES.platformTelegramBot, labelKey: 'platformAdmin.hub.bot', end: true },
    { to: ROUTES.platformTelegramStart, labelKey: 'platformAdmin.hub.startMessage', end: true },
    { to: ROUTES.platformTelegramMenu, labelKey: 'platformAdmin.hub.menu', end: true },
    { to: ROUTES.platformTelegramBroadcast, labelKey: 'platformAdmin.hub.broadcast', end: true },
    { to: ROUTES.platformTelegramAutomations, labelKey: 'platformAdmin.hub.automations', end: true },
    { to: ROUTES.platformTelegramStats, labelKey: 'platformAdmin.hub.stats', end: true },
  ],
};

export const PLATFORM_USAGE_HUB: PlatformHub = {
  ariaLabelKey: 'platformAdmin.hub.usageAria',
  tabs: [
    { to: ROUTES.platformUsage, labelKey: 'platformAdmin.hub.overview', end: true },
    { to: ROUTES.platformUsageUsers, labelKey: 'platformAdmin.hub.users', matchPrefix: [ROUTES.platformUsageUsers] },
    { to: ROUTES.platformUsageSessions, labelKey: 'platformAdmin.usage.sessions', end: true },
    { to: ROUTES.platformUsageFeatures, labelKey: 'platformAdmin.usage.features', end: true },
    { to: ROUTES.platformUsageRetention, labelKey: 'platformAdmin.usage.retention', end: true },
  ],
};

export const PLATFORM_SETTINGS_HUB: PlatformHub = {
  ariaLabelKey: 'platformAdmin.hub.settingsAria',
  tabs: [
    { to: ROUTES.platformSettings, labelKey: 'platformAdmin.hub.general', end: true },
    { to: ROUTES.platformAccountDeletions, labelKey: 'platformAdmin.hub.deletions', end: true },
  ],
};

const HUBS: readonly { prefixes: readonly string[]; hub: PlatformHub }[] = [
  {
    prefixes: [
      ROUTES.platformAccounts,
      ROUTES.platformStoreRequests,
      ROUTES.platformShops,
      ROUTES.adminStores,
      ROUTES.platformPersonal,
    ],
    hub: PLATFORM_ACCOUNT_HUB,
  },
  {
    prefixes: [
      ROUTES.platformSubscriptions,
      ROUTES.platformSubscriptionRequests,
      ROUTES.adminSubscriptionRequests,
      ROUTES.platformPayments,
      ROUTES.platformPlans,
    ],
    hub: PLATFORM_SUBSCRIPTION_HUB,
  },
  {
    prefixes: [
      ROUTES.platformFinance,
      ROUTES.platformFinanceIncome,
      ROUTES.platformExpenses,
      ROUTES.platformPnl,
      ROUTES.platformAnalytics,
    ],
    hub: PLATFORM_FINANCE_HUB,
  },
  {
    prefixes: [ROUTES.platformOnboarding],
    hub: PLATFORM_ONBOARDING_HUB,
  },
  {
    prefixes: [
      ROUTES.platformReferral,
      ROUTES.platformReferralUsers,
      ROUTES.platformReferralWithdrawals,
      ROUTES.platformReferralSettings,
    ],
    hub: PLATFORM_REFERRAL_HUB,
  },
  {
    prefixes: [ROUTES.platformTelegram],
    hub: PLATFORM_TELEGRAM_HUB,
  },
  {
    prefixes: [ROUTES.platformUsage],
    hub: PLATFORM_USAGE_HUB,
  },
  {
    prefixes: [ROUTES.platformSettings, ROUTES.platformAccountDeletions],
    hub: PLATFORM_SETTINGS_HUB,
  },
];

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function hubForPath(pathname: string): PlatformHub | undefined {
  const matches = HUBS.filter((entry) =>
    entry.prefixes.some((prefix) => pathMatchesPrefix(pathname, prefix)),
  );
  if (matches.length === 0) return undefined;
  const ranked = [...matches].sort((a, b) => {
    const aLen = Math.max(
      ...a.prefixes.filter((prefix) => pathMatchesPrefix(pathname, prefix)).map((prefix) => prefix.length),
    );
    const bLen = Math.max(
      ...b.prefixes.filter((prefix) => pathMatchesPrefix(pathname, prefix)).map((prefix) => prefix.length),
    );
    return bLen - aLen;
  });
  return ranked[0]?.hub;
}
