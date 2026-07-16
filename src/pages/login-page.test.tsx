import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContextValue, AuthStatus } from '@/lib/auth/auth-context';

import { LoginPage } from './login-page';

const h = vi.hoisted(() => ({
  value: {} as AuthContextValue,
  signIn: vi.fn(async () => {}),
}));

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => h.value }));

function setAuth(status: AuthStatus, overrides: Partial<AuthContextValue> = {}) {
  h.value = {
    status,
    session: null,
    role: null,
    offline: false,
    signIn: h.signIn,
    signOut: async () => {},
    retry: () => {},
    ...overrides,
  };
}

function renderLogin(initialEntry: { pathname: string; state?: unknown } = { pathname: '/login' }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs in and returns to the intended route from location state', async () => {
    setAuth('signedOut');
    renderLogin({
      pathname: '/login',
      state: { from: { pathname: '/subscribers', search: '?tab=vencidos' } },
    });

    fireEvent.click(screen.getByRole('button', { name: /continuar con google/i }));

    expect(h.signIn).toHaveBeenCalledWith('/subscribers?tab=vencidos');
  });

  it('defaults the return route to /dashboard without location state', async () => {
    setAuth('signedOut');
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /continuar con google/i }));

    expect(h.signIn).toHaveBeenCalledWith('/dashboard');
  });

  it('disables sign-in and shows a notice when offline', () => {
    setAuth('signedOut', { offline: true });
    renderLogin();

    expect(screen.getByRole('button', { name: /continuar con google/i })).toBeDisabled();
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });

  it('redirects to the dashboard when already a member', () => {
    setAuth('member');
    renderLogin();

    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});
