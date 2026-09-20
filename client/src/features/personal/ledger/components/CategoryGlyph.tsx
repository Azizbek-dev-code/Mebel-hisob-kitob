import { personalCategoryIcon, personalCategoryIconColor, personalCategoryIconName } from '@furniture-erp/shared';

import { cn } from '@/lib/cn';

import { LUCIDE_CATEGORY_ICON_MAP } from './lucide-category-icons';

export function CategoryGlyph({
  category,
  className,
}: {
  category: {
    icon?: string | null;
    iconName?: string | null;
    iconColor?: string | null;
    key?: string | null;
  };
  className?: string;
}) {
  const name = personalCategoryIconName(category);
  const Icon = name ? LUCIDE_CATEGORY_ICON_MAP[name] : null;
  const color = personalCategoryIconColor(category) ?? undefined;
  if (Icon) {
    return <Icon className={cn('size-4 shrink-0', className)} style={{ color }} aria-hidden="true" />;
  }
  return (
    <span className={cn('text-base', className)} aria-hidden="true">
      {personalCategoryIcon(category)}
    </span>
  );
}
