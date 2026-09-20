import { AppFeedbackKind, type CreateAppFeedbackRequest } from '@furniture-erp/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiClientError } from '@/lib/api-client';
import { personalFeedbackService } from '@/services/personal-feedback.service';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500';

export function PersonalFeedbackPage() {
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    const payload: CreateAppFeedbackRequest = {
      kind: AppFeedbackKind.VOLUNTARY,
      body: body.trim(),
      rating: rating || null,
      isPublic,
    };
    try {
      await personalFeedbackService.create(payload);
      setSaved(true);
      setBody('');
      setRating(0);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.feedbackTitle')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.feedbackHint')}</p>
      </div>
      <form className="space-y-3 rounded-2xl border border-line bg-surface px-4 py-3.5" onSubmit={(e) => void onSubmit(e)}>
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-700">{t('personal.feedbackSaved')}</p> : null}
        <textarea className={fieldClass} rows={5} value={body} onChange={(e) => setBody(e.target.value)} required minLength={2} />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" onClick={() => setRating(star)} className={star <= rating ? 'text-amber-500' : 'text-ink-subtle'}>
              ★
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          {t('personal.feedbackPublic')}
        </label>
        <button type="submit" disabled={pending} className="rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {t('personal.feedbackSend')}
        </button>
      </form>
    </div>
  );
}
