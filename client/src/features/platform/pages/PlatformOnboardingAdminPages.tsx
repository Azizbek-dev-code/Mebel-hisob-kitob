import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  OnboardingNeedDto,
  OnboardingQuestionDto,
  OnboardingSolutionDto,
  UpsertOnboardingQuestionRequest,
} from '@furniture-erp/shared';
import { Plus, List } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useAdminOnboardingAnswers,
  useAdminOnboardingMappings,
  useAdminOnboardingNeeds,
  useAdminOnboardingQuestions,
  useAdminOnboardingSolutions,
  useDeactivateOnboardingNeed,
  useDeactivateOnboardingQuestion,
  useDeleteOnboardingMapping,
  useSaveOnboardingMapping,
  useSaveOnboardingNeed,
  useSaveOnboardingQuestion,
} from '@/features/personal/onboarding/hooks/use-onboarding';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function PlatformOnboardingQuestionsPage() {
  const { t } = useTranslation();
  const list = useAdminOnboardingQuestions();
  const save = useSaveOnboardingQuestion();
  const deactivate = useDeactivateOnboardingQuestion();
  const [editing, setEditing] = useState<OnboardingQuestionDto | 'new' | null>(null);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {t('onboarding.admin.questionsTitle')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t('onboarding.admin.questionsHint')}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="size-4" />
          {t('onboarding.admin.addQuestion')}
        </button>
      </div>
      <SectionCard title={t('onboarding.admin.list')}>
        {list.isPending && !list.data ? (
          <Skeleton className="h-32 w-full" />
        ) : list.isError ? (
          <ErrorState
            title={t('onboarding.adminLoadFailed')}
            message={t('common.retry')}
            onRetry={() => void list.refetch()}
          />
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={List} title={t('onboarding.adminEmpty')} />
        ) : (
          <ul className="divide-y divide-line">
            {list.data?.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.promptUz}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {item.audience}
                    {item.businessType ? ` · ${item.businessType}` : ''} · {item.answerType} · {item.key}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{item.isActive ? t('common.yes') : t('common.no')}</Badge>
                  <button
                    type="button"
                    className="text-sm font-medium text-brand-700 hover:underline"
                    onClick={() => setEditing(item)}
                  >
                    {t('common.edit')}
                  </button>
                  {!item.isSystem ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-danger-700 hover:underline"
                      onClick={() => void deactivate.mutateAsync(item.id)}
                    >
                      {t('onboarding.admin.deactivate')}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      {editing ? (
        <QuestionDialog
          question={editing === 'new' ? null : editing}
          busy={save.isPending}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            await save.mutateAsync({ id: editing === 'new' ? undefined : editing.id, body });
            setEditing(null);
          }}
        />
      ) : null}
    </PageContainer>
  );
}

