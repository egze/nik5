import { describe, expect, it } from 'vitest';
import {
  derivePin,
  isUnlocked,
  logout,
  rememberUnlock,
  verifyPin,
} from './pin';
import type { PinConfig } from './pin';

const config: PinConfig = {
  saltHex: '00112233445566778899aabbccddeeff',
  hashHex: '',
  iterations: 100,
  credentialVersion: 'test-v1',
};

describe('PIN verifier', () => {
  it('accepts only the pin that produced the verifier', async () => {
    const hashHex = await derivePin('123456', config);
    const ready = { ...config, hashHex };

    expect(await verifyPin('123456', ready)).toBe(true);
    expect(await verifyPin('654321', ready)).toBe(false);
  });

  it('rejects a value that is not exactly six digits before deriving', async () => {
    await expect(derivePin('not-a-pin', config)).rejects.toThrow();
    await expect(verifyPin('12345', config)).resolves.toBe(false);
  });
});

describe('remembered unlock', () => {
  it('stores only the credential version', () => {
    const storage = new MapStorage();

    rememberUnlock(config, storage);

    expect(storage.getItem('lernraum.auth')).toBe('test-v1');
    expect(storage.values()).toEqual([['lernraum.auth', 'test-v1']]);
  });

  it('rejects a remembered unlock after the credential version changes', () => {
    const storage = new MapStorage();
    rememberUnlock(config, storage);

    expect(isUnlocked({ ...config, credentialVersion: 'test-v2' }, storage)).toBe(false);
  });

  it('removes the remembered unlock on logout', () => {
    const storage = new MapStorage();
    rememberUnlock(config, storage);

    logout(storage);

    expect(storage.getItem('lernraum.auth')).toBeNull();
  });

  it('treats a storage read failure as locked', () => {
    const storage = new ThrowingStorage('get');

    expect(isUnlocked(config, storage)).toBe(false);
    expect(storage.getCalls).toBe(1);
  });

  it('tolerates storage write and removal failures', () => {
    const writeFailure = new ThrowingStorage('set');
    const removalFailure = new ThrowingStorage('remove');

    expect(() => rememberUnlock(config, writeFailure)).not.toThrow();
    expect(() => logout(removalFailure)).not.toThrow();
    expect(writeFailure.setCalls).toBe(1);
    expect(removalFailure.removeCalls).toBe(1);
  });
});

class MapStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length() {
    return this.entries.size;
  }

  clear() {
    this.entries.clear();
  }

  getItem(key: string) {
    return this.entries.get(key) ?? null;
  }

  key(index: number) {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.entries.delete(key);
  }

  setItem(key: string, value: string) {
    this.entries.set(key, value);
  }

  values() {
    return [...this.entries.entries()];
  }
}

class ThrowingStorage extends MapStorage {
  getCalls = 0;
  setCalls = 0;
  removeCalls = 0;

  constructor(private readonly operation: 'get' | 'set' | 'remove') {
    super();
  }

  override getItem(key: string) {
    this.getCalls += 1;
    if (this.operation === 'get') throw new DOMException('blocked');
    return super.getItem(key);
  }

  override setItem(key: string, value: string) {
    this.setCalls += 1;
    if (this.operation === 'set') throw new DOMException('blocked');
    super.setItem(key, value);
  }

  override removeItem(key: string) {
    this.removeCalls += 1;
    if (this.operation === 'remove') throw new DOMException('blocked');
    super.removeItem(key);
  }
}
