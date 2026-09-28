import type {
  CreateSmmPersonaRequest,
  SmmPersonaDetail,
  SmmPersonaListItem,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';

import {
  useCreateSmmPersona,
  useSmmAudience,
  useSmmPersonaDetail,
  useUpdateSmmPersona,
} from '../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface PersonaFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  persona?: SmmPersonaListItem | SmmPersonaDetail | null;
  defaultSegmentId?: string | null;
  onSaved?: () => void;
}

export function PersonaFormDialog({
  open,
  onClose,
  projectId,
  persona = null,
  defaultSegmentId,
  onSaved,
}: PersonaFormDialogProps) {
  const create = useCreateSmmPersona(projectId);
  const update = useUpdateSmmPersona(projectId);
  const segments = useSmmAudience(projectId, { pageSize: 100 }, open);
  const detailQuery = useSmmPersonaDetail(
    projectId,
    persona?.id ?? null,
    open && Boolean(persona?.id),
  );
  const pending = create.isPending || update.isPending;
  const detail = detailQuery.data ?? (persona && 'problems' in persona ? persona : null);

  const [name, setName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [income, setIncome] = useState('');
  const [problems, setProblems] = useState('');
  const [needs, setNeeds] = useState('');
  const [motivation, setMotivation] = useState('');
  const [objections, setObjections] = useState('');
  const [preferredContent, setPreferredContent] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const source = detail ?? persona;
    setName(source?.name ?? '');
    setSegmentId(source?.segmentId ?? defaultSegmentId ?? '');
    setAgeRange(source?.ageRange ?? '');
    setGender(source?.gender ?? '');
    setOccupation(source?.occupation ?? '');
    if (detail) {
      setLocation(detail.location ?? '');
      setIncome(detail.income ?? '');
      setProblems(detail.problems ?? '');
      setNeeds(detail.needs ?? '');
      setMotivation(detail.motivation ?? '');
      setObjections(detail.objections ?? '');
      setPreferredContent(detail.preferredContent ?? '');
      setNotes(detail.notes ?? '');
    } else if (!persona) {
      setLocation('');
      setIncome('');
      setProblems('');
      setNeeds('');
      setMotivation('');
      setObjections('');
      setPreferredContent('');
      setNotes('');
    }
  }, [open, persona, detail, defaultSegmentId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Nom majburiy');
      return;
    }
    const body: CreateSmmPersonaRequest = {
      name: name.trim(),
      segmentId: segmentId || null,
      ageRange: ageRange.trim() || null,
      gender: gender.trim() || null,
      location: location.trim() || null,
      occupation: occupation.trim() || null,
      income: income.trim() || null,
      problems: problems.trim() || null,
      needs: needs.trim() || null,
      motivation: motivation.trim() || null,
      objections: objections.trim() || null,
      preferredContent: preferredContent.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (persona) await update.mutateAsync({ personaId: persona.id, body });
      else await create.mutateAsync(body);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={persona ? 'Personani tahrirlash' : 'Yangi persona'} className="sm:max-w-xl">
      <form className="max-h-[70vh] space-y-3 overflow-y-auto pr-1" onSubmit={(e) => void handleSubmit(e)}>
        {persona && detailQuery.isLoading ? (
          <p className="text-sm text-ink-muted">Yuklanmoqda…</p>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Ism *</span>
          <input className={FIELD_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Segment</span>
          <select className={FIELD_CLASS} value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
            <option value="">—</option>
            {(segments.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Yosh</span>
            <input className={FIELD_CLASS} value={ageRange} onChange={(e) => setAgeRange(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Jins</span>
            <input className={FIELD_CLASS} value={gender} onChange={(e) => setGender(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Joylashuv</span>
            <input className={FIELD_CLASS} value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Kasb</span>
            <input className={FIELD_CLASS} value={occupation} onChange={(e) => setOccupation(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Daromad</span>
            <input className={FIELD_CLASS} value={income} onChange={(e) => setIncome(e.target.value)} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Muammolar</span>
          <textarea className={FIELD_CLASS} rows={2} value={problems} onChange={(e) => setProblems(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Ehtiyojlar</span>
          <textarea className={FIELD_CLASS} rows={2} value={needs} onChange={(e) => setNeeds(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Motivatsiya</span>
          <textarea className={FIELD_CLASS} rows={2} value={motivation} onChange={(e) => setMotivation(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">E’tirozlar</span>
          <textarea className={FIELD_CLASS} rows={2} value={objections} onChange={(e) => setObjections(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Afzal kontent</span>
          <textarea className={FIELD_CLASS} rows={2} value={preferredContent} onChange={(e) => setPreferredContent(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Izoh</span>
          <textarea className={FIELD_CLASS} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={BTN_SECONDARY} onClick={onClose}>Bekor</button>
          <button type="submit" className={BTN_PRIMARY} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Saqlash
          </button>
        </div>
      </form>
    </Dialog>
  );
}
