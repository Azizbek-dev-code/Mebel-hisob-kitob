import {
  SMM_CONTENT_TYPE_LABELS,
  SMM_TEMPLATE_SCOPE_LABELS,
  SmmTemplateScope,
  type SmmContentType,
  type SmmTemplateScope as SmmTemplateScopeType,
} from '@furniture-erp/shared';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ApiClientError } from '@/lib/api-client';

import { useApplySmmTemplate, useSmmTemplates } from '../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  contentType?: SmmContentType | 'ALL';
  publishAt?: string | null;
  onApplied?: (contentId: string) => void;
}

export function TemplatePickerDialog({
  open,
  onClose,
  projectId,
  contentType = 'ALL',
  publishAt,
  onApplied,
}: TemplatePickerDialogProps) {
  const [scopeFilter, setScopeFilter] = useState<'ALL' | SmmTemplateScopeType>('ALL');
  const templates = useSmmTemplates(
    {
      projectId,
      contentType,
      scope: scopeFilter,
      pageSize: 50,
      includeArchived: false,
    },
    open,
  );
  const apply = useApplySmmTemplate(projectId);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const items = (templates.data?.items ?? []).filter((t) =>
    search.trim()
      ? t.name.toLowerCase().includes(search.trim().toLowerCase())
      : true,
  );

  async function handleApply(templateId: string) {
    setError(null);
    try {
      const item = await apply.mutateAsync({
        templateId,
        publishAt: publishAt ? `${publishAt}T12:00:00.000Z` : null,
      });
      onApplied?.(item.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Qo‘llab bo‘lmadi');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Shablondan yaratish" className="sm:max-w-lg">
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={FIELD_CLASS}
            placeholder="Qidirish…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={FIELD_CLASS}
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as typeof scopeFilter)}
          >
            <option value="ALL">Barcha doiralar</option>
            <option value={SmmTemplateScope.PROJECT}>{SMM_TEMPLATE_SCOPE_LABELS.PROJECT}</option>
            <option value={SmmTemplateScope.AGENCY}>{SMM_TEMPLATE_SCOPE_LABELS.AGENCY}</option>
          </select>
        </div>
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
        {templates.isLoading ? (
          <p className="text-sm text-ink-muted">Yuklanmoqda…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={LayoutTemplate} title="Shablon yo‘q" description="Avval kontentni shablon sifatida saqlang" />
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((tpl) => (
              <li
                key={tpl.id}
                className="flex items-center justify-between gap-2 rounded-input border border-line bg-surface px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{tpl.name}</p>
                  <p className="text-xs text-ink-muted">
                    {SMM_CONTENT_TYPE_LABELS[tpl.contentType]} · {SMM_TEMPLATE_SCOPE_LABELS[tpl.scope]}
                  </p>
                </div>
                <button
                  type="button"
                  className={BTN_PRIMARY}
                  disabled={apply.isPending}
                  onClick={() => void handleApply(tpl.id)}
                >
                  {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Tanlash
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <button type="button" className={BTN_SECONDARY} onClick={onClose}>
            Yopish
          </button>
        </div>
      </div>
    </Dialog>
  );
}
