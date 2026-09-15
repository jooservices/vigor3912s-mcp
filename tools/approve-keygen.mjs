#!/usr/bin/env node
/**
 * Generate an Ed25519 approve keypair for vigor3912s-mcp writes.
 *
 * Usage:
 *   node tools/approve-keygen.mjs [outdir]
 *
 * Writes:
 *   <outdir>/approve-private.pem  (0600) — keep offline; used by approve.mjs
 *   <outdir>/approve-public.pem   — set VIGOR_APPROVE_PUBKEY to PEM or printed base64
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateApproveKeyPair,
  publicKeyToConfigValue,
} from '../dist/tools/approve-crypto.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.resolve(process.argv[2] ?? path.join(here, '..', 'data', 'keys'));
fs.mkdirSync(outdir, { recursive: true, mode: 0o700 });

const { publicKeyPem, privateKeyPem } = generateApproveKeyPair();
const privPath = path.join(outdir, 'approve-private.pem');
const pubPath = path.join(outdir, 'approve-public.pem');
fs.writeFileSync(privPath, privateKeyPem, { mode: 0o600 });
fs.chmodSync(privPath, 0o600);
fs.writeFileSync(pubPath, publicKeyPem, { mode: 0o644 });

const b64 = publicKeyToConfigValue(publicKeyPem);
console.log(`Wrote ${privPath}`);
console.log(`Wrote ${pubPath}`);
console.log('');
console.log('Set on the MCP server:');
console.log(`  VIGOR_APPROVE_PUBKEY=${b64}`);
console.log('Or paste the PEM contents of approve-public.pem into VIGOR_APPROVE_PUBKEY.');
