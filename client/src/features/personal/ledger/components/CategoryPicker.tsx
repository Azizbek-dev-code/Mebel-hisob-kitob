import { type PersonalCategoryDto } from '@furniture-erp/shared';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { CategoryGlyph } from './CategoryGlyph';

export function CategoryPicker({
  items,
  value,
  onChange,
}: {
  items: PersonalCategoryDto[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const parents = useMemo(
    () => items.filter((item) => !item.parentId && item.isActive),
    [items],
  );
  const selected = items.find((item) => item.id === value);
  const parentId = selected?.parentId || selected?.id || parents[0]?.id || '';
  const children = useMemo(
    () => items.filter((item) => item.parentId === parentId && item.isActive),
    [items, parentId],
  );

  function chooseParent(id: string) {
    const firstChild = items.find((item) => item.parentId === id && item.isActive);
    onChange(firstChild?.id ?? id);
  }

  return (
    <div className="space-y-2">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink">{t('personal.categories')}</span>
        <select
          value={parentId}
          onChange={(event) => chooseParent(event.target.value)}
          className="w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500"
        >
          {parents.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      {children.length > 0 ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">{t('personal.subcategory')}</span>
          <select
            value={children.some((item) => item.id === value) ? value : ''}
            onChange={(event) => onChange(event.target.value || parentId)}
            className="w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500"
          >
            <option value="">{t('personal.subcategoryOptional')}</option>
            {children.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selected ? (
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <CategoryGlyph category={selected} />
          {selected.name}
        </p>
      ) : null}
    </div>
  );
}
