import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('approve CLI', () => {
  beforeAll(() => {
    const build = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc'], {
      cwd: repo,
      encoding: 'utf8',
    });
    if (build.status !== 0) throw new Error(`${build.stdout}\n${build.stderr}`);
  });

  it('requires --blind when signing an arbitrary payload', () => {
    const result = spawnSync(process.execPath, ['tools/approve.mjs', '--payload', '-'], {
      cwd: repo,
      input: 'id\nnonce\ndigest\n123\n',
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--blind');
  });

  it('refuses a redacted intent when no interactive TTY is available', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vigor-approve-cli-'));
    const pendingFile = path.join(dir, 'pending.json');
    const confirmationId = randomBytes(8).toString('hex');
    try {
      writeFileSync(pendingFile, JSON.stringify([{
        confirmationId, toolId: 'user_set', commandDigest: randomBytes(32).toString('hex'),
        commandPreview: 'user set <redacted:param>', redactedFields: ['param'],
        nonce: randomBytes(16).toString('hex'), createdAt: Date.now(), expiresAt: Date.now() + 60_000,
      }]));
      const result = spawnSync(process.execPath, ['tools/approve.mjs', confirmationId], {
        cwd: repo,
        env: { ...process.env, VIGOR_PENDING_FILE: pendingFile },
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('no TTY');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
