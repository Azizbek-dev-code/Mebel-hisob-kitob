import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

import { SessionPanel } from '@/features/auth/components/SessionPanel';

import { useHealth } from '../hooks/use-health';

/**
 * The stack diagnostics screen, at `/system`.
 *
 * It exists to prove the full stack is wired together — the browser reaches the
 * API through the dev proxy, the response flows through TanStack Query, and the
 * design tokens render. It sits outside the application shell on purpose: it has
 * to keep working when the shell or the session is what is broken.
 */
export function SystemCheckPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useHealth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-8 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-input bg-brand-500 text-white">
            <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
              <path
                d="M8 13.5a2.5 2.5 0 0 1 5 0V17h6v-3.5a2.5 2.5 0 0 1 5 0V22h-2.5v-2.5h-11V22H8z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-ink">Furniture ERP</h1>
            <p className="text-sm text-ink-muted">Foundation check</p>
          </div>
        </div>

        <div className="mt-6 rounded-card border border-line bg-surface-muted p-4">
          {isPending ? (
            <StatusRow
              icon={<Loader2 className="size-4 animate-spin text-ink-subtle" />}
              label="Contacting the API…"
            />
          ) : isError ? (
            <div className="space-y-2">
              <StatusRow
                icon={<AlertCircle className="size-4 text-danger-500" />}
                label="API unreachable"
                tone="danger"
              />
              <p className="text-sm text-ink-muted">{error.message}</p>
              <p className="text-xs text-ink-subtle">
                Start the API with <code className="font-mono">npm run dev:server</code>.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <StatusRow
                icon={<CheckCircle2 className="size-4 text-success-600" />}
                label="API connected"
                tone="success"
              />
              <dl className="space-y-1.5 text-sm">
                <DetailRow term="Environment" description={data.environment} />
                <DetailRow term="Version" description={data.version} />
                <DetailRow term="Uptime" description={`${data.uptimeSeconds}s`} />
              </dl>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} />
          Re-check connection
        </button>

        <div className="mt-6">
          <SessionPanel />
        </div>
      </div>
    </main>
  );
}

function StatusRow({
  icon,
  label,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success-700'
      : tone === 'danger'
        ? 'text-danger-700'
        : 'text-ink-soft';

  return (
    <p className={`flex items-center gap-2 text-sm font-medium ${toneClass}`}>
      {icon}
      {label}
    </p>
  );
}

function DetailRow({ term, description }: { term: string; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{term}</dt>
      <dd className="font-medium text-ink">{description}</dd>
    </div>
  );
}
