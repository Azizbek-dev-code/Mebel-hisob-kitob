import type { PersonalWalletKind } from '@furniture-erp/shared';
import { Banknote, CreditCard, Landmark, PiggyBank, Smartphone, Wallet } from 'lucide-react';

const ICONS: Record<PersonalWalletKind, typeof Wallet> = {
  CASH: Banknote,
  CARD: CreditCard,
  UZCARD: CreditCard,
  HUMO: CreditCard,
  PAYME: Smartphone,
  CLICK: Smartphone,
  BANK: Landmark,
  SAVINGS: PiggyBank,
  OTHER: Wallet,
};

export function WalletKindIcon({
  kind,
  className = 'size-4',
}: {
  kind: PersonalWalletKind;
  className?: string;
}) {
  const Icon = ICONS[kind] ?? Wallet;
  return <Icon className={className} aria-hidden="true" />;
}
