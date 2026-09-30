import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, type ZodRawShape } from 'zod';
import { LogStore } from '../db/log.js';
import type { VigorClient } from '../ssh/client.js';
import type { ConfirmGate } from '../tools/confirm-gate.js';
import { redactArgs } from '../tools/redaction.js';
import { errCode, errMsg, iso, timingOf } from './tool-log.js';
import type { CommandDef } from './registry/index.js';
import { allCommands } from './registry/index.js';
import { resolveSdkInput } from './sdk-invoke.js';
import { executeWrite } from './write-executor.js';

function text(content: unknown): string {
  return JSON.stringify(content, null, 2);
}

export type ExposedTools = { mode: 'all' } | { mode: 'list'; ids: string[] };

export interface RegisterOptions {
  gate: ConfirmGate;
  store: LogStore;
  readOnly?: boolean;
  autoCommit?: boolean;
  exposeTools?: ExposedTools;
  disabledTools?: string[];
  toolOutputLimit?: number;
}

function isToolEnabled(cmd: CommandDef, opts: RegisterOptions): boolean {
  if (opts.exposeTools?.mode === 'list' && !opts.exposeTools.ids.includes(cmd.id)) {
    return false;
  }
  if (opts.disabledTools && opts.disabledTools.includes(cmd.id)) return false;
  if (opts.readOnly && cmd.kind === 'write') return false;
  return true;
}

export function registerRead(
  server: McpServer,
  client: VigorClient,
  store: LogStore,
  cmd: CommandDef,
  outputLimit: number,
): void {
  server.tool(cmd.id, `${cmd.desc} (read-only)`, cmd.args, async (args: Record<string, unknown>, extra) => {
    let command = cmd.id;
    const started = Date.now();
    try {
      command = cmd.render(args);
      const timeoutMs = cmd.timeoutMs ?? 20000;
      const runOptions = { timeoutMs, ...(extra.signal ? { signal: extra.signal } : {}) };
      const raw = cmd.sdk
        ? await client.runOperation(cmd.sdk.manifestId, resolveSdkInput(cmd.sdk, args), runOptions)
        : await client.runCommand(command, runOptions);
      const ended = Date.now();
      store.request({
        toolId: cmd.id,
        kind: 'read',
        command,
        argsJson: redactArgs(args, cmd.secretArgs ?? []),
        outcome: 'ok',
        durationMs: ended - started,
        output: cmd.sensitiveOutput ? undefined : raw,
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
        errorMsg: errMsg(e),
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
): void {
  const schema: ZodRawShape = {
    ...cmd.args,
    confirmation_id: z.string().optional(),
    signature: z.string().optional(),
  };
  if (cmd.confirm === 'dual') schema.acknowledge = z.boolean().optional();

  server.tool(cmd.id, `${cmd.desc} (write — requires signed approval)`, schema, async (args: Record<string, unknown>, extra) => {
    const body = await executeWrite(cmd, args, client, {
      gate,
      store,
      autoCommit,
      signal: extra.signal,
    });
    return { content: [{ type: 'text' as const, text: text(body) }] };
  });
}

export function registerAllTools(server: McpServer, client: VigorClient, opts: RegisterOptions): number {
  const { gate, store } = opts;
  const outputLimit = opts.toolOutputLimit ?? 16000;
  const autoCommit = opts.autoCommit ?? true;
  let count = 0;
  for (const cmd of allCommands()) {
    if (!isToolEnabled(cmd, opts)) continue;
    if (cmd.kind === 'read') registerRead(server, client, store, cmd, outputLimit);
    else registerWrite(server, client, gate, store, cmd, autoCommit);
    count += 1;
  }
  return count;
}
