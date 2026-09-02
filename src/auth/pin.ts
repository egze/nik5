export interface PinConfig {
  saltHex: string;
  hashHex: string;
  iterations: number;
  credentialVersion: string;
}

export const AUTH_KEY = 'lernraum.auth';

const pinPattern = /^\d{6}$/;

export async function derivePin(pin: string, config: PinConfig): Promise<string> {
  if (!pinPattern.test(pin)) {
    throw new Error('Die PIN muss genau sechs Ziffern haben.');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(hexToBytes(config.saltHex)),
      iterations: config.iterations,
      hash: 'SHA-256',
    },
    key,
    256,
  );

  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPin(pin: string, config: PinConfig): Promise<boolean> {
  if (!pinPattern.test(pin)) {
    return false;
  }

  const derived = hexToBytes(await derivePin(pin, config));
  const expected = hexToBytes(config.hashHex);
  return equalBytes(derived, expected);
}

export function isUnlocked(config: PinConfig, storage: Storage | undefined = defaultStorage()): boolean {
  try {
    return storage?.getItem(AUTH_KEY) === config.credentialVersion;
  } catch {
    return false;
  }
}

export function rememberUnlock(config: PinConfig, storage: Storage | undefined = defaultStorage()): void {
  try {
    storage?.setItem(AUTH_KEY, config.credentialVersion);
  } catch {
    // A verified session remains available even when browser storage is unavailable.
  }
}

export function logout(storage: Storage | undefined = defaultStorage()): void {
  try {
    storage?.removeItem(AUTH_KEY);
  } catch {
    // The caller can still reset its current-session state.
  }
}

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[\da-f]{2})*$/i.test(hex)) {
    throw new Error('Ungültige Hexadezimaldaten.');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}
