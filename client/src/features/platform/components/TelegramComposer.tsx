import { Loader2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiClientError } from '@/lib/api-client';
import { platformTelegramService } from '@/services/platform-telegram.service';

import { TelegramMessagePreview } from './TelegramMessagePreview';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export interface TelegramComposerValue {
  text: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
}

export function TelegramComposer({
  value,
  onChange,
  submitLabel,
  onSubmit,
  pending,
  error,
  children,
}: {
  value: TelegramComposerValue;
  onChange: (next: TelegramComposerValue) => void;
  submitLabel: string;
  onSubmit: () => Promise<void>;
  pending: boolean;
  error: string | null;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await platformTelegramService.uploadMedia(file);
      onChange({ ...value, imageUrl: result.url });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('platformAdmin.telegram.image')}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="block w-full text-sm"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          {value.imageUrl ? (
            <input
              className={fieldClass}
              value={value.imageUrl}
              onChange={(event) => onChange({ ...value, imageUrl: event.target.value })}
            />
          ) : null}
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('platformAdmin.telegram.text')}</span>
          <textarea
            className={fieldClass}
            rows={8}
            value={value.text}
            onChange={(event) => onChange({ ...value, text: event.target.value })}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('platformAdmin.telegram.buttonText')}</span>
          <input
            className={fieldClass}
            value={value.buttonText}
            onChange={(event) => onChange({ ...value, buttonText: event.target.value })}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('platformAdmin.telegram.buttonUrl')}</span>
          <input
            className={fieldClass}
            value={value.buttonUrl}
            onChange={(event) => onChange({ ...value, buttonUrl: event.target.value })}
          />
        </label>
        {children}
        {error ? (
          <p role="alert" className="text-sm text-danger-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || uploading}
          className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending || uploading ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </button>
      </form>
      <div>
        <p className="mb-2 text-sm font-medium text-ink">{t('platformAdmin.telegram.preview')}</p>
        <TelegramMessagePreview
          content={{
            text: value.text,
            imageUrl: value.imageUrl || null,
            buttonText: value.buttonText || null,
            buttonUrl: value.buttonUrl || null,
          }}
        />
      </div>
    </div>
  );
}

export function composerError(caught: unknown, fallback: string): string {
  if (!(caught instanceof ApiClientError)) return fallback;
  const detailMessages = caught.details
    ?.map((detail) => detail.message?.trim())
    .filter((message): message is string => Boolean(message));
  if (detailMessages?.length) {
    return detailMessages.join('; ');
  }
  return caught.message || fallback;
}

/** Client-side checks that mirror backend start/broadcast rich-content rules. */
export function validateTelegramComposerFields(value: TelegramComposerValue): string | null {
  const text = value.text.trim();
  const imageUrl = value.imageUrl.trim();
  if (!text && !imageUrl) {
    return 'Matn yoki rasm kerak';
  }
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return 'Rasm URL https bo‘lishi kerak';
      }
    } catch {
      return 'Rasm URL https bo‘lishi kerak';
    }
  }

  const buttonText = value.buttonText.trim();
  const buttonUrl = value.buttonUrl.trim();
  if (Boolean(buttonText) !== Boolean(buttonUrl)) {
    return buttonText
      ? 'Tugma URL kiriting (masalan: https://balancy.space)'
      : 'Tugma matni ham kiriting';
  }
  if (buttonUrl) {
    try {
      const parsed = new URL(buttonUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return 'Tugma URL http(s) bo‘lishi kerak (masalan: https://balancy.space)';
      }
    } catch {
      return 'Tugma URL noto‘g‘ri. Format: https://balancy.space';
    }
  }
  return null;
}
