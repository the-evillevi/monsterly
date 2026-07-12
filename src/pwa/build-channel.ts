// A tab left open from before a deploy keeps running old code and — worse —
// keeps the previous RxDB schema version's IndexedDB database open, which
// blocks the storage upgrade for every newer tab. Tabs announce their build
// id on a BroadcastChannel: whoever hears a newer build than its own is stale
// and reloads itself, releasing those connections. A hidden tab (the classic
// forgotten blocker) reloads immediately; a visible one waits until it goes
// hidden so the operator is never interrupted mid-task.

const channelName = 'monsterly-app-build';
const announceThrottleMs = 1_000;

type BuildMessage = {
  buildId?: string;
};

type StartBuildChannelOptions = {
  buildId?: string;
  createChannel?: (name: string) => BroadcastChannel;
  reload?: () => void;
};

export function startBuildChannel({
  buildId = __APP_BUILD_ID__,
  createChannel = (name) => new BroadcastChannel(name),
  reload = () => window.location.reload(),
}: StartBuildChannelOptions = {}) {
  if (typeof BroadcastChannel === 'undefined') {
    return { stop: () => undefined };
  }

  const channel = createChannel(channelName);
  const ownBuild = Number(buildId);
  let pendingReload = false;
  let lastAnnouncedAt = 0;

  function announce() {
    const now = Date.now();

    if (now - lastAnnouncedAt < announceThrottleMs) {
      return;
    }

    lastAnnouncedAt = now;
    channel.postMessage({ buildId } satisfies BuildMessage);
  }

  function reloadStaleTab() {
    if (document.visibilityState === 'hidden') {
      reload();
      return;
    }

    pendingReload = true;
  }

  function handleMessage(event: MessageEvent<BuildMessage>) {
    const incoming = Number(event.data?.buildId);

    if (!Number.isFinite(incoming) || incoming === ownBuild) {
      return;
    }

    if (incoming > ownBuild) {
      reloadStaleTab();
    } else {
      // An older tab just announced itself (it started after this one);
      // answer with our newer build so it knows to reload.
      announce();
    }
  }

  function handleVisibilityChange() {
    if (pendingReload && document.visibilityState === 'hidden') {
      reload();
    }
  }

  channel.addEventListener('message', handleMessage);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  announce();

  return {
    stop: () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channel.removeEventListener('message', handleMessage);
      channel.close();
    },
  };
}
