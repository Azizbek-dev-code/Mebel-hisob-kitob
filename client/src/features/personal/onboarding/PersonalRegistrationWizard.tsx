import {
  PERSONAL_AGE_MAX,
  PERSONAL_AGE_MIN,
  PERSONAL_PASSWORD_MIN,
  buildPersonalValueCards,
  normalizeEmail,
  personalReadyHeadline,
  validatePersonalAge,
  validateRegisterPersonalAccountDraft,
  type OnboardingAnswers,
  type OnboardingQuestionDto,
  type OnboardingSubmissionDto,
} from '@furniture-erp/shared';
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { authQueryKeys } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import {
  useCompletePersonalAuthenticated,
  useCompletePersonalRegister,
  useConfirmRegisterEmail,
  useOnboardingMetrics,
  useRequestRegisterEmail,
  useSaveOnboarding,
} from './hooks/use-onboarding';
import {
  CREATING_CHECKLIST,
  PERSONAL_QUESTION_KEYS,
  inferPersonalStep,
  personalStepsFor,
  stepProgress,
  type PersonalRegStep,
} from './personal-registration-steps';
import { OtpCodeInput } from './components/OtpCodeInput';
import {
  ContinueButton,
  RegistrationShell,
  fieldClass,
  onEnterKey,
} from './components/RegistrationShell';

const TOKEN_KEY = 'furniture-erp.onboardingToken';

type Props = {
  token: string;
  answers: OnboardingAnswers;
  onAnswersChange: (next: OnboardingAnswers) => void;
  catalogQuestions: OnboardingQuestionDto[];
  isSignedIn: boolean;
  submissionMeta: Pick<OnboardingSubmissionDto, 'registerEmail' | 'emailVerifiedAt'> | null;
  onSubmissionMeta: (
    meta: Pick<OnboardingSubmissionDto, 'registerEmail' | 'emailVerifiedAt'>,
  ) => void;
  onBackToPurpose: () => void;
  initialStep?: PersonalRegStep;
  initialQuestionIndex?: number;
};

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

