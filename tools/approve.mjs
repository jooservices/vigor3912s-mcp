#!/usr/bin/env node
/**
 * Sign a pending write approval (Ed25519).
 *
 * Usage:
 *   node tools/approve.mjs                         # list pending
 *   node tools/approve.mjs <confirmationId>        # sign that pending id
 *   node tools/approve.mjs --payload <file|->      # sign raw sign_payload text
 *
 * Env:
 *   VIGOR_APPROVE_PRIVKEY_FILE  path to PKCS8 PEM (default: data/keys/approve-private.pem)
 *   VIGOR_PENDING_FILE          pending JSON (default: data/pending-confirms.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signApproval } from '../dist/tools/approve-crypto.js';
import { ConfirmGate } from '../dist/tools/confirm-gate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(here, '..');
const PENDING_FILE =
  process.env.VIGOR_PENDING_FILE ?? path.join(cwd, 'data', 'pending-confirms.json');
const KEY_FILE =
  process.env.VIGOR_APPROVE_PRIVKEY_FILE ?? path.join(cwd, 'data', 'keys', 'approve-private.pem');

function loadPrivateKey() {
  if (!fs.existsSync(KEY_FILE)) {
    console.error(`Private key not found: ${KEY_FILE}`);
    console.error('Generate with: node tools/approve-keygen.mjs');
    process.exit(1);
  }
  return fs.readFileSync(KEY_FILE, 'utf8');
}

const args = process.argv.slice(2);

if (args[0] === '--payload') {
  const src = args[1];
  if (!src) {
    console.error('Usage: node tools/approve.mjs --payload <file|->');
    process.exit(1);
  }
  const text = src === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(src, 'utf8');
  const lines = text.trim().split('\n');
  if (lines.length !== 4) {
    console.error('sign_payload must be 4 lines: id, nonce, digest, expiresAt');
    process.exit(1);
  }
  const [confirmationId, nonce, commandDigest, expiresAtRaw] = lines;
  const expiresAt = Number(expiresAtRaw);
  if (!confirmationId || !nonce || !commandDigest || !Number.isFinite(expiresAt)) {
    console.error('Invalid sign_payload fields');
    process.exit(1);
  }
  const signature = signApproval(loadPrivateKey(), confirmationId, nonce, commandDigest, expiresAt);
  console.log(signature);
  process.exit(0);
}

const id = args[0];
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
    console.log(`      preview: ${p.commandPreview}`);
    console.log(`      digest:  ${p.commandDigest}`);
  }
  console.log('\nSign one: node tools/approve.mjs <confirmationId>');
  process.exit(0);
}

const found = pending.find((p) => p.confirmationId === id);
if (!found) {
  console.error(`No pending confirmation with id "${id}".`);
  process.exit(1);
}

const signature = signApproval(
  loadPrivateKey(),
  found.confirmationId,
  found.nonce,
  found.commandDigest,
  found.expiresAt,
);

console.log(`Confirmation ${found.confirmationId} [${found.toolId}]`);
console.log(`expires ${new Date(found.expiresAt).toISOString()}`);
console.log('');
console.log('Preview (redacted):');
console.log(`  ${found.commandPreview}`);
console.log('');
console.log('signature (paste into the tool call):');
console.log(signature);
