import {
  AccountPurpose,
  BUSINESS_TYPES,
  WorkspaceType,
  isCustomIncomeBand,
  isPersonalAuth,
  isPlatformAdminAuth,
  otherTextKey,
  validateOnboardingComplete,
  validateRegisterPersonalAccountDraft,
  type CatalogQuestionForSanitize,
  type OnboardingAnswers,
  type OnboardingQuestionDto,
} from '@furniture-erp/shared';
import { AlertCircle, Building2, Loader2, Wallet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { useAccountWorkspaces, useSwitchWorkspace } from '@/features/accounts/hooks/use-accounts';
import { authQueryKeys, useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { onboardingService } from '@/services/onboarding.service';

import {
  useCompleteBusinessOnboarding,
  useCompletePersonalAuthenticated,
  useCompletePersonalRegister,
  useOnboardingCatalog,
  useSaveOnboarding,
} from '../hooks/use-onboarding';

const TOKEN_KEY = 'furniture-erp.onboardingToken';

function toSanitizeShape(questions: OnboardingQuestionDto[]): CatalogQuestionForSanitize[] {
  return questions.map((question) => ({
    key: question.key,
    audience: question.audience,
    businessType: question.businessType,
    answerType: question.answerType,
    required: question.required,
    optionKeys: question.options.map((option) => option.key),
    allowsOtherKeys: question.options.filter((option) => option.allowsOther).map((option) => option.key),
  }));
}

function promptFor(question: OnboardingQuestionDto, language: string): string {
  return language.startsWith('ru') ? question.promptRu : question.promptUz;
}

function hintFor(question: OnboardingQuestionDto, language: string): string | null {
  return language.startsWith('ru') ? question.hintRu : question.hintUz;
}

function optionLabel(option: OnboardingQuestionDto['options'][number], language: string): string {
  return language.startsWith('ru') ? option.labelRu : option.labelUz;
}

function selectedKeys(answers: OnboardingAnswers, key: string): string[] {
  const value = answers[key];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return [value];
  return [];
}

function firstUnansweredIndex(
  questions: OnboardingQuestionDto[],
  answers: OnboardingAnswers,
): number {
  const index = questions.findIndex((question) => {
    if (!question.required) return false;
    const keys = selectedKeys(answers, question.key);
    return keys.length === 0;
  });
  if (index >= 0) return index;
  const optionalOpen = questions.findIndex((question) => {
    if (question.required) return false;
    return selectedKeys(answers, question.key).length === 0;
  });
  return optionalOpen >= 0 ? optionalOpen : Math.max(0, questions.length - 1);
}

export function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const accounts = useAccountWorkspaces();
  const switchWorkspace = useSwitchWorkspace();
  const catalogQuery = useOnboardingCatalog();
  const hasPersonalAccount = Boolean(user && isPersonalAuth(user));
  const isSignedIn = Boolean(user) && !isPersonalAuth(user);
  const existingPersonalWorkspace = accounts.data?.items.find(
    (item) => item.type === WorkspaceType.PERSONAL,
  );
  const hasPersonalWorkspace = hasPersonalAccount || Boolean(existingPersonalWorkspace);
  const hasPersonalAccountRef = useRef(hasPersonalAccount);
  hasPersonalAccountRef.current = hasPersonalAccount;

  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [screen, setScreen] = useState<'purpose' | 'flow' | 'account'>('purpose');
  const [flowIndex, setFlowIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [customIncome, setCustomIncome] = useState('');
  const [bootError, setBootError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [account, setAccount] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const save = useSaveOnboarding(token);
  const completeRegister = useCompletePersonalRegister(token);
  const completeAuthenticated = useCompletePersonalAuthenticated(token);
  const completeBusiness = useCompleteBusinessOnboarding(token);

  const persistToken = useCallback((next: string) => {
    sessionStorage.setItem(TOKEN_KEY, next);
    setToken(next);
  }, []);

  const catalogQuestions = catalogQuery.data?.questions ?? [];
  const purpose = answers.purpose;
  const flowQuestions = useMemo(() => {
    if (purpose === AccountPurpose.PERSONAL) {
      return catalogQuestions.filter((question) => question.audience === 'PERSONAL');
    }
    if (purpose === AccountPurpose.BUSINESS) {
      return catalogQuestions.filter((question) => {
        if (question.audience !== 'BUSINESS') return false;
        if (!question.businessType) return true;
        return question.businessType === answers.businessType;
      });
    }
    return [];
  }, [answers.businessType, catalogQuestions, purpose]);

  const currentQuestion = flowQuestions[flowIndex];
  const needsAccountStep = purpose === AccountPurpose.PERSONAL && !hasPersonalWorkspace;
  const progressTotal = flowQuestions.length + (needsAccountStep ? 1 : 0);
  const progressCurrent =
    screen === 'account' ? flowQuestions.length + 1 : screen === 'flow' ? flowIndex + 1 : 0;

  useEffect(() => {
    if (isPlatformAdminAuth(user)) {
      navigate(ROUTES.dashboard, { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    if (hasPersonalAccount) setScreen('purpose');
  }, [hasPersonalAccount]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const existing = sessionStorage.getItem(TOKEN_KEY);
        if (existing) {
          const { submission } = await onboardingService.get(existing);
          if (cancelled) return;
          if (submission.status === 'COMPLETED') {
            sessionStorage.removeItem(TOKEN_KEY);
            const started = await onboardingService.start();
            if (cancelled) return;
            persistToken(started.submission.publicToken);
            setAnswers({});
            setScreen('purpose');
          } else {
            persistToken(submission.publicToken);
            setAnswers(submission.answers);
            if (
              submission.customMonthlyIncomeSom != null &&
              submission.customMonthlyIncomeSom > 0
            ) {
              setCustomIncome(String(submission.customMonthlyIncomeSom));
            }
            if (
              submission.answers.purpose === AccountPurpose.PERSONAL &&
              !hasPersonalAccountRef.current
            ) {
              setScreen('flow');
            } else if (submission.answers.purpose === AccountPurpose.BUSINESS) {
              setScreen('flow');
            }
          }
        } else {
          const started = await onboardingService.start();
          if (cancelled) return;
          persistToken(started.submission.publicToken);
        }
      } catch {
        if (cancelled) return;
        try {
          sessionStorage.removeItem(TOKEN_KEY);
          const started = await onboardingService.start();
          if (cancelled) return;
          persistToken(started.submission.publicToken);
        } catch {
          if (!cancelled) setBootError(t('onboarding.loadFailed'));
        }
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [persistToken, t]);

  useEffect(() => {
    if (screen !== 'flow' || flowQuestions.length === 0) return;
    setFlowIndex((current) => {
      if (current >= flowQuestions.length) return Math.max(0, flowQuestions.length - 1);
      return current;
    });
  }, [flowQuestions.length, screen]);

  useEffect(() => {
    if (screen !== 'flow' || !answers.purpose) return;
    setFlowIndex((current) =>
      current === 0 ? firstUnansweredIndex(flowQuestions, answers) : current,
    );
    // Restore once after answers + catalog arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogQuestions.length, screen, answers.purpose]);

  const isBusy =
    save.isPending ||
    completeRegister.isPending ||
    completeAuthenticated.isPending ||
    completeBusiness.isPending ||
    switchWorkspace.isPending;

  async function persistAnswers(next: OnboardingAnswers, customSom?: number | null) {
    setAnswers(next);
    if (!token) return;
    await save.mutateAsync({
      answers: next,
      customMonthlyIncomeSom: customSom,
    });
  }

  async function choosePurpose(nextPurpose: AccountPurpose) {
    setFieldErrors({});
    try {
      if (nextPurpose === AccountPurpose.PERSONAL) {
        if (hasPersonalAccount) {
          navigate(ROUTES.personalDashboard);
          return;
        }
        if (existingPersonalWorkspace) {
          await switchWorkspace.mutateAsync(existingPersonalWorkspace.id);
          return;
        }
      }
      const next = { ...answers, purpose: nextPurpose } as OnboardingAnswers;
      await persistAnswers(next);
      setFlowIndex(0);
      setScreen('flow');
    } catch (error) {
      setFieldErrors({
        form: error instanceof Error ? error.message : t('onboarding.submitFailed'),
      });
    }
  }

  function setSingle(question: OnboardingQuestionDto, key: string) {
    const otherKey = otherTextKey(question.key);
    const allowsOther = question.options.some((option) => option.key === key && option.allowsOther);
    setAnswers({
      ...answers,
      [question.key]: key,
      businessType: question.key === 'businessType' ? key : answers.businessType,
      [otherKey]: allowsOther ? answers[otherKey] : undefined,
    });
  }

  function toggleMulti(question: OnboardingQuestionDto, key: string) {
    const current = selectedKeys(answers, question.key);
    const nextValues = current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key];
    setAnswers({ ...answers, [question.key]: nextValues });
  }

  function questionErrors(question: OnboardingQuestionDto): Record<string, string> {
    const errors: Record<string, string> = {};
    const keys = selectedKeys(answers, question.key);
    if (question.required && keys.length === 0) {
      errors[question.key] = t('onboarding.errors.required');
    }
    const needsOther = keys.some((key) =>
      question.options.some((option) => option.key === key && option.allowsOther),
    );
    const other = answers[otherTextKey(question.key)];
    if (needsOther && (!other || (typeof other === 'string' && !other.trim()))) {
      errors[otherTextKey(question.key)] = t('onboarding.errors.other');
    }
    if (question.key === 'monthlyIncomeBand' && isCustomIncomeBand(answers.monthlyIncomeBand)) {
      const amount = Number(customIncome);
      if (!Number.isInteger(amount) || amount <= 0) {
        errors.customMonthlyIncomeSom = t('onboarding.errors.customIncome');
      }
    }
    return errors;
  }

  async function goNext() {
    if (!currentQuestion) return;
    const errors = questionErrors(currentQuestion);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const customSom =
      isCustomIncomeBand(answers.monthlyIncomeBand) && Number.isInteger(Number(customIncome))
        ? Number(customIncome)
        : null;
    try {
      await persistAnswers(answers, customSom);
      if (flowIndex + 1 < flowQuestions.length) {
        setFlowIndex(flowIndex + 1);
        return;
      }
      if (purpose === AccountPurpose.BUSINESS) {
        await completeBusiness.mutateAsync();
        sessionStorage.removeItem(TOKEN_KEY);
        const businessType = answers.businessType ?? BUSINESS_TYPES[0];
        navigate(`${ROUTES.registerStore}?businessType=${encodeURIComponent(String(businessType))}`);
        return;
      }
      if (needsAccountStep) {
        setScreen('account');
        return;
      }
      await submitAccount();
    } catch (error) {
      setFieldErrors({
        form: error instanceof Error ? error.message : t('onboarding.submitFailed'),
      });
    }
  }

  async function skipOptional() {
    if (!currentQuestion || currentQuestion.required) return;
    const next = { ...answers };
    delete next[currentQuestion.key];
    delete next[otherTextKey(currentQuestion.key)];
    try {
      await persistAnswers(next);
      if (flowIndex + 1 < flowQuestions.length) {
        setFlowIndex(flowIndex + 1);
        return;
      }
      if (answers.purpose === AccountPurpose.BUSINESS) {
        await completeBusiness.mutateAsync();
        sessionStorage.removeItem(TOKEN_KEY);
        const businessType = answers.businessType ?? BUSINESS_TYPES[0];
        navigate(`${ROUTES.registerStore}?businessType=${encodeURIComponent(String(businessType))}`);
        return;
      }
      if (needsAccountStep) {
        setScreen('account');
        return;
      }
      await submitAccount();
    } catch (error) {
      setFieldErrors({
        form: error instanceof Error ? error.message : t('onboarding.submitFailed'),
      });
    }
  }

  async function submitAccount() {
    const customSom =
      isCustomIncomeBand(answers.monthlyIncomeBand) && Number.isInteger(Number(customIncome))
        ? Number(customIncome)
        : null;
    const completeErrors = validateOnboardingComplete(
      answers,
      toSanitizeShape(flowQuestions),
      customSom,
    );
    if (completeErrors.length) {
      setFieldErrors(Object.fromEntries(completeErrors.map((item) => [item.field, item.message])));
      return;
    }

    try {
      if (isSignedIn || hasPersonalAccount) {
        const result = await completeAuthenticated.mutateAsync({});
        sessionStorage.removeItem(TOKEN_KEY);
        if (result.user) {
          queryClient.setQueryData(authQueryKeys.currentUser, result.user);
          navigate(ROUTES.personalDashboard, { replace: true });
          return;
        }
        navigate(ROUTES.onboardingComplete, {
          replace: true,
          state: { mode: 'authenticated', workspaceName: result.workspace.name },
        });
        return;
      }

      const registerErrors = validateRegisterPersonalAccountDraft(account);
      if (registerErrors.length) {
        setFieldErrors(Object.fromEntries(registerErrors.map((item) => [item.field, item.message])));
        return;
      }
      const result = await completeRegister.mutateAsync(account);
      sessionStorage.removeItem(TOKEN_KEY);
      if (result.user) {
        queryClient.setQueryData(authQueryKeys.currentUser, result.user);
        navigate(ROUTES.personalDashboard, { replace: true });
        return;
      }
      navigate(ROUTES.onboardingComplete, {
        replace: true,
        state: {
          mode: 'register',
          workspaceName: result.workspace.name,
          email: result.identity.email,
        },
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.details?.length) {
        setFieldErrors(
          Object.fromEntries(error.details.map((item) => [item.field, item.message])),
        );
        return;
      }
      setFieldErrors({
        form: error instanceof Error ? error.message : t('onboarding.submitFailed'),
      });
    }
  }

  function goBack() {
    if (screen === 'account') {
      setScreen('flow');
      setFlowIndex(Math.max(0, flowQuestions.length - 1));
      return;
    }
    if (screen === 'flow' && flowIndex > 0) {
      setFlowIndex(flowIndex - 1);
      return;
    }
    setScreen('purpose');
  }

  const showProgress = screen === 'flow' || screen === 'account';
  const otherValue =
    currentQuestion && typeof answers[otherTextKey(currentQuestion.key)] === 'string'
      ? String(answers[otherTextKey(currentQuestion.key)])
      : currentQuestion?.key === 'discoverySource'
        ? (answers.discoveryOther ?? '')
        : currentQuestion?.key === 'firstSavingGoal'
          ? (answers.firstSavingGoalOther ?? '')
          : '';
  const selected = currentQuestion ? selectedKeys(answers, currentQuestion.key) : [];
  const showOther =
    currentQuestion &&
    selected.some((key) =>
      currentQuestion.options.some((option) => option.key === key && option.allowsOther),
    );

  return (
    <main className="pf-shell min-h-screen overflow-x-hidden bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mt-4 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{t('onboarding.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('onboarding.subtitle')}</p>
        </div>

        {showProgress && progressTotal > 0 ? (
          <p className="mt-5 text-center text-xs text-ink-subtle" data-testid="onboarding-progress">
            {t('onboarding.step', { current: progressCurrent, total: progressTotal })}
          </p>
        ) : null}

        <div className="mt-6 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          {isBooting || catalogQuery.isPending ? (
            <p className="flex items-center justify-center gap-2 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t('app.loading')}
            </p>
          ) : bootError || catalogQuery.isError ? (
            <p className="text-sm text-danger-700">{bootError ?? t('onboarding.loadFailed')}</p>
          ) : screen === 'purpose' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {fieldErrors.form ? (
                <div className="sm:col-span-2">
                  <Alert message={fieldErrors.form} />
                </div>
              ) : null}
              <PurposeCard
                icon={Wallet}
                title={t('onboarding.purpose.PERSONAL')}
                description={
                  hasPersonalWorkspace
                    ? t('onboarding.purpose.personalExistingHint')
                    : t('onboarding.purpose.personalHint')
                }
                disabled={isBusy}
                onClick={() => void choosePurpose(AccountPurpose.PERSONAL)}
              />
              <PurposeCard
                icon={Building2}
                title={t('onboarding.purpose.BUSINESS')}
                description={t('onboarding.purpose.businessHint')}
                disabled={isBusy}
                onClick={() => void choosePurpose(AccountPurpose.BUSINESS)}
              />
            </div>
          ) : screen === 'flow' && flowQuestions.length === 0 ? (
            <p className="text-sm text-danger-700">{t('onboarding.loadFailed')}</p>
          ) : screen === 'flow' && currentQuestion ? (
            <QuestionBlock
              title={promptFor(currentQuestion, language)}
              hint={hintFor(currentQuestion, language) ?? undefined}
              error={
                fieldErrors[currentQuestion.key] ??
                fieldErrors[otherTextKey(currentQuestion.key)] ??
                fieldErrors.customMonthlyIncomeSom ??
                fieldErrors.form
              }
              onBack={goBack}
              onNext={() => void goNext()}
              onSkip={currentQuestion.required ? undefined : () => void skipOptional()}
              busy={isBusy}
            >
              {currentQuestion.answerType === 'TEXT' ? (
                <input
                  value={typeof answers[currentQuestion.key] === 'string' ? String(answers[currentQuestion.key]) : ''}
                  onChange={(event) =>
                    setAnswers({ ...answers, [currentQuestion.key]: event.target.value })
                  }
                  className={fieldClass(Boolean(fieldErrors[currentQuestion.key]))}
                />
              ) : (
                <ChipGrid
                  options={currentQuestion.options.map((option) => ({
                    key: option.key,
                    label: optionLabel(option, language),
                  }))}
                  selected={selected}
                  onToggle={(key) =>
                    currentQuestion.answerType === 'MULTI'
                      ? toggleMulti(currentQuestion, key)
                      : setSingle(currentQuestion, key)
                  }
                  multiple={currentQuestion.answerType === 'MULTI'}
                />
              )}
              {showOther ? (
                <input
                  value={otherValue}
                  onChange={(event) =>
                    setAnswers({
                      ...answers,
                      [otherTextKey(currentQuestion.key)]: event.target.value,
                      ...(currentQuestion.key === 'discoverySource'
                        ? { discoveryOther: event.target.value }
                        : {}),
                      ...(currentQuestion.key === 'firstSavingGoal'
                        ? { firstSavingGoalOther: event.target.value }
                        : {}),
                    })
                  }
                  placeholder={t('onboarding.discoveryOtherPlaceholder')}
                  className={fieldClass(Boolean(fieldErrors[otherTextKey(currentQuestion.key)]))}
                />
              ) : null}
              {currentQuestion.key === 'monthlyIncomeBand' &&
              isCustomIncomeBand(answers.monthlyIncomeBand) ? (
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={customIncome}
                  onChange={(event) => setCustomIncome(event.target.value)}
                  placeholder={t('onboarding.customIncomePlaceholder')}
                  className={fieldClass(Boolean(fieldErrors.customMonthlyIncomeSom))}
                />
              ) : null}
            </QuestionBlock>
          ) : (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-ink">{t('onboarding.questions.account')}</h2>
              <p className="text-sm text-ink-muted">
                {isSignedIn ? t('onboarding.accountSignedIn') : t('onboarding.accountGuest')}
              </p>
              {fieldErrors.form ? <Alert role="alert" message={fieldErrors.form} /> : null}
              {!isSignedIn ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('onboarding.fields.firstName')} error={fieldErrors.firstName}>
                    <input
                      value={account.firstName}
                      onChange={(event) => setAccount({ ...account, firstName: event.target.value })}
                      className={fieldClass(Boolean(fieldErrors.firstName))}
                      autoComplete="given-name"
                    />
                  </Field>
                  <Field label={t('onboarding.fields.lastName')} error={fieldErrors.lastName}>
                    <input
                      value={account.lastName}
                      onChange={(event) => setAccount({ ...account, lastName: event.target.value })}
                      className={fieldClass(Boolean(fieldErrors.lastName))}
                      autoComplete="family-name"
                    />
                  </Field>
                  <Field label="Email" error={fieldErrors.email}>
                    <input
                      type="email"
                      value={account.email}
                      onChange={(event) => setAccount({ ...account, email: event.target.value })}
                      className={fieldClass(Boolean(fieldErrors.email))}
                      autoComplete="email"
                    />
                  </Field>
                  <div className="hidden sm:block" />
                  <Field label={t('auth.password')} error={fieldErrors.password}>
                    <input
                      type="password"
                      value={account.password}
                      onChange={(event) => setAccount({ ...account, password: event.target.value })}
                      className={fieldClass(Boolean(fieldErrors.password))}
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field
                    label={t('onboarding.fields.passwordConfirmation')}
                    error={fieldErrors.passwordConfirmation}
                  >
                    <input
                      type="password"
                      value={account.passwordConfirmation}
                      onChange={(event) =>
                        setAccount({ ...account, passwordConfirmation: event.target.value })
                      }
                      className={fieldClass(Boolean(fieldErrors.passwordConfirmation))}
                      autoComplete="new-password"
                    />
                  </Field>
                </div>
              ) : null}
              <NavRow
                onBack={goBack}
                onNext={() => void submitAccount()}
                nextLabel={t('onboarding.createAccount')}
                busy={isBusy}
              />
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link
            to={hasPersonalAccount ? ROUTES.personalDashboard : ROUTES.login}
            className="font-medium text-brand-700 hover:underline"
          >
            {hasPersonalAccount ? t('personal.home') : t('auth.login')}
          </Link>
        </p>
      </div>
    </main>
  );
}

function PurposeCard({
  icon: Icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: typeof Wallet;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-panel border border-line-strong p-4 text-left transition-colors hover:border-brand-500 hover:bg-brand-50 disabled:opacity-60"
    >
      <Icon className="size-6 text-brand-600" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
    </button>
  );
}

function QuestionBlock({
  title,
  hint,
  error,
  children,
  onBack,
  onNext,
  onSkip,
  busy,
}: {
  title: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
      </div>
      {error ? <Alert message={error} /> : null}
      {children}
      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextLabel={t('common.continue')}
        skipLabel={onSkip ? t('common.skip') : undefined}
        onSkip={onSkip}
        busy={busy}
      />
    </div>
  );
}

function ChipGrid({
  options,
  selected,
  onToggle,
  multiple = false,
}: {
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  multiple?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const isOn = selected.includes(option.key);
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(option.key)}
            className={cn(
              'rounded-input border px-3 py-2.5 text-left text-sm transition-colors',
              isOn
                ? 'border-brand-500 bg-brand-50 text-brand-800'
                : 'border-line-strong text-ink hover:border-ink-subtle',
            )}
          >
            {multiple && isOn ? `✓ ${option.label}` : option.label}
          </button>
        );
      })}
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel,
  busy,
  skipLabel,
  onSkip,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  busy: boolean;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-60"
      >
        {t('common.back')}
      </button>
      <div className="flex items-center gap-2">
        {skipLabel && onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-60"
          >
            {skipLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onNext}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="block text-xs text-danger-600">{error}</span> : null}
    </label>
  );
}

function Alert({ message }: { message: string; role?: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-input border border-danger-100 bg-danger-50 p-3"
    >
      <AlertCircle className="mt-px size-4 shrink-0 text-danger-500" aria-hidden="true" />
      <p className="text-sm text-danger-700">{message}</p>
    </div>
  );
}

function fieldClass(hasError: boolean): string {
  return cn(
    'w-full rounded-input border bg-surface px-3 py-2.5 text-sm text-ink',
    hasError ? 'border-danger-500' : 'border-line-strong hover:border-ink-subtle',
  );
}
