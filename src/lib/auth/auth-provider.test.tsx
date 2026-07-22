import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from './auth-provider';
import { useAuth } from './use-auth';

const h = vi.hoisted(() => ({
  isAuthRequired: vi.fn(() => true),
  organizationId: '4bf990ae-b365-4c8c-b983-8498a6940e8f',
  getSessionResult: { data: { session: null as { user: { id: string } } | null } },
  membershipResult: { data: null as unknown, error: null as unknown },
  signOut: vi.fn(async () => {}),
  signInWithOAuth: vi.fn(async () => {}),
}));

vi.mock('@/lib/supabase', () => ({
  isAuthRequired: h.isAuthRequired,
  getConfiguredOrganizationId: () => h.organizationId,
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => h.getSessionResult,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: h.signOut,
      signInWithOAuth: h.signInWithOAuth,
    },
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        maybeSingle: async () => h.membershipResult,
      };

      return builder;
    },
  }),
}));

function Consumer() {
  const { status, role } = useAuth();

  return <div data-testid="status">{`${status}:${role ?? '-'}`}</div>;
}

function renderAuth() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}

async function expectStatus(value: string) {
  await waitFor(() => expect(screen.getByTestId('status').textContent).toBe(value));
}

describe('AuthProvider', () => {
  beforeEach(() => {
    h.isAuthRequired.mockReturnValue(true);
    h.getSessionResult.data.session = null;
    h.membershipResult.data = null;
    h.membershipResult.error = null;
    h.signOut.mockClear();
    h.signInWithOAuth.mockClear();
    window.localStorage.clear();
  });

  it('resolves synchronously to disabled without touching the client', () => {
    h.isAuthRequired.mockReturnValue(false);

    renderAuth();

    expect(screen.getByTestId('status').textContent).toBe('disabled:-');
  });

  it('resolves to signedOut when there is no session', async () => {
    renderAuth();

    await expectStatus('signedOut:-');
  });

  it('resolves to member with the role when membership is active', async () => {
    h.getSessionResult.data.session = { user: { id: 'user-1' } };
    h.membershipResult.data = { id: 'row-1', role: 'admin' };

    renderAuth();

    await expectStatus('member:admin');
  });

  it('signs the session out and holds denied when there is no membership', async () => {
    h.getSessionResult.data.session = { user: { id: 'stranger' } };
    h.membershipResult.data = null;

    renderAuth();

    await expectStatus('denied:-');
    expect(h.signOut).toHaveBeenCalledTimes(1);
  });

  it('trusts a cached membership when the check fails offline', async () => {
    h.getSessionResult.data.session = { user: { id: 'user-1' } };
    h.membershipResult.error = { message: 'offline' };
    window.localStorage.setItem(
      `monsterly-membership:${h.organizationId}:user-1`,
      JSON.stringify({ ok: true, role: 'staff', verifiedAt: 'x' }),
    );

    renderAuth();

    await expectStatus('member:staff');
    expect(h.signOut).not.toHaveBeenCalled();
  });

  it('lands on signedOut when the check fails offline with no cache', async () => {
    h.getSessionResult.data.session = { user: { id: 'user-1' } };
    h.membershipResult.error = { message: 'offline' };

    renderAuth();

    await expectStatus('signedOut:-');
  });
});
