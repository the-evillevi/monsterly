import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startBuildChannel } from './build-channel';

function createFakeChannel() {
  const listeners = new Set<(event: MessageEvent) => void>();

  const channel = {
    addEventListener: (_type: string, listener: (event: MessageEvent) => void) => {
      listeners.add(listener);
    },
    close: vi.fn(),
    postMessage: vi.fn(),
    removeEventListener: (_type: string, listener: (event: MessageEvent) => void) => {
      listeners.delete(listener);
    },
  } as unknown as BroadcastChannel & {
    close: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
  };

  return {
    channel,
    receive: (data: unknown) => {
      listeners.forEach((listener) => listener({ data } as MessageEvent));
    },
  };
}

function mockVisibility(state: DocumentVisibilityState) {
  return vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
}

describe('startBuildChannel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('announces its own build on start', () => {
    const fake = createFakeChannel();

    startBuildChannel({ buildId: '100', createChannel: () => fake.channel });

    expect(fake.channel.postMessage).toHaveBeenCalledWith({ buildId: '100' });
  });

  it('reloads immediately when hidden and a newer build announces itself', () => {
    const fake = createFakeChannel();
    const reload = vi.fn();
    mockVisibility('hidden');

    startBuildChannel({ buildId: '100', createChannel: () => fake.channel, reload });
    fake.receive({ buildId: '200' });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('defers the reload of a visible stale tab until it goes hidden', () => {
    const fake = createFakeChannel();
    const reload = vi.fn();
    const visibility = mockVisibility('visible');

    startBuildChannel({ buildId: '100', createChannel: () => fake.channel, reload });
    fake.receive({ buildId: '200' });
    expect(reload).not.toHaveBeenCalled();

    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('answers an older tab with its own newer build, throttled', () => {
    const fake = createFakeChannel();

    startBuildChannel({ buildId: '200', createChannel: () => fake.channel });
    expect(fake.channel.postMessage).toHaveBeenCalledTimes(1);

    // Replies within the throttle window are suppressed; after it, one goes out.
    fake.receive({ buildId: '100' });
    expect(fake.channel.postMessage).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-07-11T12:00:05Z'));
    fake.receive({ buildId: '100' });
    expect(fake.channel.postMessage).toHaveBeenCalledTimes(2);
  });

  it('ignores its own build id and malformed messages', () => {
    const fake = createFakeChannel();
    const reload = vi.fn();
    mockVisibility('hidden');

    startBuildChannel({ buildId: '100', createChannel: () => fake.channel, reload });
    fake.receive({ buildId: '100' });
    fake.receive({});
    fake.receive(undefined);

    expect(reload).not.toHaveBeenCalled();
    expect(fake.channel.postMessage).toHaveBeenCalledTimes(1);
  });

  it('stops listening and closes the channel on stop', () => {
    const fake = createFakeChannel();
    const reload = vi.fn();
    mockVisibility('hidden');

    const { stop } = startBuildChannel({
      buildId: '100',
      createChannel: () => fake.channel,
      reload,
    });
    stop();
    fake.receive({ buildId: '200' });

    expect(fake.channel.close).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });
});
