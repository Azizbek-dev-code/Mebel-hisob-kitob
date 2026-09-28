import {
  SMM_PLATFORMS,
  SMM_PLATFORM_LABELS,
  SmmPlatform,
  type CreateSmmCompetitorRequest,
  type SmmCompetitorDetail,
  type SmmCompetitorListItem,
  type SmmPlatform as SmmPlatformType,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';

import {
  useCreateSmmCompetitor,
  useSmmCompetitorDetail,
  useUpdateSmmCompetitor,
} from '../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface CompetitorFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  competitor?: SmmCompetitorListItem | SmmCompetitorDetail | null;
  onSaved?: () => void;
}

export function CompetitorFormDialog({
  open,
  onClose,
  projectId,
  competitor = null,
  onSaved,
}: CompetitorFormDialogProps) {
  const create = useCreateSmmCompetitor(projectId);
  const update = useUpdateSmmCompetitor(projectId);
  const detailQuery = useSmmCompetitorDetail(
    projectId,
    competitor?.id ?? null,
    open && Boolean(competitor?.id),
  );
  const pending = create.isPending || update.isPending;
  const detail = detailQuery.data ?? (competitor && 'strengths' in competitor ? competitor : null);

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<SmmPlatformType>(SmmPlatform.INSTAGRAM);
  const [profileUrl, setProfileUrl] = useState('');
  const [followers, setFollowers] = useState('');
  const [postingFrequency, setPostingFrequency] = useState('');
  const [contentFormats, setContentFormats] = useState('');
  const [engagement, setEngagement] = useState('');
  const [offers, setOffers] = useState('');
  const [pricing, setPricing] = useState('');
  const [positioning, setPositioning] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [bestContent, setBestContent] = useState('');
  const [hooks, setHooks] = useState('');
  const [notes, setNotes] = useState('');
  const [researchDate, setResearchDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const source = detail ?? competitor;
    setName(source?.name ?? '');
    setPlatform(source?.platform ?? SmmPlatform.INSTAGRAM);
    setProfileUrl(source?.profileUrl ?? '');
    setFollowers(source?.followers != null ? String(source.followers) : '');
    setResearchDate(source?.researchDate?.slice(0, 10) ?? '');
    if (detail) {
      setPostingFrequency(detail.postingFrequency ?? '');
      setContentFormats(detail.contentFormats ?? '');
      setEngagement(detail.engagement ?? '');
      setOffers(detail.offers ?? '');
      setPricing(detail.pricing ?? '');
      setPositioning(detail.positioning ?? '');
      setStrengths(detail.strengths ?? '');
      setWeaknesses(detail.weaknesses ?? '');
      setBestContent(detail.bestContent ?? '');
      setHooks(detail.hooks ?? '');
      setNotes(detail.notes ?? '');
    } else if (!competitor) {
      setPostingFrequency('');
      setContentFormats('');
      setEngagement('');
      setOffers('');
      setPricing('');
      setPositioning('');
      setStrengths('');
      setWeaknesses('');
      setBestContent('');
      setHooks('');
      setNotes('');
    }
  }, [open, competitor, detail]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Nom majburiy');
      return;
    }
    const followersNum = followers.trim() ? Number.parseInt(followers, 10) : null;
    if (followers.trim() && (!Number.isFinite(followersNum) || (followersNum ?? 0) < 0)) {
      setError('Obunachilar soni noto‘g‘ri');
      return;
    }
    const body: CreateSmmCompetitorRequest = {
      name: name.trim(),
      platform,
      profileUrl: profileUrl.trim() || null,
      followers: followersNum,
      postingFrequency: postingFrequency.trim() || null,
      contentFormats: contentFormats.trim() || null,
      engagement: engagement.trim() || null,
      offers: offers.trim() || null,
      pricing: pricing.trim() || null,
      positioning: positioning.trim() || null,
      strengths: strengths.trim() || null,
      weaknesses: weaknesses.trim() || null,
      bestContent: bestContent.trim() || null,
      hooks: hooks.trim() || null,
      notes: notes.trim() || null,
      researchDate: researchDate || null,
    };
    try {
      if (competitor) await update.mutateAsync({ competitorId: competitor.id, body });
      else await create.mutateAsync(body);
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
      title={competitor ? 'Raqobatchini tahrirlash' : 'Yangi raqobatchi'}
      className="sm:max-w-xl"
    >
      <form className="max-h-[70vh] space-y-3 overflow-y-auto pr-1" onSubmit={(e) => void handleSubmit(e)}>
        {competitor && detailQuery.isLoading ? (
          <p className="text-sm text-ink-muted">Yuklanmoqda…</p>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Nomi *</span>
          <input className={FIELD_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Platforma</span>
            <select className={FIELD_CLASS} value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)}>
              {SMM_PLATFORMS.map((p) => (
                <option key={p} value={p}>{SMM_PLATFORM_LABELS[p]}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Obunachilar</span>
            <input className={FIELD_CLASS} inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value)} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Profil URL</span>
          <input className={FIELD_CLASS} value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Post chastotasi</span>
          <input className={FIELD_CLASS} value={postingFrequency} onChange={(e) => setPostingFrequency(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Kontent formatlari</span>
          <textarea className={FIELD_CLASS} rows={2} value={contentFormats} onChange={(e) => setContentFormats(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Engagement</span>
          <textarea className={FIELD_CLASS} rows={2} value={engagement} onChange={(e) => setEngagement(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Takliflar</span>
          <textarea className={FIELD_CLASS} rows={2} value={offers} onChange={(e) => setOffers(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Narxlash</span>
          <textarea className={FIELD_CLASS} rows={2} value={pricing} onChange={(e) => setPricing(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Pozitsiyalash</span>
          <textarea className={FIELD_CLASS} rows={2} value={positioning} onChange={(e) => setPositioning(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Kuchli tomonlari</span>
          <textarea className={FIELD_CLASS} rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Zaif tomonlari</span>
          <textarea className={FIELD_CLASS} rows={2} value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Eng yaxshi kontent</span>
          <textarea className={FIELD_CLASS} rows={2} value={bestContent} onChange={(e) => setBestContent(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Hooklar</span>
          <textarea className={FIELD_CLASS} rows={2} value={hooks} onChange={(e) => setHooks(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Tadqiqot sanasi</span>
          <input type="date" className={FIELD_CLASS} value={researchDate} onChange={(e) => setResearchDate(e.target.value)} />
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
