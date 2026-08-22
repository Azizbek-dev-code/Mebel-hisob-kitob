import type { WorkerResponsibility } from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResponsibilityPicker } from '@/features/workers/components/ResponsibilityPicker';
import { useUpdateWorker, useWorker } from '@/features/workers/hooks/use-workers';
import { splitName } from '@/features/workers/utils/name';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function WorkerEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const worker = useWorker(id);
  const updateWorker = useUpdateWorker(id);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [responsibilities, setResponsibilities] = useState<WorkerResponsibility[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!worker.data) return;
    const names = splitName(worker.data.fullName);
    setFirstName(names.firstName);
    setLastName(names.lastName);
    setPhone(worker.data.phone ?? '');
    setNotes(worker.data.notes ?? '');
    setIsActive(worker.data.isActive);
    setResponsibilities(worker.data.responsibilities);
  }, [worker.data]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await updateWorker.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        isActive,
        responsibilities,
      });
      navigate(ROUTES.workerDetail(id));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save worker');
    }
  }

  if (worker.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Could not load worker"
          message={worker.error instanceof Error ? worker.error.message : 'Try again.'}
          onRetry={() => void worker.refetch()}
        />
      </PageContainer>
    );
  }

  if (worker.isLoading || !worker.data) {
    return (
      <PageContainer>
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Edit worker</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Username stays stable so historical sales keep the same identity.
        </p>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <SectionCard title="Profile">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">First name</label>
              <input
                className={fieldClass}
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Last name</label>
              <input
                className={fieldClass}
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Username</label>
              <input className={fieldClass} value={worker.data.username ?? ''} disabled />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Phone</label>
              <input
                className={fieldClass}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-ink">Notes</label>
              <textarea
                className={`${fieldClass} min-h-24`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Responsibilities">
          <ResponsibilityPicker value={responsibilities} onChange={setResponsibilities} />
        </SectionCard>

        <SectionCard title="Account status">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
        </SectionCard>

        {error ? (
          <p role="alert" className="text-sm text-danger-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={updateWorker.isPending || responsibilities.length === 0}
            className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {updateWorker.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </button>
          <Link
            to={ROUTES.workerDetail(id)}
            className="rounded-input border border-line px-4 py-2.5 text-sm text-ink-soft hover:bg-surface-hover"
          >
            Cancel
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
