import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { ForgotPasswordPage } from './ForgotPasswordPage';

function renderForgotPage() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<p>Login screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ForgotPasswordPage', () => {
  it('asks for email then a one-time code without revealing whether the inbox exists', async () => {
    const fetchMock = mockApi({
      '/auth/forgot-password': { status: 200, body: { success: true, data: { ok: true } } },
    });
    const user = userEvent.setup();
    renderForgotPage();

    expect(screen.getByRole('heading', { name: 'Parolni unutdingizmi?' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'aziz@example.com');
    await user.click(screen.getByRole('button', { name: 'Kod yuborish' }));

    expect(await screen.findByText(/Agar shu email bilan hisob bo‘lsa/)).toBeInTheDocument();
    expect(screen.getByLabelText('Tasdiqlash kodi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Qayta kod yuborish' })).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ email: 'aziz@example.com' });
  });

  it('blocks reset when the new passwords do not match', async () => {
    mockApi({
      '/auth/forgot-password': { status: 200, body: { success: true, data: { ok: true } } },
    });
    const user = userEvent.setup();
    renderForgotPage();

    await user.type(screen.getByLabelText('Email'), 'aziz@example.com');
    await user.click(screen.getByRole('button', { name: 'Kod yuborish' }));
    await screen.findByLabelText('Tasdiqlash kodi');
    await user.type(screen.getByLabelText('Tasdiqlash kodi'), '123456');
    await user.type(screen.getByLabelText('Yangi parol'), 'NewPass12');
    await user.type(screen.getByLabelText('Yangi parolni tasdiqlang'), 'OtherPass');
    await user.click(screen.getByRole('button', { name: 'Parolni tiklash' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Parollar mos kelmadi');
  });

  it('resets the password and returns to login', async () => {
    const fetchMock = mockApi({
      '/auth/forgot-password': { status: 200, body: { success: true, data: { ok: true } } },
      '/auth/reset-password': { status: 200, body: { success: true, data: { ok: true } } },
    });
    const user = userEvent.setup();
    renderForgotPage();

    await user.type(screen.getByLabelText('Email'), 'aziz@example.com');
    await user.click(screen.getByRole('button', { name: 'Kod yuborish' }));
    await screen.findByLabelText('Tasdiqlash kodi');
    await user.type(screen.getByLabelText('Tasdiqlash kodi'), '123456');
    await user.type(screen.getByLabelText('Yangi parol'), 'NewPass12');
    await user.type(screen.getByLabelText('Yangi parolni tasdiqlang'), 'NewPass12');
    await user.click(screen.getByRole('button', { name: 'Parolni tiklash' }));

    expect(await screen.findByText('Parol yangilandi. Endi kiring.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kirish' }));
    expect(await screen.findByText('Login screen')).toBeInTheDocument();

    const resetCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/reset-password'));
    expect(resetCall).toBeTruthy();
    const body = JSON.parse(String((resetCall?.[1] as RequestInit).body));
    expect(body).toEqual({
      email: 'aziz@example.com',
      code: '123456',
      newPassword: 'NewPass12',
      newPasswordConfirmation: 'NewPass12',
    });
  });
});
