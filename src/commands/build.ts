import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, type ZodRawShape } from 'zod';
import { LogStore, redactArgs } from '../db/log.js';
import type { VigorClient } from '../ssh/client.js';
import type { ConfirmGate } from '../tools/confirm-gate.js';
import type { CommandDef } from './registry/index.js';
import { allCommands } from './registry/index.js';
import { executeWrite } from './write-executor.js';

function text(content: unknown): string {
  return JSON.stringify(content, null, 2);
}

const iso = (ms: number): string => new Date(ms).toISOString();

function timingOf(client: VigorClient): {
  sendAt?: string | null;
  recvAt?: string | null;
  connectMs?: number | null;
} {
  const t = client.lastCommandTiming;
  if (!t) return { sendAt: null, recvAt: null, connectMs: null };
  return { sendAt: iso(t.sendAt), recvAt: iso(t.recvAt), connectMs: t.connectMs };
}

function errCode(e: unknown): string | undefined {
  return e instanceof Error && 'code' in e ? String((e as { code: unknown }).code) : undefined;
}

export interface RegisterOptions {
  gate: ConfirmGate;
  store: LogStore;
  readOnly?: boolean;
  autoCommit?: boolean;
  humanConfirm?: boolean;
  confirmPassphrase?: string;
  exposeTools?: string[];
  disabledTools?: string[];
  toolOutputLimit?: number;
}

function isToolEnabled(cmd: CommandDef, opts: RegisterOptions): boolean {
  if (opts.exposeTools && opts.exposeTools.length > 0 && !opts.exposeTools.includes(cmd.id)) {
    return false;
  }
  if (opts.disabledTools && opts.disabledTools.includes(cmd.id)) return false;
  if (opts.readOnly && cmd.kind === 'write') return false;
  return true;
}

function registerRead(
  server: McpServer,
  client: VigorClient,
  store: LogStore,
  cmd: CommandDef,
  outputLimit: number,
): void {
  server.tool(cmd.id, `${cmd.desc} (read-only)`, cmd.args, async (args: Record<string, unknown>) => {
    const command = cmd.render(args);
    const started = Date.now();
    try {
      const raw = await client.runCommand(command, { timeoutMs: cmd.id === 'ip_tracert' ? 60000 : 15000 });
      const ended = Date.now();
      store.request({
        toolId: cmd.id,
        kind: 'read',
        command,
        argsJson: redactArgs(args, cmd.secretArgs ?? []),
        outcome: 'ok',
        durationMs: ended - started,
        output: raw,
        requestedAt: iso(started),
        respondedAt: iso(ended),
        ...timingOf(client),
      });
      const formatted = cmd.format ? cmd.format(raw, args) : raw;
      if (typeof formatted === 'string' && outputLimit > 0 && formatted.length > outputLimit) {
        const truncated = `${formatted.slice(0, outputLimit)}\n...[truncated]`;
        return { content: [{ type: 'text' as const, text: text({ output: truncated, truncated: true }) }] };
      }
      return { content: [{ type: 'text' as const, text: text(formatted) }] };
    } catch (e) {
      const ended = Date.now();
      store.request({
        toolId: cmd.id,
        kind: 'read',
        command,
        argsJson: redactArgs(args, cmd.secretArgs ?? []),
        outcome: 'error',
        errorCode: errCode(e),
        errorMsg: e instanceof Error ? e.message : String(e),
        durationMs: ended - started,
        requestedAt: iso(started),
        respondedAt: iso(ended),
        ...timingOf(client),
      });
      throw e;
    }
  });
}

function registerWrite(
  server: McpServer,
  client: VigorClient,
  gate: ConfirmGate,
  store: LogStore,
  cmd: CommandDef,
  autoCommit: boolean,
  humanConfirm: boolean,
  confirmPassphrase: string | undefined,
): void {
  const schema: ZodRawShape = {
    ...cmd.args,
    confirm_token: z.string().optional(),
    confirmation_id: z.string().optional(),
    user_code: z.string().optional(),
  };
  if (cmd.dangerous) schema.acknowledge = z.boolean().optional();

  server.tool(cmd.id, `${cmd.desc} (write — requires confirmation)`, schema, async (args: Record<string, unknown>) => {
    const body = await executeWrite(cmd, args, client, {
      gate,
      store,
      autoCommit,
      humanConfirm,
      confirmPassphrase,
    });
    return { content: [{ type: 'text' as const, text: text(body) }] };
  });
}

export function registerAllTools(server: McpServer, client: VigorClient, opts: RegisterOptions): void {
  const { gate, store } = opts;
  const outputLimit = opts.toolOutputLimit ?? 16000;
  const autoCommit = opts.autoCommit ?? true;
  const humanConfirm = opts.humanConfirm ?? false;
  for (const cmd of allCommands()) {
    if (!isToolEnabled(cmd, opts)) continue;
    if (cmd.kind === 'read') registerRead(server, client, store, cmd, outputLimit);
    else registerWrite(server, client, gate, store, cmd, autoCommit, humanConfirm, opts.confirmPassphrase);
  }
}
