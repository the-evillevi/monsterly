import { registerSW } from 'virtual:pwa-register';

// A front-desk tab can stay open for days, and the browser only checks for a
// new service worker on navigation — so without polling, a deployed update is
// never noticed. The manager polls hourly and re-checks at the moments the
// operator is most likely returning to the app (tab becomes visible, network
// comes back), then exposes an "update ready" flag the UI turns into the
// "Nueva versión disponible" prompt. The reload happens when the operator
// taps Actualizar — or automatically the moment the tab goes hidden, when a
// reload can't interrupt anyone.

const updatePollInterval = 60 * 60 * 1_000;

type RegisterAppServiceWorker = typeof registerSW;

export type AppUpdateSnapshot = {
  updateReady: boolean;
};

export function createAppUpdateManager(register: RegisterAppServiceWorker = registerSW) {
  let snapshot: AppUpdateSnapshot = { updateReady: false };
  const listeners = new Set<() => void>();
  let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;
  let started = false;

  let isApplying = false;

  async function applyUpdate() {
    if (isApplying) {
      return;
    }
    isApplying = true;

    try {
      await updateServiceWorker?.(true);
    } finally {
      isApplying = false;
    }
  }

  function applyUpdateWhenHidden() {
    if (snapshot.updateReady && document.visibilityState === 'hidden') {
      void applyUpdate();
    }
  }

  function setUpdateReady() {
    if (snapshot.updateReady) {
      return;
    }

    snapshot = { updateReady: true };
    listeners.forEach((listener) => listener());
    // If the update lands while nobody is looking, apply it right away.
    applyUpdateWhenHidden();
  }

  return {
    applyUpdate,
    getSnapshot: () => snapshot,
    start: ({ pollInterval = updatePollInterval }: { pollInterval?: number } = {}) => {
      if (started) {
        return;
      }
      started = true;

      updateServiceWorker = register({
        onNeedRefresh: setUpdateReady,
        onRegisteredSW: (_serviceWorkerUrl, registration) => {
          if (!registration) {
            return;
          }

          function checkForUpdate() {
            if (navigator.onLine) {
              registration?.update().catch(() => {
                // Transient network failures are expected; the next check retries.
              });
            }
          }

          setInterval(checkForUpdate, pollInterval);
          window.addEventListener('online', checkForUpdate);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              checkForUpdate();
            } else {
              applyUpdateWhenHidden();
            }
          });
        },
      });
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type AppUpdateManager = ReturnType<typeof createAppUpdateManager>;

export const appUpdateManager = createAppUpdateManager();
