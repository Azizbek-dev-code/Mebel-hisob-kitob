import { ACCOUNT_DELETE_CONFIRMATION } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AccountDeleteSection } from '@/features/settings/components/AccountDeleteSection';
import { renderWithProviders, screen, within } from '@/test/test-utils';

describe('AccountDeleteSection', () => {
  it('keeps the final delete button disabled until password and phrase match', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter>
        <AccountDeleteSection />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Davom etish' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Nimalar o‘chiriladi?')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Davom etish' }));
    await user.click(within(dialog).getByText('Dastur menga kerak emas'));
    await user.click(within(dialog).getByRole('button', { name: 'Davom etish' }));

    const confirm = within(dialog).getByRole('button', { name: 'Akkauntni o‘chirish' });
    expect(confirm).toBeDisabled();

    await user.type(within(dialog).getByLabelText('Parolingizni qayta kiriting'), 'Secret123!');
    expect(confirm).toBeDisabled();

    await user.type(
      within(dialog).getByLabelText(`Tasdiqlash uchun ${ACCOUNT_DELETE_CONFIRMATION} deb yozing`),
      ACCOUNT_DELETE_CONFIRMATION,
    );
    expect(confirm).toBeEnabled();
  });
});
