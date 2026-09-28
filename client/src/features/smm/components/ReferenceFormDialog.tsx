import {
  SMM_CONTENT_TYPES,
  SMM_CONTENT_TYPE_LABELS,
  SMM_PLATFORMS,
  SMM_PLATFORM_LABELS,
  SmmContentType,
  SmmPlatform,
  type CreateSmmContentReferenceRequest,
  type SmmContentReferenceListItem,
  type SmmContentType as SmmContentTypeT,
  type SmmPlatform as SmmPlatformT,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';

import { useCreateSmmReference, useUpdateSmmReference } from '../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface ReferenceFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  reference?: SmmContentReferenceListItem | null;
  onSaved?: () => void;
}

export function ReferenceFormDialog({
  open,
  onClose,
  projectId,
  reference = null,
  onSaved,
}: ReferenceFormDialogProps) {
  const create = useCreateSmmReference(projectId);
  const update = useUpdateSmmReference(projectId);
  const pending = create.isPending || update.isPending;

  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<SmmPlatformT>(SmmPlatform.INSTAGRAM);
  const [contentType, setContentType] = useState<SmmContentTypeT>(SmmContentType.REELS);
  const [sourceUrl, setSourceUrl] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [hook, setHook] = useState('');
  const [whySaved, setWhySaved] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(reference?.title ?? '');
    setPlatform(reference?.platform ?? SmmPlatform.INSTAGRAM);
    setContentType(reference?.contentType ?? SmmContentType.REELS);
    setSourceUrl(reference?.sourceUrl ?? '');
    setCreatorName(reference?.creatorName ?? '');
    setHook('');
    setWhySaved('');
    setTags(reference?.tags?.join(', ') ?? '');
  }, [open, reference]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Sarlavha majburiy');
      return;
    }
    const body: CreateSmmContentReferenceRequest = {
      title: title.trim(),
      platform,
      contentType,
      sourceUrl: sourceUrl.trim() || null,
      creatorName: creatorName.trim() || null,
      hook: hook.trim() || null,
      whySaved: whySaved.trim() || null,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      if (reference) await update.mutateAsync({ referenceId: reference.id, body });
      else await create.mutateAsync(body);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={reference ? 'Referensni tahrirlash' : 'Yangi referens'}>
      <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Sarlavha *</span>
          <input className={FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
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
            <span className="mb-1 block text-ink-soft">Tur</span>
            <select className={FIELD_CLASS} value={contentType} onChange={(e) => setContentType(e.target.value as typeof contentType)}>
              {SMM_CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>{SMM_CONTENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Manba URL</span>
          <input className={FIELD_CLASS} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Muallif</span>
          <input className={FIELD_CLASS} value={creatorName} onChange={(e) => setCreatorName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Hook</span>
          <input className={FIELD_CLASS} value={hook} onChange={(e) => setHook(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Nega saqlandi</span>
          <textarea className={FIELD_CLASS} rows={2} value={whySaved} onChange={(e) => setWhySaved(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-ink-soft">Teglar</span>
          <input className={FIELD_CLASS} value={tags} onChange={(e) => setTags(e.target.value)} />
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