export function PersonalRegistrationWizard({
  token,
  answers,
  onAnswersChange,
  catalogQuestions,
  isSignedIn,
  submissionMeta,
  onSubmissionMeta,
  onBackToPurpose,
  initialStep,
  initialQuestionIndex = 0,
}: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isRu = language.startsWith('ru');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const save = useSaveOnboarding(token);
  const requestEmail = useRequestRegisterEmail(token);
  const confirmEmail = useConfirmRegisterEmail(token);
  const completeRegister = useCompletePersonalRegister(token);
  const completeAuthenticated = useCompletePersonalAuthenticated(token);
  const metricsQuery = useOnboardingMetrics(true);

  const inferred = useMemo(
    () =>
      inferPersonalStep({
        answers,
        submission: submissionMeta,
        isSignedIn,
      }),
    // Only for initial mount defaults — step state is local after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [step, setStep] = useState<PersonalRegStep>(initialStep ?? inferred.step);
  const [questionIndex, setQuestionIndex] = useState(
    initialQuestionIndex || inferred.questionIndex,
  );
  const [firstName, setFirstName] = useState(
    typeof answers.firstName === 'string' ? answers.firstName : '',
  );
  const [lastName, setLastName] = useState(
    typeof answers.lastName === 'string' ? answers.lastName : '',
  );
  const [age, setAge] = useState(typeof answers.age === 'string' ? answers.age : '');
  const [email, setEmail] = useState(submissionMeta?.registerEmail ?? '');
  const [emailMasked, setEmailMasked] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [resendAfterSec, setResendAfterSec] = useState(0);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [checklistDone, setChecklistDone] = useState(0);
  const creatingStarted = useRef(false);

  const personalQuestions = useMemo(() => {
    const byKey = new Map(
      catalogQuestions
        .filter((q) => q.audience === 'PERSONAL')
        .map((q) => [q.key, q] as const),
    );
    return PERSONAL_QUESTION_KEYS.map((key) => byKey.get(key)).filter(
      (q): q is OnboardingQuestionDto => Boolean(q),
    );
  }, [catalogQuestions]);

  const currentQuestion = personalQuestions[questionIndex];
  const progress = step === 'creating' ? null : stepProgress(step, isSignedIn);

  const persistAnswers = useCallback(
    async (next: OnboardingAnswers) => {
      onAnswersChange(next);
      await save.mutateAsync({ answers: next });
    },
    [onAnswersChange, save],
  );

  useEffect(() => {
    if (resendAfterSec <= 0) return;
    const id = window.setTimeout(() => setResendAfterSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [resendAfterSec]);

  const isBusy =
    save.isPending ||
    requestEmail.isPending ||
    confirmEmail.isPending ||
    completeRegister.isPending ||
    completeAuthenticated.isPending;

  function goBack() {
    setFieldErrors({});
    if (step === 'questions' && questionIndex > 0) {
      setQuestionIndex(questionIndex - 1);
      return;
    }
    const steps = personalStepsFor(isSignedIn);
    const idx = steps.indexOf(step);
    if (idx <= 0) {
      onBackToPurpose();
      return;
    }
    const prev = steps[idx - 1]!;
    if (prev === 'questions') {
      setQuestionIndex(Math.max(0, personalQuestions.length - 1));
    }
    setStep(prev);
  }

  async function saveName() {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'Ismni kiriting';
    if (!lastName.trim()) errors.lastName = 'Familiyani kiriting';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    try {
      await persistAnswers({
        ...answers,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setStep('age');
    } catch (error) {
      setFieldErrors({
        form: error instanceof Error ? error.message : t('onboarding.submitFailed'),
      });
    }
  }

  async function saveAge() {
    const errors = validatePersonalAge(age.trim());
    if (errors.length) {
      setFieldErrors(Object.fromEntries(errors.map((e) => [e.field, e.message])));
      return;
    }
    setFieldErrors({});
    try {
      await persistAnswers({ ...answers, age: age.trim() });
      setStep(isSignedIn ? 'questions' : 'email');
      setQuestionIndex(0);
    } catch (error) {
      setFieldErrors({
        form: error instanceof Error ? error.message : t('onboarding.submitFailed'),
      });
    }
  }

  async function sendEmailCode(isResend = false) {
    const normalized = normalizeEmail(email);
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setFieldErrors({ email: t('onboarding.register.emailInvalid') });
      return;
    }
    setFieldErrors({});
    try {
      const result = await requestEmail.mutateAsync({ email: normalized });
      if (result.next === 'login') {
        setFieldErrors({ email: t('onboarding.register.emailExists') });
        return;
      }
      setEmail(normalized);
      setEmailMasked(result.emailMasked ?? null);
      setResendAfterSec(result.resendAfterSec ?? 60);
      if (!isResend) {
        setOtp('');
        setStep('verify');
      }
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

  async function confirmOtp() {
    if (otp.length !== 6) {
      setFieldErrors({ code: t('onboarding.register.codeInvalid') });
      return;
    }
    setFieldErrors({});
    try {
      const result = await confirmEmail.mutateAsync({ email: normalizeEmail(email), code: otp });
      onSubmissionMeta({
        registerEmail: result.submission.registerEmail ?? email,
        emailVerifiedAt: result.submission.emailVerifiedAt ?? new Date().toISOString(),
      });
      setStep('password');
    } catch (error) {
      if (error instanceof ApiClientError && error.details?.length) {
        setFieldErrors(
          Object.fromEntries(error.details.map((item) => [item.field, item.message])),
        );
        return;
      }
      setFieldErrors({
        code: error instanceof Error ? error.message : t('onboarding.register.codeInvalid'),
      });
    }
  }

  const otpSubmittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 'verify' || otp.length !== 6 || confirmEmail.isPending) return;
    if (otpSubmittedRef.current === otp) return;
    otpSubmittedRef.current = otp;
    void confirmOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  function continuePassword() {
    const errors = validateRegisterPersonalAccountDraft({
      firstName: firstName.trim() || String(answers.firstName ?? ''),
      lastName: lastName.trim() || String(answers.lastName ?? ''),
      email: normalizeEmail(email) || 'x@y.z',
      password,
      passwordConfirmation,
    }).filter((e) => e.field === 'password' || e.field === 'passwordConfirmation');
    if (errors.length) {
      setFieldErrors(Object.fromEntries(errors.map((e) => [e.field, e.message])));
      return;
    }
    setFieldErrors({});
    const unanswered = PERSONAL_QUESTION_KEYS.findIndex((key) => {
      const value = answers[key];
      if (Array.isArray(value)) return value.length === 0;
      return !value;
    });
    if (unanswered < 0) {
      setStep('value');
      return;
    }
    setStep('questions');
    setQuestionIndex(unanswered);
  }

  async function continueQuestion() {
    if (!currentQuestion) return;
    const keys = selectedKeys(answers, currentQuestion.key);
    if (currentQuestion.required && keys.length === 0) {
      setFieldErrors({ [currentQuestion.key]: t('onboarding.errors.required') });
      return;
    }
    setFieldErrors({});
    try {
      await persistAnswers(answers);
      if (questionIndex + 1 < personalQuestions.length) {
        setQuestionIndex(questionIndex + 1);
        return;
      }
      setStep('value');
    } catch (error) {
      setFieldErrors({
        form: error instanceof Error ? error.message : t('onboarding.submitFailed'),
      });
    }
  }

  function setSingle(question: OnboardingQuestionDto, key: string) {
    onAnswersChange({ ...answers, [question.key]: key });
  }

  function toggleMulti(question: OnboardingQuestionDto, key: string) {
    const current = selectedKeys(answers, question.key);
    const nextValues = current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key];
    onAnswersChange({ ...answers, [question.key]: nextValues });
  }

  async function runCreate() {
    if (creatingStarted.current) return;
    creatingStarted.current = true;
    setChecklistDone(1);

    const tick = window.setInterval(() => {
      setChecklistDone((n) => Math.min(CREATING_CHECKLIST.length - 1, n + 1));
    }, 280);

    try {
      if (isSignedIn) {
        const result = await completeAuthenticated.mutateAsync({});
        window.clearInterval(tick);
        setChecklistDone(CREATING_CHECKLIST.length);
        sessionStorage.removeItem(TOKEN_KEY);
        if (result.user) {
          queryClient.setQueryData(authQueryKeys.currentUser, result.user);
          queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
        }
        navigate(ROUTES.personalDashboard, { replace: true });
        return;
      }

      const account = {
        firstName: firstName.trim() || String(answers.firstName ?? ''),
        lastName: lastName.trim() || String(answers.lastName ?? ''),
        email: normalizeEmail(email),
        password,
        passwordConfirmation,
      };
      const registerErrors = validateRegisterPersonalAccountDraft(account);
      if (registerErrors.length) {
        window.clearInterval(tick);
        creatingStarted.current = false;
        setFieldErrors(Object.fromEntries(registerErrors.map((e) => [e.field, e.message])));
        setStep('password');
        return;
      }

      const result = await completeRegister.mutateAsync(account);
      window.clearInterval(tick);
      setChecklistDone(CREATING_CHECKLIST.length);
      sessionStorage.removeItem(TOKEN_KEY);
      if (result.user) {
        queryClient.setQueryData(authQueryKeys.currentUser, result.user);
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
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
      window.clearInterval(tick);
      creatingStarted.current = false;
      if (error instanceof ApiClientError && error.details?.length) {
        setFieldErrors(
          Object.fromEntries(error.details.map((item) => [item.field, item.message])),
        );
      } else {
        setFieldErrors({
          form: error instanceof Error ? error.message : t('onboarding.submitFailed'),
        });
      }
      setStep('value');
    }
  }

  useEffect(() => {
    if (step !== 'creating') {
      creatingStarted.current = false;
      return;
    }
    void runCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const valueCards = useMemo(() => buildPersonalValueCards(answers), [answers]);
  const headline = useMemo(() => personalReadyHeadline(answers), [answers]);
  const personalAccounts = metricsQuery.data?.personalAccounts ?? 0;
  const showMetric = !metricsQuery.isError && personalAccounts > 0;

  function alert(message: string) {
    return (
      <div
        role="alert"
        className="mb-4 flex items-start gap-2.5 rounded-input border border-danger-100 bg-danger-50 p-3"
      >
        <AlertCircle className="mt-px size-4 shrink-0 text-danger-500" aria-hidden="true" />
        <p className="text-sm text-danger-700">{message}</p>
      </div>
    );
  }

  if (step === 'name') {
    return (
      <RegistrationShell
        title={t('onboarding.register.nameTitle')}
        subtitle={t('onboarding.register.nameHint')}
        progress={progress}
        onBack={goBack}
        backDisabled={isBusy}
        contentKey="name"
        footer={<ContinueButton busy={isBusy} onClick={() => void saveName()} />}
      >
        {fieldErrors.form ? alert(fieldErrors.form) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">{t('onboarding.fields.firstName')}</span>
            <input
              autoFocus
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => onEnterKey(e, () => void saveName())}
              className={fieldClass(Boolean(fieldErrors.firstName))}
            />
            {fieldErrors.firstName ? (
              <span className="block text-xs text-danger-600">{fieldErrors.firstName}</span>
            ) : null}
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">{t('onboarding.fields.lastName')}</span>
            <input
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => onEnterKey(e, () => void saveName())}
              className={fieldClass(Boolean(fieldErrors.lastName))}
            />
            {fieldErrors.lastName ? (
              <span className="block text-xs text-danger-600">{fieldErrors.lastName}</span>
            ) : null}
          </label>
        </div>
      </RegistrationShell>
    );
  }

  if (step === 'age') {
    return (
      <RegistrationShell
        title={t('onboarding.register.ageTitle')}
        subtitle={t('onboarding.register.ageHint')}
        progress={progress}
        onBack={goBack}
        backDisabled={isBusy}
        contentKey="age"
        footer={<ContinueButton busy={isBusy} onClick={() => void saveAge()} />}
      >
        {fieldErrors.form ? alert(fieldErrors.form) : null}
        <label className="block space-y-1.5">
          <span className="sr-only">{t('onboarding.register.ageTitle')}</span>
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            min={PERSONAL_AGE_MIN}
            max={PERSONAL_AGE_MAX}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onKeyDown={(e) => onEnterKey(e, () => void saveAge())}
            className={fieldClass(Boolean(fieldErrors.age))}
            placeholder={`${PERSONAL_AGE_MIN}–${PERSONAL_AGE_MAX}`}
          />
          {fieldErrors.age ? (
            <span className="block text-xs text-danger-600">{fieldErrors.age}</span>
          ) : null}
        </label>
      </RegistrationShell>
    );
  }

  if (step === 'email') {
    return (
      <RegistrationShell
        title={t('onboarding.register.emailTitle')}
        subtitle={t('onboarding.register.emailHint')}
        progress={progress}
        onBack={goBack}
        backDisabled={isBusy}
        contentKey="email"
        footer={<ContinueButton busy={isBusy} onClick={() => void sendEmailCode()} />}
      >
        {fieldErrors.form ? alert(fieldErrors.form) : null}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            autoFocus
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => onEnterKey(e, () => void sendEmailCode())}
            className={fieldClass(Boolean(fieldErrors.email))}
          />
          {fieldErrors.email ? (
            <span className="block text-xs text-danger-600">{fieldErrors.email}</span>
          ) : null}
        </label>
      </RegistrationShell>
    );
  }

  if (step === 'verify') {
    return (
      <RegistrationShell
        title={t('onboarding.register.verifyTitle')}
        subtitle={t('onboarding.register.verifyHint', {
          email: emailMasked ?? email,
        })}
        progress={progress}
        onBack={goBack}
        backDisabled={isBusy}
        contentKey="verify"
        footer={<ContinueButton busy={isBusy} onClick={() => void confirmOtp()} />}
      >
        {fieldErrors.form ? alert(fieldErrors.form) : null}
        <OtpCodeInput
          value={otp}
          onChange={setOtp}
          disabled={isBusy}
          error={Boolean(fieldErrors.code)}
          aria-label={t('onboarding.register.verifyTitle')}
        />
        {fieldErrors.code ? (
          <p className="mt-3 text-center text-xs text-danger-600">{fieldErrors.code}</p>
        ) : null}
        <div className="mt-5 text-center text-sm text-ink-muted">
          {resendAfterSec > 0 ? (
            <span>{t('onboarding.register.resendIn', { sec: resendAfterSec })}</span>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void sendEmailCode(true)}
              className="font-medium text-brand-700 hover:underline disabled:opacity-60"
            >
              {t('onboarding.register.resend')}
            </button>
          )}
        </div>
      </RegistrationShell>
    );
  }

  if (step === 'password') {
    return (
      <RegistrationShell
        title={t('onboarding.register.passwordTitle')}
        subtitle={t('onboarding.register.passwordHint', { min: PERSONAL_PASSWORD_MIN })}
        progress={progress}
        onBack={goBack}
        backDisabled={isBusy}
        contentKey="password"
        footer={<ContinueButton busy={isBusy} onClick={continuePassword} />}
      >
        {fieldErrors.form ? alert(fieldErrors.form) : null}
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">{t('auth.password')}</span>
            <div className="relative">
              <input
                autoFocus
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => onEnterKey(e, continuePassword)}
                className={cn(fieldClass(Boolean(fieldErrors.password)), 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-subtle hover:text-ink-soft"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.password ? (
              <span className="block text-xs text-danger-600">{fieldErrors.password}</span>
            ) : null}
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">
              {t('onboarding.fields.passwordConfirmation')}
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              onKeyDown={(e) => onEnterKey(e, continuePassword)}
              className={fieldClass(Boolean(fieldErrors.passwordConfirmation))}
            />
            {fieldErrors.passwordConfirmation ? (
              <span className="block text-xs text-danger-600">
                {fieldErrors.passwordConfirmation}
              </span>
            ) : null}
          </label>
        </div>
      </RegistrationShell>
    );
  }

  if (step === 'questions' && currentQuestion) {
    const selected = selectedKeys(answers, currentQuestion.key);
    return (
      <RegistrationShell
        title={promptFor(currentQuestion, language)}
        subtitle={hintFor(currentQuestion, language) ?? undefined}
        progress={progress}
        onBack={goBack}
        backDisabled={isBusy}
        contentKey={`q-${currentQuestion.key}`}
        footer={<ContinueButton busy={isBusy} onClick={() => void continueQuestion()} />}
      >
        {fieldErrors.form || fieldErrors[currentQuestion.key]
          ? alert(fieldErrors.form ?? fieldErrors[currentQuestion.key]!)
          : null}
        <div className="grid gap-2">
          {currentQuestion.options.map((option) => {
            const isOn = selected.includes(option.key);
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={isOn}
                onClick={() =>
                  currentQuestion.answerType === 'MULTI'
                    ? toggleMulti(currentQuestion, option.key)
                    : setSingle(currentQuestion, option.key)
                }
                className={cn(
                  'rounded-input border px-3 py-3 text-left text-sm transition-colors duration-150',
                  isOn
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-line-strong text-ink hover:border-ink-subtle',
                )}
              >
                {isOn ? `✓ ${optionLabel(option, language)}` : optionLabel(option, language)}
              </button>
            );
          })}
        </div>
      </RegistrationShell>
    );
  }

  if (step === 'value') {
    return (
      <RegistrationShell
        title={isRu ? headline.ru : headline.uz}
        subtitle={t('onboarding.register.valueHint')}
        progress={progress}
        onBack={goBack}
        backDisabled={isBusy}
        contentKey="value"
        footer={
          <ContinueButton
            label={t('onboarding.register.start')}
            busy={isBusy}
            onClick={() => setStep('creating')}
          />
        }
      >
        {fieldErrors.form ? alert(fieldErrors.form) : null}
        {showMetric ? (
          <p className="mb-4 text-sm text-ink-muted">
            {t('onboarding.register.accountsMetric', {
              count: personalAccounts.toLocaleString(isRu ? 'ru-RU' : 'uz-UZ'),
            })}
          </p>
        ) : null}
        <ul className="space-y-3">
          {valueCards.map((card) => (
            <li
              key={card.id}
              className={cn(
                'rounded-panel border px-4 py-3 transition-colors duration-200',
                card.emphasized
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-line bg-surface-muted/60',
              )}
            >
              <p className="text-sm font-semibold text-ink">{isRu ? card.titleRu : card.titleUz}</p>
              <p className="mt-1 text-sm text-ink-muted">{isRu ? card.bodyRu : card.bodyUz}</p>
            </li>
          ))}
        </ul>
      </RegistrationShell>
    );
  }

  // creating
  return (
    <RegistrationShell
      title={t('onboarding.register.creatingTitle')}
      subtitle={t('onboarding.register.creatingHint')}
      progress={null}
      contentKey="creating"
    >
      <ul className="space-y-3">
        {CREATING_CHECKLIST.map((item, index) => {
          const done = index < checklistDone;
          const active = index === checklistDone && checklistDone < CREATING_CHECKLIST.length;
          return (
            <li
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-input px-3 py-2.5 transition-colors duration-200',
                done ? 'text-brand-700' : active ? 'text-ink' : 'text-ink-subtle',
              )}
            >
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border transition-colors duration-200',
                  done
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-line-strong bg-surface',
                )}
              >
                {done ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : active ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : null}
              </span>
              <span className="text-sm font-medium">{isRu ? item.labelRu : item.labelUz}</span>
            </li>
          );
        })}
      </ul>
    </RegistrationShell>
  );
}
