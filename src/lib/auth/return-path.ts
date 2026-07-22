// The route the user was heading to before the OAuth round-trip. Stashed in
// sessionStorage by signIn() and read back by the callback page after the code
// exchange, so a deep-link visit while signed out returns to its destination.
const returnToKey = 'monsterly-auth-return-to';

const fallbackPath = '/dashboard';

export function stashReturnPath(path: string) {
  try {
    window.sessionStorage.setItem(returnToKey, path);
  } catch {
    // Best-effort: the callback falls back to /dashboard.
  }
}

/**
 * Read and clear the stashed return path. Only same-origin absolute paths are
 * honored (must start with a single "/") so a poisoned value can never become
 * an open redirect; anything else falls back to /dashboard.
 */
export function consumeReturnPath(): string {
  try {
    const path = window.sessionStorage.getItem(returnToKey);
    window.sessionStorage.removeItem(returnToKey);

    if (path && path.startsWith('/') && !path.startsWith('//')) {
      return path;
    }
  } catch {
    // Ignore and fall through to the fallback.
  }

  return fallbackPath;
}
