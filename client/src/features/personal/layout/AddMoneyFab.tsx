import { PersonalEntryType } from '@furniture-erp/shared';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';

import { AddMoneySheet } from '../ledger/components/AddMoneySheet';

const SUBSCRIPTION_REQUIRED = 'furniture-erp:subscription-required';

export function AddMoneyFab() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const canWrite = Boolean(user?.subscription?.canWrite);

  function openSheet(tab: 'INCOME' | 'EXPENSE') {
    if (!canWrite) {
      window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REQUIRED));
      return;
    }
    setInitialTab(tab);
    setOpen(true);
  }

  return (
    <>
      <div className="fixed z-50 flex flex-col gap-2 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:right-8 md:bottom-8">
        <button
          type="button"
          onClick={() => openSheet('INCOME')}
          className="flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-overlay hover:bg-emerald-700"
          aria-label={t('personal.addIncomeFab')}
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => openSheet('EXPENSE')}
          className="flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-overlay hover:bg-brand-600"
          aria-label={t('personal.addExpenseFab')}
        >
          <Minus className="size-6" aria-hidden="true" />
        </button>
      </div>
      {canWrite ? (
        <AddMoneySheet
          open={open}
          onClose={() => setOpen(false)}
          initialTab={initialTab === 'INCOME' ? PersonalEntryType.INCOME : PersonalEntryType.EXPENSE}
        />
      ) : null}
    </>
  );
}
