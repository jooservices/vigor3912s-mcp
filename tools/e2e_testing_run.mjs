/**
 * E2E testing entry: brings up the simulated DrayOS SSH server (ssh2 Server)
 * and runs the unified E2E against it using `.env.testing` with all tools
 * exposed. Used by GitHub Actions and locally via `npm run e2e:testing`.
 * Never touches a real router.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateApproveKeyPair,
  publicKeyToConfigValue,
} from '../dist/tools/approve-crypto.js';
import { startFakeDrayos } from './fake-drayos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(here, '..');
const LOG_DB = path.join(cwd, 'data', 'e2e-testing.db');
const KEY_DIR = path.join(cwd, 'data', 'keys-e2e');
const PRIV = path.join(KEY_DIR, 'approve-private.pem');

fs.mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
const keys = generateApproveKeyPair();
fs.writeFileSync(PRIV, keys.privateKeyPem, { mode: 0o600 });
fs.chmodSync(PRIV, 0o600);

const fake = await startFakeDrayos({ password: 'fake-admin' });
console.log(`simulated DrayOS on 127.0.0.1:${fake.port}`);

const env = {
  ...process.env,
  VIGOR_HOST: '127.0.0.1',
  VIGOR_PORT: String(fake.port),
  VIGOR_USER: 'admin',
  VIGOR_PASSWORD: 'fake-admin',
  VIGOR_LOG_DB: LOG_DB,
  VIGOR_AUTO_COMMIT: 'true',
  EXPOSE_TOOLS: 'all',
  VIGOR_SSH_INSECURE_SKIP_VERIFY: 'true',
  VIGOR_APPROVE_PUBKEY: publicKeyToConfigValue(keys.publicKeyPem),
  VIGOR_APPROVE_PRIVKEY_FILE: PRIV,
  DOTENV_CONFIG_PATH: path.join(cwd, '.env.testing'),
};

const child = spawn('node', ['tools/e2e.mjs'], { cwd, env, stdio: 'inherit' });
child.on('exit', async (code) => {
  await fake.close();
  process.exit(code ?? 1);
});
child.on('error', async (err) => {
  console.error('failed to start e2e:', err);
  await fake.close();
  process.exit(1);
});
