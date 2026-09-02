import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const pin = await prompt.question('Neue sechsstellige PIN: ');
prompt.close();

if (!/^\d{6}$/.test(pin)) {
  throw new Error('Die PIN muss genau sechs Ziffern haben.');
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(pin, salt, 310_000, 32, 'sha256');
const credentialVersion = createHash('sha256').update(salt).update(hash).digest('hex').slice(0, 12);
const source = `export const pinConfig = ${JSON.stringify({
  saltHex: salt.toString('hex'),
  hashHex: hash.toString('hex'),
  iterations: 310_000,
  credentialVersion,
}, null, 2)} as const;\n`;

await writeFile(new URL('../src/auth/pin-config.ts', import.meta.url), source, 'utf8');