function QuestionDialog({
  question,
  busy,
  onClose,
  onSave,
}: {
  question: OnboardingQuestionDto | null;
  busy: boolean;
  onClose: () => void;
  onSave: (body: UpsertOnboardingQuestionRequest) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [promptUz, setPromptUz] = useState(question?.promptUz ?? '');
  const [promptRu, setPromptRu] = useState(question?.promptRu ?? '');
  const [audience, setAudience] = useState(question?.audience ?? 'PERSONAL');
  const [answerType, setAnswerType] = useState(question?.answerType ?? 'SINGLE');
  const [required, setRequired] = useState(question?.required ?? true);
  const [optionsText, setOptionsText] = useState(
    (question?.options ?? []).map((option) => `${option.key}|${option.labelUz}|${option.labelRu}`).join('\n'),
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const options = optionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [key, labelUz, labelRu] = line.split('|').map((part) => part.trim());
        return {
          key: key || `OPT_${index + 1}`,
          labelUz: labelUz || key || `OPT_${index + 1}`,
          labelRu: labelRu || labelUz || key || `OPT_${index + 1}`,
          allowsOther: (key || '').toUpperCase() === 'OTHER',
          sortOrder: (index + 1) * 10,
        };
      });
    await onSave({
      key: question?.key,
      audience,
      promptUz,
      promptRu,
      answerType,
      required,
      options,
    });
  }

  return (
    <Dialog open title={question ? t('common.edit') : t('onboarding.admin.addQuestion')} onClose={onClose}>
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block space-y-1 text-sm">
          <span>{t('onboarding.admin.promptUz')}</span>
          <input className={fieldClass} value={promptUz} onChange={(event) => setPromptUz(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t('onboarding.admin.promptRu')}</span>
          <input className={fieldClass} value={promptRu} onChange={(event) => setPromptRu(event.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>{t('onboarding.admin.audience')}</span>
            <select className={fieldClass} value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)}>
              <option value="PERSONAL">PERSONAL</option>
              <option value="BUSINESS">BUSINESS</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t('onboarding.admin.answerType')}</span>
            <select className={fieldClass} value={answerType} onChange={(event) => setAnswerType(event.target.value as typeof answerType)}>
              <option value="SINGLE">SINGLE</option>
              <option value="MULTI">MULTI</option>
              <option value="TEXT">TEXT</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
          {t('onboarding.admin.required')}
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t('onboarding.admin.optionsHint')}</span>
          <textarea
            className={`${fieldClass} min-h-32 font-mono text-xs`}
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="text-sm text-ink-muted" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function PlatformOnboardingAnswersPage() {
  const { t } = useTranslation();
  const list = useAdminOnboardingAnswers();

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('onboarding.admin.answersTitle')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('onboarding.admin.answersHint')}</p>
      </div>
      <SectionCard title={t('onboarding.admin.list')}>
        {list.isPending && !list.data ? (
          <Skeleton className="h-32 w-full" />
        ) : list.isError ? (
          <ErrorState
            title={t('onboarding.adminLoadFailed')}
            message={t('common.retry')}
            onRetry={() => void list.refetch()}
          />
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={List} title={t('onboarding.adminEmpty')} />
        ) : (
          <ul className="divide-y divide-line">
            {list.data?.items.map((item) => (
              <li key={item.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {item.purpose ?? '—'} {item.businessType ? `· ${item.businessType}` : ''}
                  </p>
                  <span className="text-xs text-ink-muted">{item.status}</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  ws {item.workspaceId ?? '—'} · id {item.identityId ?? '—'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function LabeledAdminPage({
  kind,
  titleKey,
  hintKey,
}: {
  kind: 'need' | 'solution';
  titleKey: string;
  hintKey: string;
}) {
  const { t } = useTranslation();
  const needsQuery = useAdminOnboardingNeeds();
  const solutionsQuery = useAdminOnboardingSolutions();
  const list = kind === 'need' ? needsQuery : solutionsQuery;
  const save = useSaveOnboardingNeed(kind);
  const deactivate = useDeactivateOnboardingNeed(kind);
  const [editing, setEditing] = useState<OnboardingNeedDto | OnboardingSolutionDto | 'new' | null>(null);
  const [labelUz, setLabelUz] = useState('');
  const [labelRu, setLabelRu] = useState('');

  function open(item: OnboardingNeedDto | OnboardingSolutionDto | 'new') {
    setEditing(item);
    setLabelUz(item === 'new' ? '' : item.labelUz);
    setLabelRu(item === 'new' ? '' : item.labelRu);
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{t(titleKey)}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t(hintKey)}</p>
        </div>
        <button
          type="button"
          onClick={() => open('new')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="size-4" />
          {t('common.save')}
        </button>
      </div>
      <SectionCard title={t('onboarding.admin.list')}>
        {list.isPending && !list.data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ul className="divide-y divide-line">
            {list.data?.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{item.labelUz}</p>
                  <p className="text-xs text-ink-muted">{item.key}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="text-sm text-brand-700" onClick={() => open(item)}>
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="text-sm text-danger-700"
                    onClick={() => void deactivate.mutateAsync(item.id)}
                  >
                    {t('onboarding.admin.deactivate')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      {kind === 'need' ? <MappingsCard /> : null}
      {editing ? (
        <Dialog open title={t('common.edit')} onClose={() => setEditing(null)}>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void save
                .mutateAsync({
                  id: editing === 'new' ? undefined : editing.id,
                  body: { labelUz, labelRu, key: editing === 'new' ? undefined : editing.key },
                })
                .then(() => setEditing(null));
            }}
          >
            <input className={fieldClass} value={labelUz} onChange={(event) => setLabelUz(event.target.value)} />
            <input className={fieldClass} value={labelRu} onChange={(event) => setLabelRu(event.target.value)} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="rounded-input bg-brand-600 px-3 py-2 text-sm text-white">
                {t('common.save')}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </PageContainer>
  );
}

function MappingsCard() {
  const { t } = useTranslation();
  const questions = useAdminOnboardingQuestions();
  const needs = useAdminOnboardingNeeds();
  const solutions = useAdminOnboardingSolutions();
  const mappings = useAdminOnboardingMappings();
  const save = useSaveOnboardingMapping();
  const remove = useDeleteOnboardingMapping();
  const [questionId, setQuestionId] = useState('');
  const [optionKey, setOptionKey] = useState('');
  const [needId, setNeedId] = useState('');
  const [solutionId, setSolutionId] = useState('');

  const selectedQuestion = useMemo(
    () => questions.data?.items.find((item) => item.id === questionId),
    [questionId, questions.data?.items],
  );

  return (
    <SectionCard title={t('onboarding.admin.mappingsTitle')}>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={fieldClass} value={questionId} onChange={(event) => setQuestionId(event.target.value)}>
          <option value="">{t('onboarding.admin.question')}</option>
          {questions.data?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.promptUz}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={optionKey} onChange={(event) => setOptionKey(event.target.value)}>
          <option value="">{t('onboarding.admin.option')}</option>
          {selectedQuestion?.options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.labelUz}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={needId} onChange={(event) => setNeedId(event.target.value)}>
          <option value="">{t('onboarding.admin.need')}</option>
          {needs.data?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.labelUz}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={solutionId} onChange={(event) => setSolutionId(event.target.value)}>
          <option value="">{t('onboarding.admin.solution')}</option>
          {solutions.data?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.labelUz}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="mt-3 rounded-input bg-brand-600 px-3 py-2 text-sm text-white disabled:opacity-60"
        disabled={!questionId || !optionKey || !needId || !solutionId || save.isPending}
        onClick={() => void save.mutateAsync({ questionId, optionKey, needId, solutionId })}
      >
        {t('common.save')}
      </button>
      <ul className="mt-4 divide-y divide-line">
        {mappings.data?.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              {item.questionKey}:{item.optionKey} → {item.needLabelUz} / {item.solutionLabelUz}
            </span>
            <button type="button" className="text-danger-700" onClick={() => void remove.mutateAsync(item.id)}>
              {t('common.delete')}
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function PlatformOnboardingNeedsPage() {
  return (
    <LabeledAdminPage
      kind="need"
      titleKey="onboarding.admin.needsTitle"
      hintKey="onboarding.admin.needsHint"
    />
  );
}

export function PlatformOnboardingSolutionsPage() {
  return (
    <LabeledAdminPage
      kind="solution"
      titleKey="onboarding.admin.solutionsTitle"
      hintKey="onboarding.admin.solutionsHint"
    />
  );
}
