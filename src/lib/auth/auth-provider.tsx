import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getConfiguredOrganizationId, getSupabaseClient, isAuthRequired } from '@/lib/supabase';

import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';
import {
  checkMembership,
  clearMembershipCache,
  readMembershipCache,
  writeMembershipCache,
  type MembershipRole,
} from './membership';
import { stashReturnPath } from './return-path';

const disabledValue: AuthContextValue = {
  status: 'disabled',
  session: null,
  role: null,
  offline: false,
  signIn: async () => {},
  signOut: async () => {},
  retry: () => {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // When auth is not applicable (demo mode, or the anon local-dev opt-out) the
  // provider resolves synchronously to `disabled` and never touches the client,
  // so the local-first boot never blocks on a network round-trip.
  if (!isAuthRequired()) {
    return <AuthContext.Provider value={disabledValue}>{children}</AuthContext.Provider>;
  }

  return <AuthRequiredProvider>{children}</AuthRequiredProvider>;
}

function AuthRequiredProvider({ children }: { children: ReactNode }) {
  const organizationId = getConfiguredOrganizationId();
  const client = useMemo(() => getSupabaseClient(), []);

  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<MembershipRole | null>(null);
  const [offline, setOffline] = useState(false);

  // The `denied` path signs the session out; the resulting SIGNED_OUT event
  // must not clobber `denied` back to `signedOut` — this flag holds it.
  const holdDeniedRef = useRef(false);
  // Whether the current `member` status rests on a stale cache hit (offline).
  // Coming back online silently re-verifies just those sessions.
  const memberViaCacheRef = useRef(false);

  const resolveSession = useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession || !organizationId) {
        memberViaCacheRef.current = false;
        setSession(null);
        setRole(null);
        setOffline(false);
        setStatus('signedOut');
        return;
      }

      setSession(nextSession);
      const userId = nextSession.user.id;
      const result = await checkMembership(client, organizationId, userId);

      if (result.outcome === 'member') {
        writeMembershipCache(organizationId, userId, {
          ok: true,
          role: result.role,
          verifiedAt: new Date().toISOString(),
        });
        memberViaCacheRef.current = false;
        setRole(result.role);
        setOffline(false);
        setStatus('member');
        return;
      }

      if (result.outcome === 'denied') {
        // Authenticated but not a member: revoke the session so no stranger
        // holds a token, and hold `denied` so the "Sin acceso" screen stays put.
        clearMembershipCache(organizationId, userId);
        memberViaCacheRef.current = false;
        setRole(null);
        setOffline(false);
        setStatus('denied');
        holdDeniedRef.current = true;
        await client.auth.signOut();
        return;
      }

      // unknown = network failure. Offline no-lockout: trust a cached member so
      // the installed PWA keeps working; otherwise land on /login with a notice.
      const cached = readMembershipCache(organizationId, userId);

      if (cached?.ok) {
        memberViaCacheRef.current = true;
        setRole(cached.role);
        setOffline(false);
        setStatus('member');
        return;
      }

      memberViaCacheRef.current = false;
      setRole(null);
      setOffline(true);
      setStatus('signedOut');
    },
    [client, organizationId],
  );

  useEffect(() => {
    let active = true;

    void client.auth.getSession().then(({ data }) => {
      if (active) {
        void resolveSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      // getSession() above already handles the initial state.
      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (holdDeniedRef.current) {
          holdDeniedRef.current = false;
          return;
        }

        memberViaCacheRef.current = false;
        setSession(null);
        setRole(null);
        setOffline(false);
        setStatus('signedOut');
        return;
      }

      if (event === 'SIGNED_IN') {
        void resolveSession(nextSession);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client, resolveSession]);

  useEffect(() => {
    function handleOnline() {
      if (memberViaCacheRef.current && session) {
        void resolveSession(session);
      }
    }

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [resolveSession, session]);

  const signIn = useCallback(
    async (from?: string) => {
      stashReturnPath(from ?? '/dashboard');

      await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (organizationId && session) {
      clearMembershipCache(organizationId, session.user.id);
    }

    await client.auth.signOut();
  }, [client, organizationId, session]);

  const retry = useCallback(() => {
    setStatus('loading');
    setOffline(false);
    void client.auth.getSession().then(({ data }) => resolveSession(data.session));
  }, [client, resolveSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, role, offline, signIn, signOut, retry }),
    [status, session, role, offline, signIn, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
