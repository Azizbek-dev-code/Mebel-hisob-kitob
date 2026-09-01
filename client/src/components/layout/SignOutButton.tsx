import { Loader2, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useLogout } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/cn';

export interface SignOutButtonProps {
  className?: string;
  /** Closes whatever surface the button was rendered in — a drawer or the account menu. */
  onSignedOut?: () => void;
}

/**
 * The one way out of the application.
 *
 * The sidebar and the account menu both offer it, but they share this component so
 * there is a single logout call and a single place where its pending state lives.
 */
export function SignOutButton({ className, onSignedOut }: SignOutButtonProps) {
  const { t } = useTranslation();
  const logout = useLogout();

  return (
    <button
      type="button"
      onClick={() => logout.mutate(undefined, { onSettled: onSignedOut })}
      disabled={logout.isPending}
      className={cn(
        'flex w-full items-center gap-3 rounded-input px-3 py-2 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {logout.isPending ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4 shrink-0" aria-hidden="true" />
      )}
      {t('auth.logout')}
    </button>
  );
}
