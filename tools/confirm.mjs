#!/usr/bin/env node
/**
 * List pending signed-approval writes (preview only; no secrets).
 *
 * Prefer `node tools/approve.mjs` to list + sign.
 *
 * Usage:
 *   node tools/confirm.mjs
 *   node tools/confirm.mjs <confirmationId>
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfirmGate } from '../dist/tools/confirm-gate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(here, '..');
const PENDING_FILE = path.join(cwd, 'data', 'pending-confirms.json');

const id = process.argv[2];
const pending = ConfirmGate.loadPending(PENDING_FILE);

if (pending.length === 0) {
  console.log('No pending confirmations.');
  process.exit(0);
}

if (!id) {
  console.log(`Pending confirmations (${pending.length}):\n`);
  for (const p of pending) {
    const expiry = new Date(p.expiresAt).toISOString();
    console.log(`  ${p.confirmationId}  [${p.toolId}]  expires ${expiry}`);
    console.log(`      ${p.commandPreview}`);
  }
  console.log('\nInspect: node tools/confirm.mjs <id>');
  console.log('Sign:    node tools/approve.mjs <id>');
  process.exit(0);
}

const found = pending.find((p) => p.confirmationId === id);
if (!found) {
  console.error(`No pending confirmation with id "${id}".`);
  process.exit(1);
}
const expiry = new Date(found.expiresAt).toISOString();
console.log(`Confirmation ${found.confirmationId} [${found.toolId}] (expires ${expiry})\n`);
console.log('Preview (redacted):\n');
console.log(`  ${found.commandPreview}\n`);
console.log(`digest: ${found.commandDigest}`);
console.log(`nonce:  ${found.nonce}`);
console.log('\nApprove with: node tools/approve.mjs ' + found.confirmationId);
