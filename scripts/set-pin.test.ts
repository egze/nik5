import { createHash, pbkdf2Sync } from 'node:crypto';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = resolve(process.cwd(), 'scripts/set-pin.mjs');

describe('set-pin script', () => {
  it('writes a PBKDF2 verifier with no plaintext PIN', async () => {
    const workspace = await prepareWorkspace();

    try {
      const result = await runScript(workspace, '123456');
      const source = await readFile(join(workspace, 'src/auth/pin-config.ts'), 'utf8');
      const config = parseConfig(source);
      const salt = Buffer.from(config.saltHex, 'hex');
      const hash = pbkdf2Sync('123456', salt, 310_000, 32, 'sha256');
      const credentialVersion = createHash('sha256').update(salt).update(hash).digest('hex').slice(0, 12);

      expect(result.exitCode).toBe(0);
      expect(Object.keys(config).sort()).toEqual(['credentialVersion', 'hashHex', 'iterations', 'saltHex']);
      expect(config.saltHex).toMatch(/^[\da-f]{32}$/);
      expect(config.hashHex).toBe(hash.toString('hex'));
      expect(config.iterations).toBe(310_000);
      expect(config.credentialVersion).toBe(credentialVersion);
      expect(source).not.toContain('123456');
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('rejects interactive input that is not six digits', async () => {
    const workspace = await prepareWorkspace();

    try {
      const result = await runScript(workspace, 'invalid');

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Die PIN muss genau sechs Ziffern haben.');
      await expect(readFile(join(workspace, 'src/auth/pin-config.ts'), 'utf8')).rejects.toThrow();
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});

async function prepareWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), 'lernraum-set-pin-'));
  await mkdir(join(workspace, 'scripts'));
  await mkdir(join(workspace, 'src/auth'), { recursive: true });
  await cp(scriptPath, join(workspace, 'scripts/set-pin.mjs'));
  return workspace;
}

async function runScript(workspace: string, input: string): Promise<{ exitCode: number | null; stderr: string }> {
  const child = spawn('node', ['scripts/set-pin.mjs'], {
    cwd: workspace,
  });
  child.stdin.write(`${input}\n`);
  child.stdin.end();

  return new Promise((resolve, reject) => {
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ exitCode, stderr }));
  });
}

function parseConfig(source: string): {
  saltHex: string;
  hashHex: string;
  iterations: number;
  credentialVersion: string;
} {
  const match = source.match(/^export const pinConfig = (.+) as const;\n$/s);
  if (!match) {
    throw new Error('Die Konfiguration hat ein unerwartetes Format.');
  }
  return JSON.parse(match[1]);
}
