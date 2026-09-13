import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, type ZodRawShape } from 'zod';
import { LogStore, redactArgs, redactCommand } from '../db/log.js';
import type { VigorClient } from '../ssh/client.js';
import type { ConfirmGate } from '../tools/confirm-gate.js';
import type { CommandDef } from './registry.js';
import { allCommands, findCommand } from './registry.js';

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

async function snapshot(client: VigorClient, snapshotRead: string | undefined): Promise<string | null> {
  if (!snapshotRead) return null;
  const cmd = findCommand(snapshotRead);
  if (!cmd || cmd.kind !== 'read') return null;
  try {
    return await client.runCommand(cmd.render({}));
  } catch {
    return null; // snapshot is best-effort; never fail the write for it
  }
}

export interface RegisterOptions {
  gate: ConfirmGate;
  store: LogStore;
  readOnly?: boolean;
  autoCommit?: boolean;
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
      const formatted = cmd.format ? cmd.format(raw) : raw;
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

async function runCommit(client: VigorClient, store: LogStore): Promise<'ok' | 'failed' | 'skipped'> {
  const started = Date.now();
  try {
    client.authorizeWrite('sys commit');
    await client.runWriteCommand('sys commit');
    store.request({
      toolId: 'sys_commit',
      kind: 'write',
      command: 'sys commit',
      argsJson: '{}',
      outcome: 'ok',
      durationMs: Date.now() - started,
    });
    return 'ok';
  } catch (e) {
    store.request({
      toolId: 'sys_commit',
      kind: 'write',
      command: 'sys commit',
      argsJson: '{}',
      outcome: 'error',
      errorCode: errCode(e),
      errorMsg: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - started,
    });
    return 'failed';
  }
}

function registerWrite(
  server: McpServer,
  client: VigorClient,
  gate: ConfirmGate,
  store: LogStore,
  cmd: CommandDef,
  autoCommit: boolean,
): void {
  const schema: ZodRawShape = { ...cmd.args, confirm_token: z.string().optional() };
  if (cmd.dangerous) schema.acknowledge = z.boolean().optional();
  const secretArgs = cmd.secretArgs ?? [];
  const redactedCommand = (args: Record<string, unknown>): string =>
    redactCommand(cmd.render(args), args, secretArgs);

  server.tool(cmd.id, `${cmd.desc} (write — requires confirmation)`, schema, async (args: Record<string, unknown>) => {
    const { confirm_token, acknowledge, ...rest } = args;
    const token = typeof confirm_token === 'string' ? confirm_token : undefined;
    const command = cmd.render(rest);
    const commandLog = redactedCommand(rest);
    const argsLog = redactArgs(rest, secretArgs);
    const started = Date.now();

    if (!token) {
      const { token: newToken } = gate.create(cmd.id, command);
      store.request({
        toolId: cmd.id,
        kind: 'write',
        command: commandLog,
        argsJson: argsLog,
        outcome: 'needs_confirmation',
        durationMs: Date.now() - started,
        requestedAt: iso(started),
        respondedAt: iso(Date.now()),
      });
      store.writeAudit({
        requestId: null,
        toolId: cmd.id,
        command: commandLog,
        status: 'preview',
        success: null,
      });
      return {
        content: [{
          type: 'text' as const,
          text: text({
            status: 'needs_confirmation',
            preview: commandLog,
            affects_network: cmd.affectsNetwork ?? false,
            dangerous: cmd.dangerous ?? false,
            warning: cmd.dangerous
              ? 'DANGEROUS: this write can drop connectivity, lock out management, or reboot the router. Pass acknowledge: true on the confirm call.'
              : undefined,
            confirm_token: newToken,
            note: 'Call this tool again with the same arguments and confirm_token to execute.',
          }),
        }],
      };
    }

    // Dangerous writes need an explicit acknowledge (checked BEFORE validating
    // the token so a failed acknowledge does not consume it).
    if (cmd.dangerous && acknowledge !== true) {
      const msg = 'dangerous write requires acknowledge: true';
      store.request({
        toolId: cmd.id,
        kind: 'write',
        command: commandLog,
        argsJson: argsLog,
        outcome: 'denied',
        errorCode: 'not_acknowledged',
        errorMsg: msg,
        durationMs: Date.now() - started,
      });
      store.writeAudit({
        requestId: null,
        toolId: cmd.id,
        command: commandLog,
        status: 'denied',
        success: null,
        errorCode: 'not_acknowledged',
        errorMsg: msg,
      });
      throw new Error(msg);
    }

    try {
      gate.validate(token, command);
    } catch (e) {
      const code = errCode(e) ?? 'denied';
      store.request({
        toolId: cmd.id,
        kind: 'write',
        command: commandLog,
        argsJson: argsLog,
        outcome: 'denied',
        errorCode: code,
        errorMsg: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - started,
      });
      store.writeAudit({
        requestId: null,
        toolId: cmd.id,
        command: commandLog,
        status: (['expired', 'mismatch'].includes(code) ? code : 'denied') as
          | 'expired'
          | 'mismatch'
          | 'denied',
        success: null,
        errorCode: code,
        errorMsg: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }

    const before = await snapshot(client, cmd.snapshotRead);
    let raw: string;
    try {
      client.authorizeWrite(command);
      raw = await client.runWriteCommand(command);
    } catch (e) {
      const ended = Date.now();
      store.request({
        toolId: cmd.id,
        kind: 'write',
        command: commandLog,
        argsJson: argsLog,
        outcome: 'error',
        errorCode: errCode(e),
        errorMsg: e instanceof Error ? e.message : String(e),
        durationMs: ended - started,
        requestedAt: iso(started),
        respondedAt: iso(ended),
        ...timingOf(client),
      });
      store.writeAudit({
        requestId: null,
        toolId: cmd.id,
        command: commandLog,
        status: 'failed',
        success: false,
        beforeSnapshot: before ?? undefined,
        errorCode: errCode(e),
        errorMsg: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
    const writeTiming = timingOf(client);
    const after = await snapshot(client, cmd.snapshotRead);
    const commitStatus = autoCommit && !cmd.skipCommit ? await runCommit(client, store) : 'skipped';
    const ended = Date.now();
    store.request({
      toolId: cmd.id,
      kind: 'write',
      command: commandLog,
      argsJson: argsLog,
      outcome: 'ok',
      durationMs: ended - started,
      output: raw,
      requestedAt: iso(started),
      respondedAt: iso(ended),
      ...writeTiming,
    });
    const row = store.lastRequestId;
    store.writeAudit({
      requestId: row,
      toolId: cmd.id,
      command: commandLog,
      status: 'executed',
      success: true,
      beforeSnapshot: before ?? undefined,
      afterSnapshot: after ?? undefined,
      commitStatus,
    });
    return {
      content: [{
        type: 'text' as const,
        text: text({
          status: 'done',
          command: commandLog,
          before: before ?? undefined,
          after: after ?? undefined,
          output: raw,
          commit: autoCommit ? commitStatus : 'skipped',
        }),
      }],
    };
  });
}

export function registerAllTools(server: McpServer, client: VigorClient, opts: RegisterOptions): void {
  const { gate, store } = opts;
  const outputLimit = opts.toolOutputLimit ?? 16000;
  const autoCommit = opts.autoCommit ?? true;
  for (const cmd of allCommands()) {
    if (!isToolEnabled(cmd, opts)) continue;
    if (cmd.kind === 'read') registerRead(server, client, store, cmd, outputLimit);
    else registerWrite(server, client, gate, store, cmd, autoCommit);
  }
}