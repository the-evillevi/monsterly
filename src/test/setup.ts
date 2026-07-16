import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom under this vitest config exposes no Web Storage, so provide a minimal
// in-memory implementation. Real browsers always have it; app code still guards
// for privacy modes where access throws.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (!(name in window) || !window[name]) {
    Object.defineProperty(window, name, { value: new MemoryStorage(), configurable: true });
  }
}

afterEach(() => {
  cleanup();
});
