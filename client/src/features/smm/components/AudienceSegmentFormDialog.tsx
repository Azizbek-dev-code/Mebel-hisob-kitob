import {
  SMM_INSIGHT_SOURCE_LABELS,
  SMM_INSIGHT_SOURCES,
  SmmInsightSource,
  type CreateSmmAudienceSegmentRequest,
  type SmmAudienceSegmentDetail,
  type SmmAudienceSegmentListItem,
  type SmmInsightNote,
  type SmmInsightSource as SmmInsightSourceType,
} from '@furniture-erp/shared';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';

import { useCreateSmmAudience, useUpdateSmmAudience } from '../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface AudienceSegmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  segment?: SmmAudienceSegmentListItem | SmmAudienceSegmentDetail | null;
  onSaved?: () => void;
}

function emptyInsight(): SmmInsightNote {
  return { text: '', source: SmmInsightSource.OTHER };
}

export function AudienceSegmentFormDialog({
  open,
  onClose,
  projectId,
  segment = null,
  onSaved,
}: AudienceSegmentFormDialogProps) {
  const create = useCreateSmmAudience(projectId);
  const update = useUpdateSmmAudience(projectId);
  const pending = create.isPending || update.isPending;

  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [income, setIncome] = useState('');
  const [occupation, setOccupation] = useState('');
  const [interests, setInterests] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [needs, setNeeds] = useState('');
  const [desires, setDesires] = useState('');
  const [objections, setObjections] = useState('');
  const [buyingMotivation, setBuyingMotivation] = useState('');
  const [buyingBehavior, setBuyingBehavior] = useState('');
  const [contentPreferences, setContentPreferences] = useState('');
  const [researchSources, setResearchSources] = useState('');
  const [notes, setNotes] = useState('');
  const [insights, setInsights] = useState<SmmInsightNote[]>([emptyInsight()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(segment?.name ?? '');
    setAgeRange(segment?.ageRange ?? '');
    setGender(segment?.gender ?? '');
    setLocation(segment?.location ?? '');
    const detail = segment && 'interests' in segment ? (segment as SmmAudienceSegmentDetail) : null;
    setIncome(detail?.income ?? '');
    setOccupation(detail?.occupation ?? '');
    setInterests(detail?.interests?.join(', ') ?? '');
    setPainPoints(detail?.painPoints ?? '');
    setNeeds(detail?.needs ?? '');
    setDesires(detail?.desires ?? '');
    setObjections(detail?.objections ?? '');
    setBuyingMotivation(detail?.buyingMotivation ?? '');
    setBuyingBehavior(detail?.buyingBehavior ?? '');
    setContentPreferences(detail?.contentPreferences ?? '');
    setResearchSources(detail?.researchSources ?? '');
    setNotes(detail?.notes ?? '');
    setInsights(
      detail?.insights?.length
        ? detail.insights.map((i) => ({
            text: i.text,
            source: (i.source as SmmInsightSourceType) || SmmInsightSource.OTHER,
          }))
        : [emptyInsight()],
    );
  }, [open, segment]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Nom majburiy');
      return;
    }
    const cleanedInsights = insights
      .map((i) => ({
        text: i.text.trim(),
        source: i.source || null,
      }))
      .filter((i) => i.text.length > 0);

    const body: CreateSmmAudienceSegmentRequest = {
      name: name.trim(),
      ageRange: ageRange.trim() || null,
      gender: gender.trim() || null,
      location: location.trim() || null,
      income: income.trim() || null,
      occupation: occupation.trim() || null,
      interests: interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      painPoints: painPoints.trim() || null,
      needs: needs.trim() || null,
      desires: desires.trim() || null,
      objections: objections.trim() || null,
      buyingMotivation: buyingMotivation.trim() || null,
      buyingBehavior: buyingBehavior.trim() || null,
      contentPreferences: contentPreferences.trim() || null,
      researchSources: researchSources.trim() || null,
      notes: notes.trim() || null,
      insights: cleanedInsights,
    };
    try {
      if (segment) {
        await update.mutateAsync({ segmentId: segment.id, body });
      } else {
        await create.mutateAsync(body);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi');
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={segment ? 'Segmentni tahrirlash' : 'Yangi auditoriya segmenti'}
      className="sm:max-w-2xl"
    >
      <form className="max-h-[70vh] space-y-3 overflow-y-auto pr-1" onSubmit={(e) => void handleSubmit(e)}>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Nomi *</span>
          <input className={FIELD_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Yosh</span>
            <input className={FIELD_CLASS} value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="25-34" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Jins</span>
            <input className={FIELD_CLASS} value={gender} onChange={(e) => setGender(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Joylashuv</span>
            <input className={FIELD_CLASS} value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Daromad</span>
            <input className={FIELD_CLASS} value={income} onChange={(e) => setIncome(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Kasb</span>
            <input className={FIELD_CLASS} value={occupation} onChange={(e) => setOccupation(e.target.value)} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Qiziqishlar (vergul bilan)</span>
          <input className={FIELD_CLASS} value={interests} onChange={(e) => setInterests(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Muammolar</span>
          <textarea className={FIELD_CLASS} rows={2} value={painPoints} onChange={(e) => setPainPoints(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Ehtiyojlar</span>
          <textarea className={FIELD_CLASS} rows={2} value={needs} onChange={(e) => setNeeds(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Istaklar</span>
          <textarea className={FIELD_CLASS} rows={2} value={desires} onChange={(e) => setDesires(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">E’tirozlar</span>
          <textarea className={FIELD_CLASS} rows={2} value={objections} onChange={(e) => setObjections(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Xarid motivatsiyasi</span>
          <textarea className={FIELD_CLASS} rows={2} value={buyingMotivation} onChange={(e) => setBuyingMotivation(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Xarid xulqi</span>
          <textarea className={FIELD_CLASS} rows={2} value={buyingBehavior} onChange={(e) => setBuyingBehavior(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Kontent afzalliklari</span>
          <textarea className={FIELD_CLASS} rows={2} value={contentPreferences} onChange={(e) => setContentPreferences(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Tadqiqot manbalari</span>
          <textarea className={FIELD_CLASS} rows={2} value={researchSources} onChange={(e) => setResearchSources(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Izoh</span>
          <textarea className={FIELD_CLASS} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Insightlar</span>
            <button
              type="button"
              className={BTN_SECONDARY}
              onClick={() => setInsights((prev) => [...prev, emptyInsight()])}
            >
              <Plus className="size-4" />
              Qo‘shish
            </button>
          </div>
          {insights.map((insight, index) => (
            <div key={index} className="grid gap-2 rounded-input border border-line p-2 sm:grid-cols-[1fr_10rem_auto]">
              <input
                className={FIELD_CLASS}
                placeholder="Matn"
                value={insight.text}
                onChange={(e) =>
                  setInsights((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, text: e.target.value } : row)),
                  )
                }
              />
              <select
                className={FIELD_CLASS}
                value={(insight.source as string) || SmmInsightSource.OTHER}
                onChange={(e) =>
                  setInsights((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? { ...row, source: e.target.value as SmmInsightSourceType }
                        : row,
                    ),
                  )
                }
              >
                {SMM_INSIGHT_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {SMM_INSIGHT_SOURCE_LABELS[src]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={BTN_SECONDARY}
                onClick={() => setInsights((prev) => prev.filter((_, i) => i !== index))}
                disabled={insights.length <= 1}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

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
