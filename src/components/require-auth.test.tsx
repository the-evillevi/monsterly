import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContextValue, AuthStatus } from '@/lib/auth/auth-context';

import { RequireAuth } from './require-auth';

const h = vi.hoisted(() => ({
  value: {} as AuthContextValue,
}));

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => h.value }));

function makeAuthValue(status: AuthStatus): AuthContextValue {
  return {
    status,
    session: status === 'denied' ? ({ user: { email: 'nope@example.com' } } as never) : null,
    role: null,
    offline: false,
    signIn: async () => {},
    signOut: async () => {},
    retry: () => {},
  };
}

function renderGuard(status: AuthStatus) {
  h.value = makeAuthValue(status);

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireAuth>
              <div>protected content</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>login screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['disabled', 'member'] as const)('renders children when %s', (status) => {
    renderGuard(status);

    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('redirects to /login when signed out', () => {
    renderGuard('signedOut');

    expect(screen.getByText('login screen')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('shows the access-denied screen when denied', () => {
    renderGuard('denied');

    expect(screen.getByText('Sin acceso')).toBeInTheDocument();
  });

  it('shows a loading splash while resolving', () => {
    renderGuard('loading');

    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });
});
