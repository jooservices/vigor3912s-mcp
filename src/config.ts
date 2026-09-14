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
   * When true, EVERY write tool requires a human-in-the-loop confirmation:
   * the confirm token is hidden from the model, and the confirm call must
   * include `confirmation_id` + `user_code` where `user_code` equals
   * `VIGOR_CONFIRM_PASSPHRASE`. Default off — tokens are returned as before.
   */
  humanConfirm: z.boolean().default(false),
  /** Secret key the human types to approve a write in human-confirm mode. */
  confirmPassphrase: z.string().min(8).optional(),
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
});

export type VigorConfig = z.infer<typeof configSchema>;

function truthy(v: string | undefined): boolean {
  return v === 'true' || v === '1';
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
    readOnly: truthy(env.VIGOR_READ_ONLY),
    autoCommit: env.VIGOR_AUTO_COMMIT === undefined ? true : truthy(env.VIGOR_AUTO_COMMIT),
    humanConfirm: truthy(env.VIGOR_HUMAN_CONFIRM),
    confirmPassphrase: env.VIGOR_CONFIRM_PASSPHRASE,
    exposeTools: resolveExposeTools(env.EXPOSE_TOOLS),
    disabledTools: list(env.VIGOR_DISABLED_TOOLS),
    toolOutputLimit:
      env.VIGOR_TOOL_OUTPUT_LIMIT !== undefined
        ? Number(env.VIGOR_TOOL_OUTPUT_LIMIT)
        : 16000,
  };
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid VIGOR_* / EXPOSE_TOOLS environment config: ${parsed.error.message}`);
  }
  const config = parsed.data;
  if (config.humanConfirm && !config.confirmPassphrase) {
    throw new Error('VIGOR_HUMAN_CONFIRM=true requires VIGOR_CONFIRM_PASSPHRASE to be set');
  }
  return config;
}