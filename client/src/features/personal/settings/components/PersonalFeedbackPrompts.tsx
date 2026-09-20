import { AppFeedbackKind } from '@furniture-erp/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { Dialog } from '@/components/ui/Dialog';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { personalFeedbackService } from '@/services/personal-feedback.service';

export function PersonalFeedbackPrompts() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const status = useQuery({
    queryKey: ['personal', 'feedback', 'status'],
    queryFn: ({ signal }) => personalFeedbackService.status(signal),
    enabled: Boolean(user && 'kind' in user && user.kind === 'PERSONAL'),
  });
  const prompts = status.data?.prompts;
  const [kind, setKind] = useState<'onboarding' | 'outcome' | null>(null);

  useEffect(() => {
    if (prompts?.showOnboarding) setKind('onboarding');
    else if (prompts?.showOutcome) setKind('outcome');
  }, [prompts]);

  if (!kind) return null;

  return (
    <FeedbackPromptDialog
      kind={kind}
      onClose={() => {
        void personalFeedbackService.dismiss(kind);
        setKind(null);
      }}
      title={kind === 'onboarding' ? t('personal.feedbackPromptOnboardingTitle') : t('personal.feedbackPromptOutcomeTitle')}
      hint={kind === 'onboarding' ? t('personal.feedbackPromptOnboarding') : t('personal.feedbackPromptOutcome')}
      submitKind={
        kind === 'onboarding' ? AppFeedbackKind.ONBOARDING_EXPECTATION : AppFeedbackKind.SUBSCRIPTION_OUTCOME
      }
    />
  );
}

function FeedbackPromptDialog({
  kind,
  title,
  hint,
  submitKind,
  onClose,
}: {
  kind: 'onboarding' | 'outcome';
  title: string;
  hint: string;
  submitKind: typeof AppFeedbackKind.ONBOARDING_EXPECTATION | typeof AppFeedbackKind.SUBSCRIPTION_OUTCOME;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  void kind;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await personalFeedbackService.create({ kind: submitKind, body, isPublic });
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title={title} className="sm:max-w-md">
      <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <p className="text-sm text-ink-muted">{hint}</p>
        <textarea
          className="w-full rounded-input border border-line px-3 py-2 text-sm"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={2}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          {t('personal.feedbackPublic')}
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-input border border-line px-3 py-2 text-sm">
            {t('common.skip', { defaultValue: 'O‘tkazib yuborish' })}
          </button>
          <button type="submit" className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white">
            {t('personal.feedbackSend')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
