import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, LogIn, User } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { useLogin } from '../hooks/use-auth';

const loginFormSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your username or email'),
  password: z.string().min(1, 'Enter your password'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();

  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const identifierId = useId();
  const passwordId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const isSubmitting = login.isPending;
  const authError = login.error ? describeLoginFailure(login.error) : null;

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => {
        navigate(returnPathFrom(location.state), { replace: true });
      },
    });
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-card bg-brand-500 text-white shadow-raised">
            <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
              <path
                d="M8 13.5a2.5 2.5 0 0 1 5 0V17h6v-3.5a2.5 2.5 0 0 1 5 0V22h-2.5v-2.5h-11V22H8z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Furniture ERP</h1>
            <p className="mt-1 text-sm text-ink-muted">Sales, customers and accounting</p>
          </div>
        </div>

        <div className="mt-7 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          <h2 className="text-base font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-ink-muted">Enter your details to open the workspace.</p>

          {authError ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-input border border-danger-100 bg-danger-50 p-3"
            >
              <AlertCircle className="mt-px size-4 shrink-0 text-danger-500" aria-hidden="true" />
              <p className="text-sm text-danger-700">{authError}</p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
            <Field
              id={identifierId}
              label="Username or email"
              error={errors.identifier?.message}
              icon={<User className="size-4" aria-hidden="true" />}
            >
              <input
                {...register('identifier')}
                id={identifierId}
                type="text"
                autoComplete="username"
                autoFocus
                spellCheck={false}
                disabled={isSubmitting}
                placeholder="admin"
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? `${identifierId}-error` : undefined}
                className={inputClassName(Boolean(errors.identifier))}
              />
            </Field>

            <Field
              id={passwordId}
              label="Password"
              error={errors.password?.message}
              icon={<Lock className="size-4" aria-hidden="true" />}
            >
              <input
                {...register('password')}
                id={passwordId}
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isSubmitting}
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? `${passwordId}-error` : undefined}
                className={cn(inputClassName(Boolean(errors.password)), 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                // The label already names the field; this control only toggles how
                // it is rendered, so it stays out of the tab order of the form flow.
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                aria-pressed={isPasswordVisible}
                className="absolute inset-y-0 right-0 flex items-center rounded-r-input px-3 text-ink-subtle transition-colors hover:text-ink-soft"
              >
                {isPasswordVisible ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </Field>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogIn className="size-4" aria-hidden="true" />
              )}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link to={ROUTES.registerStore} className="font-medium text-brand-700 hover:underline">
            Yangi do&apos;kon ochish
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-ink-subtle">
          Lost your password? Ask a store administrator to reset it.
        </p>
      </div>
    </main>
  );
}

function inputClassName(hasError: boolean): string {
  return cn(
    'w-full rounded-input border bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink transition-colors',
    'placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted',
    hasError ? 'border-danger-500' : 'border-line-strong hover:border-ink-subtle',
  );
}

function Field({
  id,
  label,
  error,
  icon,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-subtle">
          {icon}
        </span>
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The API answers every bad sign-in with the same wording on purpose, so this
 * only has to pick the most specific message available rather than interpret it.
 */
function describeLoginFailure(error: Error): string {
  if (error instanceof ApiClientError) {
    if (error.isValidationError && error.details?.length) {
      return error.details[0]?.message ?? error.message;
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Where to land after signing in. The value comes from our own route guard, but
 * it is still checked: a path that leaves the app would turn the login form into
 * an open redirect the moment anything else learns how to set this state.
 */
function returnPathFrom(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  const isInternalPath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//');
  return isInternalPath ? from : ROUTES.dashboard;
}
