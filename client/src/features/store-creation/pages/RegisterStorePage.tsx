import { zodResolver } from '@hookform/resolvers/zod';
import {
  UZBEKISTAN_REGIONS,
  validateStoreCreationDraft,
  type CreateStoreRequestBody,
} from '@furniture-erp/shared';
import { AlertCircle, Loader2, Store } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import { useCreateStoreRequest } from '../hooks/use-store-creation';

const registerStoreSchema = z
  .object({
    applicantFirstName: z.string(),
    applicantLastName: z.string(),
    phone: z.string(),
    email: z.string(),
    username: z.string(),
    password: z.string(),
    passwordConfirmation: z.string(),
    storeName: z.string(),
    region: z.string(),
    district: z.string(),
    address: z.string(),
  })
  .superRefine((value, ctx) => {
    for (const error of validateStoreCreationDraft(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [error.field], message: error.message });
    }
  });

type RegisterStoreValues = z.infer<typeof registerStoreSchema>;

const fieldClass = (hasError: boolean) =>
  cn(
    'w-full rounded-input border bg-surface px-3 py-2.5 text-sm text-ink transition-colors',
    'placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:bg-surface-muted',
    hasError ? 'border-danger-500' : 'border-line-strong hover:border-ink-subtle',
  );

export function RegisterStorePage() {
  const navigate = useNavigate();
  const createRequest = useCreateStoreRequest();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterStoreValues>({
    resolver: zodResolver(registerStoreSchema),
    defaultValues: {
      applicantFirstName: '',
      applicantLastName: '',
      phone: '',
      email: '',
      username: '',
      password: '',
      passwordConfirmation: '',
      storeName: '',
      region: '',
      district: '',
      address: '',
    },
  });

  const isSubmitting = createRequest.isPending;
  const submitError = createRequest.error ? describeFailure(createRequest.error) : null;

  const onSubmit = handleSubmit((values) => {
    const body: CreateStoreRequestBody = values;
    createRequest.mutate(body, {
      onSuccess: ({ request }) => {
        navigate(ROUTES.registerStoreStatus(request.id), { replace: true });
      },
      onError: (error) => {
        if (error instanceof ApiClientError && error.details?.length) {
          for (const detail of error.details) {
            const field = detail.field as keyof RegisterStoreValues;
            if (field in values) {
              setError(field, { message: detail.message });
            }
          }
        }
      },
    });
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-card bg-brand-500 text-white shadow-raised">
            <Store className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Yangi do&apos;kon ochish</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Ariza Platform Admin tomonidan ko&apos;rib chiqiladi. Do&apos;kon darhol ochilmaydi.
            </p>
          </div>
        </div>

        <div className="mt-7 rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          {submitError ? (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-input border border-danger-100 bg-danger-50 p-3"
            >
              <AlertCircle className="mt-px size-4 shrink-0 text-danger-500" aria-hidden="true" />
              <p className="text-sm text-danger-700">{submitError}</p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-ink">Ariza beruvchi</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="applicantFirstName" label="Ism" error={errors.applicantFirstName?.message}>
                  <input
                    {...register('applicantFirstName')}
                    id="applicantFirstName"
                    disabled={isSubmitting}
                    autoComplete="given-name"
                    className={fieldClass(Boolean(errors.applicantFirstName))}
                  />
                </Field>
                <Field id="applicantLastName" label="Familiya" error={errors.applicantLastName?.message}>
                  <input
                    {...register('applicantLastName')}
                    id="applicantLastName"
                    disabled={isSubmitting}
                    autoComplete="family-name"
                    className={fieldClass(Boolean(errors.applicantLastName))}
                  />
                </Field>
                <Field id="phone" label="Telefon raqami" error={errors.phone?.message}>
                  <input
                    {...register('phone')}
                    id="phone"
                    type="tel"
                    disabled={isSubmitting}
                    autoComplete="tel"
                    placeholder="+998 XX XXX XX XX"
                    className={fieldClass(Boolean(errors.phone))}
                  />
                </Field>
                <Field id="email" label="Email" error={errors.email?.message}>
                  <input
                    {...register('email')}
                    id="email"
                    type="email"
                    disabled={isSubmitting}
                    autoComplete="email"
                    className={fieldClass(Boolean(errors.email))}
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-ink">Do&apos;kon</legend>
              <Field id="storeName" label="Do'kon nomi" error={errors.storeName?.message}>
                <input
                  {...register('storeName')}
                  id="storeName"
                  disabled={isSubmitting}
                  className={fieldClass(Boolean(errors.storeName))}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="region" label="Viloyat" error={errors.region?.message}>
                  <select
                    {...register('region')}
                    id="region"
                    disabled={isSubmitting}
                    className={fieldClass(Boolean(errors.region))}
                  >
                    <option value="">Tanlang</option>
                    {UZBEKISTAN_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="district" label="Tuman/shahar" error={errors.district?.message}>
                  <input
                    {...register('district')}
                    id="district"
                    disabled={isSubmitting}
                    className={fieldClass(Boolean(errors.district))}
                  />
                </Field>
              </div>
              <Field id="address" label="Manzil" error={errors.address?.message}>
                <input
                  {...register('address')}
                  id="address"
                  disabled={isSubmitting}
                  autoComplete="street-address"
                  className={fieldClass(Boolean(errors.address))}
                />
              </Field>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-ink">Account</legend>
              <Field id="username" label="Login" error={errors.username?.message}>
                <input
                  {...register('username')}
                  id="username"
                  disabled={isSubmitting}
                  autoComplete="username"
                  className={fieldClass(Boolean(errors.username))}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="password" label="Password" error={errors.password?.message}>
                  <input
                    {...register('password')}
                    id="password"
                    type="password"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    className={fieldClass(Boolean(errors.password))}
                  />
                </Field>
                <Field
                  id="passwordConfirmation"
                  label="Password confirmation"
                  error={errors.passwordConfirmation?.message}
                >
                  <input
                    {...register('passwordConfirmation')}
                    id="passwordConfirmation"
                    type="password"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    className={fieldClass(Boolean(errors.passwordConfirmation))}
                  />
                </Field>
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isSubmitting ? 'Yuborilmoqda…' : "Do'kon ochish uchun ariza yuborish"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Allaqachon hisobingiz bormi?{' '}
          <Link to={ROUTES.login} className="font-medium text-brand-700 hover:underline">
            Kirish
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describeFailure(error: Error): string {
  if (error instanceof ApiClientError) {
    if (error.isValidationError && error.details?.length) {
      return error.details[0]?.message ?? error.message;
    }
    return error.message;
  }
  return "Ma'lumot saqlanmadi. Server bilan bog'lanishda xatolik.";
}
