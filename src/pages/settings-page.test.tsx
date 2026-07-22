import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContextValue } from '@/lib/auth/auth-context';

import { SettingsPage } from './settings-page';

const h = vi.hoisted(() => ({
  value: {} as AuthContextValue,
  signOut: vi.fn(async () => {}),
  isAuthRequired: vi.fn(() => true),
}));

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => h.value }));
vi.mock('@/lib/supabase', () => ({ isAuthRequired: h.isAuthRequired }));

function setAuth(overrides: Partial<AuthContextValue> = {}) {
  h.value = {
    status: 'member',
    session: { user: { email: 'tomas@example.com' } } as never,
    role: 'admin',
    offline: false,
    signIn: async () => {},
    signOut: h.signOut,
    retry: () => {},
    ...overrides,
  };
}

describe('SettingsPage account card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.isAuthRequired.mockReturnValue(true);
    setAuth();
  });

  it('shows the signed-in email and signs out on click', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Cuenta')).toBeInTheDocument();
    expect(screen.getByText('tomas@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(h.signOut).toHaveBeenCalledTimes(1);
  });

  it('hides the account card when auth is not required (local dev / demo)', () => {
    h.isAuthRequired.mockReturnValue(false);

    render(<SettingsPage />);

    expect(screen.queryByText('Cuenta')).not.toBeInTheDocument();
  });

  it('hides the account card when there is no session', () => {
    setAuth({ session: null });

    render(<SettingsPage />);

    expect(screen.queryByText('Cuenta')).not.toBeInTheDocument();
  });
});
