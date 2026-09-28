import {
  SMM_CONTENT_TYPES,
  SMM_CONTENT_TYPE_LABELS,
  SMM_PLATFORMS,
  SMM_PLATFORM_LABELS,
  SmmContentType,
  SmmPlatform,
  type CreateSmmContentItemRequest,
  type SmmContentItemDetail,
  type SmmContentType as SmmContentTypeT,
  type SmmPlatform as SmmPlatformT,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';

import { useCreateSmmContent } from '../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface ContentFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultPublishAt?: string | null;
  defaultContentType?: SmmContentTypeT;
  onCreated?: (item: SmmContentItemDetail) => void;
}

export function ContentFormDialog({
  open,
  onClose,
  projectId,
  defaultPublishAt,
  defaultContentType = SmmContentType.REELS,
  onCreated,
}: ContentFormDialogProps) {
  const createContent = useCreateSmmContent(projectId);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<SmmPlatformT>(SmmPlatform.INSTAGRAM);
  const [contentType, setContentType] = useState<SmmContentTypeT>(defaultContentType);
  const [publishAt, setPublishAt] = useState(defaultPublishAt?.slice(0, 10) ?? '');
  const [hook, setHook] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle('');
    setPlatform(SmmPlatform.INSTAGRAM);
    setContentType(defaultContentType);
    setPublishAt(defaultPublishAt?.slice(0, 10) ?? '');
    setHook('');
    setCaption('');
  }, [open, defaultContentType, defaultPublishAt]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Sarlavha majburiy');
      return;
    }
    const body: CreateSmmContentItemRequest = {
      title: title.trim(),
      platform,
      contentType,
      publishAt: publishAt ? `${publishAt}T12:00:00.000Z` : null,
      hook: hook.trim() || null,
      caption: caption.trim() || null,
    };
    try {
      const item = await createContent.mutateAsync(body);
      onCreated?.(item);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Yaratib bo‘lmadi');
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Yangi kontent"
      description="Tezkor yaratish — keyin to‘liq tahrirlashingiz mumkin"
      className="sm:max-w-lg"
    >
      <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Sarlavha *</span>
          <input className={FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Platforma</span>
            <select
              className={FIELD_CLASS}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as typeof platform)}
            >
              {SMM_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {SMM_PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Tur</span>
            <select
              className={FIELD_CLASS}
              value={contentType}
              onChange={(e) => setContentType(e.target.value as typeof contentType)}
            >
              {SMM_CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SMM_CONTENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Nashr sanasi</span>
          <input
            type="date"
            className={FIELD_CLASS}
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
          />
        </label>
        {(contentType === SmmContentType.REELS || contentType === SmmContentType.STORY) && (
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Hook</span>
            <input className={FIELD_CLASS} value={hook} onChange={(e) => setHook(e.target.value)} />
          </label>
        )}
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Caption</span>
          <textarea
            className={FIELD_CLASS}
            rows={2}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={BTN_SECONDARY} onClick={onClose}>
            Bekor
          </button>
          <button type="submit" className={BTN_PRIMARY} disabled={createContent.isPending}>
            {createContent.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Yaratish
          </button>
        </div>
      </form>
    </Dialog>
  );
}
