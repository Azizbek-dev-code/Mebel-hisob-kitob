import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Dialog } from '@/components/ui/Dialog';
import { SearchSelect, type SearchSelectOption } from '@/features/sales/components/SearchSelect';
import { resetBodyScrollLockForTests } from '@/lib/body-scroll-lock';

afterEach(() => {
  cleanup();
  resetBodyScrollLockForTests();
});

describe('Dialog portal mounting', () => {
  it('renders overlay under document.body, not inside the caller subtree', () => {
    const host = document.createElement('div');
    host.id = 'dialog-host';
    document.body.appendChild(host);

    render(
      <Dialog open title="Test dialog" onClose={() => undefined}>
        <p>Dialog body</p>
      </Dialog>,
      { container: host },
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(host.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);

    host.remove();
  });

  it('can open and close repeatedly without throwing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <Dialog open title="Toggle" onClose={onClose}>
        <button type="button">Inside</button>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <Dialog open={false} title="Toggle" onClose={onClose}>
        <button type="button">Inside</button>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(
      <Dialog open title="Toggle" onClose={onClose}>
        <button type="button">Inside</button>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});

describe('SearchSelect selection race', () => {
  const options: SearchSelectOption[] = [
    { id: 'c1', label: 'Ali Valiyev', description: '+998901112233' },
    { id: 'c2', label: 'Dilnoza Karimova', description: '+998909998877' },
  ];

  it('selects an option via mousedown without DOM exceptions', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onQueryChange = vi.fn();

    const { rerender } = render(
      <SearchSelect
        label="Customer"
        value={null}
        options={options}
        query=""
        onQueryChange={onQueryChange}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('button', { name: /Ali Valiyev/i }));

    expect(onChange).toHaveBeenCalledWith(options[0]);

    rerender(
      <SearchSelect
        label="Customer"
        value={options[0] ?? null}
        options={options}
        query=""
        onQueryChange={onQueryChange}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Ali Valiyev')).toBeTruthy();
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
