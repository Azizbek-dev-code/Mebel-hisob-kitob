import {
  SMM_BLOCK_KINDS,
  SMM_BLOCK_KIND_LABELS,
  SmmBlockKind,
  type SmmContentBlockDto,
  type SmmContentBlockInput,
} from '@furniture-erp/shared';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface ContentBlocksEditorProps {
  blocks: SmmContentBlockDto[];
  onSave: (blocks: SmmContentBlockInput[]) => Promise<void>;
  busy?: boolean;
}

type DraftBlock = SmmContentBlockInput & { key: string };

function toDraft(blocks: SmmContentBlockDto[]): DraftBlock[] {
  return blocks.map((b, index) => ({
    key: b.id,
    kind: b.kind,
    title: b.title,
    body: b.body,
    visualDirection: b.visualDirection,
    referenceText: b.referenceText,
    sortOrder: index,
  }));
}

export function ContentBlocksEditor({ blocks, onSave, busy }: ContentBlocksEditorProps) {
  const [draft, setDraft] = useState<DraftBlock[]>(() => toDraft(blocks));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(blocks));
  }, [blocks]);

  function update(index: number, patch: Partial<DraftBlock>) {
    setDraft((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, delta: number) {
    setDraft((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next.map((item, i) => ({ ...item, sortOrder: i }));
    });
  }

  function remove(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i })));
  }

  function addBlock() {
    setDraft((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        kind: SmmBlockKind.TEXT,
        title: '',
        body: '',
        visualDirection: '',
        referenceText: '',
        sortOrder: prev.length,
      },
    ]);
  }

  async function handleSave() {
    setError(null);
    try {
      await onSave(
        draft.map(({ kind, title, body, visualDirection, referenceText, sortOrder }) => ({
          kind,
          title: title || null,
          body: body || null,
          visualDirection: visualDirection || null,
          referenceText: referenceText || null,
          sortOrder,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bloklarni saqlab bo‘lmadi');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Kontent bloklari</h3>
        <button type="button" className={BTN_SECONDARY} onClick={addBlock}>
          <Plus className="size-4" />
          Blok qo‘shish
        </button>
      </div>

      {draft.length === 0 ? (
        <p className="rounded-input border border-dashed border-line px-3 py-6 text-center text-sm text-ink-muted">
          Hali blok yo‘q. Hook, slide yoki CTA qo‘shing.
        </p>
      ) : (
        <ul className="space-y-3">
          {draft.map((block, index) => (
            <li key={block.key} className="rounded-input border border-line bg-surface p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <select
                  className={FIELD_CLASS}
                  value={block.kind}
                  onChange={(e) => update(index, { kind: e.target.value as typeof block.kind })}
                >
                  {SMM_BLOCK_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {SMM_BLOCK_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Yuqoriga"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={() => move(index, 1)}
                    disabled={index === draft.length - 1}
                    aria-label="Pastga"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={() => remove(index)}
                    aria-label="O‘chirish"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <input
                  className={FIELD_CLASS}
                  placeholder="Sarlavha"
                  value={block.title ?? ''}
                  onChange={(e) => update(index, { title: e.target.value })}
                />
                <textarea
                  className={FIELD_CLASS}
                  rows={3}
                  placeholder="Matn"
                  value={block.body ?? ''}
                  onChange={(e) => update(index, { body: e.target.value })}
                />
                <input
                  className={FIELD_CLASS}
                  placeholder="Vizual yo‘nalish"
                  value={block.visualDirection ?? ''}
                  onChange={(e) => update(index, { visualDirection: e.target.value })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      <button type="button" className={BTN_PRIMARY} disabled={busy} onClick={() => void handleSave()}>
        Bloklarni saqlash
      </button>
    </div>
  );
}
