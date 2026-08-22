import { Sofa, UserPlus, Wallet, ShoppingCart } from 'lucide-react';

import { SectionCard } from '@/components/ui/SectionCard';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ROUTES } from '@/routes/paths';

const ACTIONS = [
  {
    label: 'New sale',
    description: 'Record a furniture sale',
    to: ROUTES.saleNew,
    icon: ShoppingCart,
    feature: 'sales',
  },
  {
    label: 'Add expense',
    description: 'Record a business expense',
    to: ROUTES.expenses,
    icon: Wallet,
    feature: 'expenses',
  },
  {
    label: 'Add customer',
    description: 'Open the customer catalogue',
    to: ROUTES.customers,
    icon: UserPlus,
    feature: 'customers',
  },
  {
    label: 'Add furniture',
    description: 'Open the furniture catalogue',
    to: ROUTES.products,
    icon: Sofa,
    feature: 'products',
  },
] as const;

/**
 * Shortcuts into the modules that own common daily tasks.
 */
export function QuickActions() {
  return (
    <SectionCard title="Quick actions" description="Jump straight to the work you need">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <WriteGuard
              key={action.to + action.label}
              to={action.to}
              feature={action.feature}
              className="group flex flex-col items-start gap-2 rounded-card border border-line bg-surface-muted px-3 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50"
            >
              <span className="flex size-8 items-center justify-center rounded-input bg-surface text-ink-soft shadow-card transition-colors group-hover:text-brand-600">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium text-ink">{action.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{action.description}</span>
              </span>
            </WriteGuard>
          );
        })}
      </div>
    </SectionCard>
  );
}
