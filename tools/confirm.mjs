#!/usr/bin/env node
/**
 * Human-confirm helper: list pending router writes and inspect one by id.
 *
 * With VIGOR_HUMAN_CONFIRM=true the write tools hide the confirm token and
 * persist pending intents to `data/pending-confirms.json`. A human approves a
 * write by providing their confirmation code (VIGOR_CONFIRM_PASSPHRASE) in the
 * chat. This CLI lets the human verify what is pending before approving.
 *
 * Usage:
 *   node tools/confirm.mjs            # list all pending confirmations
 *   node tools/confirm.mjs <id>       # show the command for a pending id
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
    console.log(`      ${p.command}`);
  }
  console.log('\nInspect one: node tools/confirm.mjs <id>');
  console.log('To approve, tell the assistant your confirmation code (VIGOR_CONFIRM_PASSPHRASE).');
  process.exit(0);
}

const found = pending.find((p) => p.confirmationId === id);
if (!found) {
  console.error(`No pending confirmation with id "${id}".`);
  process.exit(1);
}
const expiry = new Date(found.expiresAt).toISOString();
console.log(`Confirmation ${found.confirmationId} [${found.toolId}] (expires ${expiry})\n`);
console.log('This write will execute on the router:\n');
console.log(`  ${found.command}\n`);
console.log('If you approve, reply to the assistant with your confirmation code to run it.');