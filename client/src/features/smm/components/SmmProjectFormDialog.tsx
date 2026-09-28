import {
  SMM_PROJECT_STATUSES,
  SMM_PROJECT_STATUS_LABELS,
  SmmProjectStatus,
  type CreateSmmProjectRequest,
  type SmmProjectDetail,
  type SmmProjectListItem,
  type SmmProjectStatus as SmmProjectStatusType,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';
import { parseMoneyInput } from '@/utils/format';

import { useCreateSmmProject, useUpdateSmmProject } from '../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface SmmProjectFormDialogProps {
  open: boolean;
  onClose: () => void;
  project?: SmmProjectListItem | SmmProjectDetail | null;
  onSaved?: (project: SmmProjectDetail) => void;
}

export function SmmProjectFormDialog({
  open,
  onClose,
  project = null,
  onSaved,
}: SmmProjectFormDialogProps) {
  const isEdit = Boolean(project);
  const createProject = useCreateSmmProject();
  const updateProject = useUpdateSmmProject(project?.id ?? '');
  const pending = createProject.isPending || updateProject.isPending;

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<SmmProjectStatusType>(SmmProjectStatus.ACTIVE);
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (project) {
      setName(project.name);
      setClientName(project.clientName ?? '');
      setDescription('description' in project ? (project.description ?? '') : '');
      setStatus(project.status === SmmProjectStatus.ARCHIVED ? SmmProjectStatus.ACTIVE : project.status);
      setBudget(project.budgetPlanned != null ? String(project.budgetPlanned) : '');
      setStartDate(project.startDate?.slice(0, 10) ?? '');
      setEndDate(project.endDate?.slice(0, 10) ?? '');
      setNotes('notes' in project ? (project.notes ?? '') : '');
    } else {
      setName('');
      setClientName('');
      setDescription('');
      setStatus(SmmProjectStatus.ACTIVE);
      setBudget('');
      setStartDate('');
      setEndDate('');
      setNotes('');
    }
  }, [open, project]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Loyiha nomini kiriting');
      return;
    }
    const budgetValue = budget.trim() ? parseMoneyInput(budget) : null;
    if (budget.trim() && budgetValue === null) {
      setError('Byudjet noto‘g‘ri');
      return;
    }

    const body: CreateSmmProjectRequest = {
      name: name.trim(),
      clientName: clientName.trim() || null,
      description: description.trim() || null,
      status,
      budgetPlanned: budgetValue,
      startDate: startDate || null,
      endDate: endDate || null,
      notes: notes.trim() || null,
    };

    try {
      const saved = isEdit && project
        ? await updateProject.mutateAsync(body)
        : await createProject.mutateAsync(body);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi');
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Loyihani tahrirlash' : 'Yangi SMM loyiha'}
      description="Mijoz va byudjet ma’lumotlarini kiriting"
      className="sm:max-w-xl"
    >
      <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Nomi *</span>
          <input className={FIELD_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Mijoz</span>
          <input
            className={FIELD_CLASS}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Tavsif</span>
          <textarea
            className={FIELD_CLASS}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Holat</span>
            <select
              className={FIELD_CLASS}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              {SMM_PROJECT_STATUSES.filter((s) => s !== SmmProjectStatus.ARCHIVED).map((s) => (
                <option key={s} value={s}>
                  {SMM_PROJECT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Rejalashtirilgan byudjet</span>
            <input
              className={FIELD_CLASS}
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="so‘m"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Boshlanish</span>
            <input
              type="date"
              className={FIELD_CLASS}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Tugash</span>
            <input
              type="date"
              className={FIELD_CLASS}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Izoh</span>
          <textarea
            className={FIELD_CLASS}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className={BTN_SECONDARY} onClick={onClose} disabled={pending}>
            Bekor qilish
          </button>
          <button type="submit" className={BTN_PRIMARY} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Saqlash
          </button>
        </div>
      </form>
    </Dialog>
  );
}
