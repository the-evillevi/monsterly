import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppUpdateManager } from './app-update';

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => vi.fn()),
}));

type RegisterOptions = {
  onNeedRefresh?: () => void;
  onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration | undefined) => void;
};

function createRegisterStub() {
  const updateServiceWorker = vi.fn(() => Promise.resolve());
  let options: RegisterOptions = {};

  const register = vi.fn((nextOptions: RegisterOptions = {}) => {
    options = nextOptions;

    return updateServiceWorker;
  });

  return {
    getOptions: () => options,
    register,
    updateServiceWorker,
  };
}

function createRegistrationStub() {
  return { update: vi.fn(() => Promise.resolve()) } as unknown as ServiceWorkerRegistration & {
    update: ReturnType<typeof vi.fn>;
  };
}

describe('createAppUpdateManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flags an update as ready and notifies subscribers', () => {
    const stub = createRegisterStub();
    const manager = createAppUpdateManager(stub.register as never);
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.start();
    expect(manager.getSnapshot()).toEqual({ updateReady: false });

    stub.getOptions().onNeedRefresh?.();

    expect(manager.getSnapshot()).toEqual({ updateReady: true });
    expect(listener).toHaveBeenCalledTimes(1);

    // Repeated need-refresh signals do not re-notify.
    stub.getOptions().onNeedRefresh?.();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('applies the update through the service worker with a reload', async () => {
    const stub = createRegisterStub();
    const manager = createAppUpdateManager(stub.register as never);

    manager.start();
    await manager.applyUpdate();

    expect(stub.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('only registers once even if started twice', () => {
    const stub = createRegisterStub();
    const manager = createAppUpdateManager(stub.register as never);

    manager.start();
    manager.start();

    expect(stub.register).toHaveBeenCalledTimes(1);
  });

  it('polls for updates on the configured interval', () => {
    const stub = createRegisterStub();
    const manager = createAppUpdateManager(stub.register as never);
    const registration = createRegistrationStub();

    manager.start({ pollInterval: 60_000 });
    stub.getOptions().onRegisteredSW?.('/sw.js', registration);

    vi.advanceTimersByTime(60_000);
    expect(registration.update).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(120_000);
    expect(registration.update).toHaveBeenCalledTimes(3);
  });

  it('checks for updates when the tab becomes visible and when back online', () => {
    const stub = createRegisterStub();
    const manager = createAppUpdateManager(stub.register as never);
    const registration = createRegistrationStub();

    manager.start();
    stub.getOptions().onRegisteredSW?.('/sw.js', registration);

    document.dispatchEvent(new Event('visibilitychange'));
    expect(registration.update).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('online'));
    expect(registration.update).toHaveBeenCalledTimes(2);
  });

  it('applies a ready update automatically when the tab goes hidden', () => {
    const stub = createRegisterStub();
    const manager = createAppUpdateManager(stub.register as never);
    const registration = createRegistrationStub();

    manager.start();
    stub.getOptions().onRegisteredSW?.('/sw.js', registration);
    stub.getOptions().onNeedRefresh?.();
    expect(stub.updateServiceWorker).not.toHaveBeenCalled();

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(stub.updateServiceWorker).toHaveBeenCalledWith(true);
    visibility.mockRestore();
  });

  it('applies immediately when the update lands while the tab is already hidden', () => {
    const stub = createRegisterStub();
    const manager = createAppUpdateManager(stub.register as never);

    manager.start();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    stub.getOptions().onNeedRefresh?.();

    expect(stub.updateServiceWorker).toHaveBeenCalledWith(true);
    visibility.mockRestore();
  });

  it('skips update checks while offline', () => {
    const stub = createRegisterStub();
    const manager = createAppUpdateManager(stub.register as never);
    const registration = createRegistrationStub();

    manager.start({ pollInterval: 60_000 });
    stub.getOptions().onRegisteredSW?.('/sw.js', registration);

    // onLine lives on Navigator.prototype, so shadow it on the instance.
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
    vi.advanceTimersByTime(60_000);
    expect(registration.update).not.toHaveBeenCalled();

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true });
    vi.advanceTimersByTime(60_000);
    expect(registration.update).toHaveBeenCalledTimes(1);

    Reflect.deleteProperty(window.navigator, 'onLine');
  });
});
