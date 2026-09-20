import { PersonalCategoryKind, type PersonalCategoryDto } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen } from '@/test/test-utils';

import { CategoryPicker } from './CategoryPicker';

const ITEMS: PersonalCategoryDto[] = [
  {
    id: 'cat_food',
    kind: PersonalCategoryKind.EXPENSE,
    key: 'FOOD',
    name: 'Oziq-ovqat',
    color: 'teal',
    icon: '🍔',
    iconName: null,
    iconColor: null,
    parentId: null,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'cat_cafe',
    kind: PersonalCategoryKind.EXPENSE,
    key: null,
    name: 'Kafe',
    color: 'teal',
    icon: null,
    iconName: 'Coffee',
    iconColor: '#0F766E',
    parentId: 'cat_food',
    sortOrder: 1,
    isActive: true,
  },
];

describe('CategoryPicker', () => {
  it('picks a parent then a subcategory from dropdowns', async () => {
    const user = userEvent.setup();
    let value = 'cat_food';
    const { rerender } = renderWithProviders(
      <CategoryPicker items={ITEMS} value={value} onChange={(id) => { value = id; }} />,
    );

    expect(screen.getByRole('combobox', { name: /Kategoriyalar/ })).toHaveValue('cat_food');
    expect(screen.getByRole('combobox', { name: /Ichki kategoriya/ })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /Ichki kategoriya/ }), 'cat_cafe');
    expect(value).toBe('cat_cafe');

    rerender(<CategoryPicker items={ITEMS} value={value} onChange={(id) => { value = id; }} />);
    expect(screen.getByRole('combobox', { name: /Ichki kategoriya/ })).toHaveValue('cat_cafe');
  });
});
