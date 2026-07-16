import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';

import type { MembershipRole } from './membership';

/**
 * disabled   auth not applicable (demo mode, or VITE_MONSTERLY_AUTH_MODE=anon)
 * loading    getSession / PKCE exchange / membership check in flight
 * signedOut  no session — the guard redirects to /login
 * member     session + confirmed membership (fresh query or offline cache hit)
 * denied     authenticated but no membership; session already revoked
 */
export type AuthStatus = 'disabled' | 'loading' | 'signedOut' | 'member' | 'denied';

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  role: MembershipRole | null;
  // True when we are signedOut specifically because an offline membership
  // check found no cached result — the login page shows a Spanish offline note.
  offline: boolean;
  signIn: (from?: string) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
