import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Clock,
  History,
  LineChart,
  Settings,
  Store,
  Tags,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { PlatformComingSoonPage } from './PlatformComingSoonPage';

export function PlatformPaymentsHistoryPage() {
  return (
    <PlatformComingSoonPage
      icon={History}
      title="To'lov tarixi"
      description="Do'kon obuna to'lovlari shu yerda ko'rinadi. Hisob-kitob moduli keyingi bosqichda ulanadi."
    />
  );
}

export function PlatformPaymentsPendingPage() {
  return (
    <PlatformComingSoonPage
      icon={Clock}
      title="Kutilayotgan to'lovlar"
      description="Hali tasdiqlanmagan platforma to'lovlari shu yerda turadi."
    />
  );
}

export function PlatformPaymentsOverduePage() {
  return (
    <PlatformComingSoonPage
      icon={AlertTriangle}
      title="Muddati o'tgan to'lovlar"
      description="Muddati o'tgan obuna to'lovlari shu ro'yxatda yig'iladi."
    />
  );
}

export function PlatformPlansPage() {
  return (
    <PlatformComingSoonPage
      icon={Tags}
      title="Tariflar"
      description="Do'kon tariflari va narxlari shu yerda boshqariladi."
    />
  );
}

export function PlatformExpensesPage() {
  return (
    <PlatformComingSoonPage
      icon={Wallet}
      title="Platforma xarajatlari"
      description="Bu do'kon xarajatlari emas — faqat platforma darajasidagi xarajatlar."
    />
  );
}

export function PlatformPnlPage() {
  return (
    <PlatformComingSoonPage
      icon={LineChart}
      title="Daromad / P&L"
      description="Platforma daromadi, xarajati va sof foydasi. Do'kon P&L o'z ADMIN panelida qoladi."
    />
  );
}

export function PlatformAnalyticsPage() {
  return (
    <PlatformComingSoonPage
      icon={BarChart3}
      title="Analytics"
      description="Platforma ko'rsatkichlari: yangi do'konlar, daromad, xarajat va sof foyda."
    />
  );
}

export function PlatformAnalyticsStoresPage() {
  return (
    <PlatformComingSoonPage
      icon={Store}
      title="Yangi do'konlar"
      description="Tasdiqlangan yangi do'konlar bo'yicha analitika."
    />
  );
}

export function PlatformAnalyticsRevenuePage() {
  return (
    <PlatformComingSoonPage
      icon={CircleDollarSign}
      title="Daromad"
      description="Platforma obuna daromadi analitikasi."
    />
  );
}

export function PlatformAnalyticsExpensesPage() {
  return (
    <PlatformComingSoonPage
      icon={Wallet}
      title="Xarajat"
      description="Platforma xarajatlari analitikasi."
    />
  );
}

export function PlatformAnalyticsProfitPage() {
  return (
    <PlatformComingSoonPage
      icon={TrendingUp}
      title="Sof foyda"
      description="Platforma sof foydasi analitikasi."
    />
  );
}

export function PlatformSettingsPage() {
  return (
    <PlatformComingSoonPage
      icon={Settings}
      title="Platform Settings"
      description="Platforma sozlamalari. Do'kon sozlamalaridan alohida."
    />
  );
}
