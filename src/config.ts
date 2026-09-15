import { z } from 'zod';
import { readCommands } from './commands/registry/index.js';

export const configSchema = z.object({
  host: z.string().min(1).default('192.168.1.1'),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1).default('admin'),
  password: z.string().min(1),
  logDb: z.string().min(1).default('data/vigor3912s.db'),
  /** true = write tools are not registered (monitoring only). */
  readOnly: z.boolean().default(false),
  /** After a successful confirmed write, run `sys commit` to persist. */
  autoCommit: z.boolean().default(true),
  /**
   * Ed25519 public key (SPKI PEM or base64 DER) used to verify write approvals.
   * Required unless `readOnly` is true.
   */
  approvePublicKey: z.string().min(1).optional(),
  /**
   * Whitelist of tool ids exposed to the AI. Special values:
   * - 'readonly' → only read tools
   * - 'all' (or empty) → every tool
   * - otherwise comma-separated tool ids
   */
  exposeTools: z.array(z.string()).default([]),
  /** These tool ids are never registered. */
  disabledTools: z.array(z.string()).default([]),
  /** Max characters returned by a read tool before truncation (0 = no cap). */
  toolOutputLimit: z.number().int().min(0).default(16000),
  /**
   * Expected SSH host-key fingerprint (OpenSSH `SHA256:…` or 64-char hex).
   * Required unless `sshInsecureSkipHostVerify` is true.
   */
  sshHostFingerprint: z.string().min(1).optional(),
  /**
   * Explicit opt-out of host-key verification (tests / simulated DrayOS only).
   * Never enable against a live router on an untrusted LAN.
   */
  sshInsecureSkipHostVerify: z.boolean().default(false),
});

export type VigorConfig = z.infer<typeof configSchema>;

const TRUTHY = new Set(['true', '1', 'yes', 'on']);
const FALSY = new Set(['false', '0', 'no', 'off']);

/**
 * Parse a boolean env flag. Unknown values throw (fail closed on misconfig).
 */
export function parseEnvBool(name: string, v: string | undefined, defaultValue: boolean): boolean {
  if (v === undefined || v.trim() === '') return defaultValue;
  const n = v.trim().toLowerCase();
  if (TRUTHY.has(n)) return true;
  if (FALSY.has(n)) return false;
  throw new Error(
    `Invalid boolean for ${name}=${JSON.stringify(v)}; use true/false, 1/0, yes/no, or on/off`,
  );
}

function list(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Resolve EXPOSE_TOOLS into a concrete id allowlist. */
function resolveExposeTools(raw: string | undefined): string[] {
  if (!raw) return []; // all
  const v = raw.trim().toLowerCase();
  if (v === 'all') return [];
  if (v === 'readonly') return readCommands().map((c) => c.id);
  return list(raw);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): VigorConfig {
  const raw = {
    host: env.VIGOR_HOST,
    port: env.VIGOR_PORT !== undefined ? Number(env.VIGOR_PORT) : undefined,
    username: env.VIGOR_USER,
    password: env.VIGOR_PASSWORD,
    logDb: env.VIGOR_LOG_DB,
    readOnly: parseEnvBool('VIGOR_READ_ONLY', env.VIGOR_READ_ONLY, false),
    autoCommit:
      env.VIGOR_AUTO_COMMIT === undefined
        ? true
        : parseEnvBool('VIGOR_AUTO_COMMIT', env.VIGOR_AUTO_COMMIT, true),
    approvePublicKey: env.VIGOR_APPROVE_PUBKEY,
    exposeTools: resolveExposeTools(env.EXPOSE_TOOLS),
    disabledTools: list(env.VIGOR_DISABLED_TOOLS),
    toolOutputLimit:
      env.VIGOR_TOOL_OUTPUT_LIMIT !== undefined
        ? Number(env.VIGOR_TOOL_OUTPUT_LIMIT)
        : 16000,
    sshHostFingerprint: env.VIGOR_SSH_HOST_FINGERPRINT,
    sshInsecureSkipHostVerify: parseEnvBool(
      'VIGOR_SSH_INSECURE_SKIP_VERIFY',
      env.VIGOR_SSH_INSECURE_SKIP_VERIFY,
      false,
    ),
  };
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid VIGOR_* / EXPOSE_TOOLS environment config: ${parsed.error.message}`);
  }
  const config = parsed.data;
  if (!config.readOnly && !config.approvePublicKey) {
    throw new Error(
      'Write mode requires VIGOR_APPROVE_PUBKEY (Ed25519 SPKI PEM or base64 DER). ' +
        'Generate a keypair with: node tools/approve-keygen.mjs',
    );
  }
  if (!config.sshHostFingerprint && !config.sshInsecureSkipHostVerify) {
    throw new Error(
      'SSH host-key verification required: set VIGOR_SSH_HOST_FINGERPRINT (preferred) ' +
        'or explicitly VIGOR_SSH_INSECURE_SKIP_VERIFY=true for tests/simulated servers only',
    );
  }
  return config;
}
