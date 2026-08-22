import { WorkerResponsibility } from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { ResponsibilityPicker } from '@/features/workers/components/ResponsibilityPicker';
import { useCreateWorker } from '@/features/workers/hooks/use-workers';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function NewWorkerPage() {
  const navigate = useNavigate();
  const createWorker = useCreateWorker();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [responsibilities, setResponsibilities] = useState<WorkerResponsibility[]>([
    WorkerResponsibility.ASSEMBLER,
  ]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      const worker = await createWorker.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        phone: phone.trim() || undefined,
        password,
        responsibilities,
        isActive,
        notes: notes.trim() || undefined,
      });
      navigate(ROUTES.workerDetail(worker.id));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not create worker');
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">New worker</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Create a login for this store. One account can hold several responsibilities.
        </p>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <SectionCard title="Identity">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="worker-first-name" className="block text-sm font-medium text-ink">
                First name
              </label>
              <input
                id="worker-first-name"
                className={fieldClass}
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="worker-last-name" className="block text-sm font-medium text-ink">
                Last name
              </label>
              <input
                id="worker-last-name"
                className={fieldClass}
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="worker-username" className="block text-sm font-medium text-ink">
                Username
              </label>
              <input
                id="worker-username"
                className={fieldClass}
                required
                autoComplete="off"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="worker-phone" className="block text-sm font-medium text-ink">
                Phone
              </label>
              <input
                id="worker-phone"
                className={fieldClass}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="worker-password" className="block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="worker-password"
                className={fieldClass}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="text-xs text-ink-muted">
                Passwords are hashed. They are never shown again after save.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Responsibilities">
          <ResponsibilityPicker value={responsibilities} onChange={setResponsibilities} />
        </SectionCard>

        <SectionCard title="Status & notes">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Active (can sign in and receive assignments)
            </label>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">Notes</label>
              <textarea
                className={`${fieldClass} min-h-24`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        {error ? (
          <p role="alert" className="rounded-input border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={createWorker.isPending || responsibilities.length === 0}
            className="inline-flex items-center gap-2 rounded-input bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {createWorker.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create worker
          </button>
          <Link
            to={ROUTES.workers}
            className="rounded-input border border-line px-4 py-2.5 text-sm text-ink-soft hover:bg-surface-hover"
          >
            Cancel
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
