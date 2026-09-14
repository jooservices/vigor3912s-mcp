import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, type ZodRawShape } from 'zod';
import { LogStore, redactArgs, redactCommand } from '../db/log.js';
import type { VigorClient } from '../ssh/client.js';
import { ConfirmError, type ConfirmGate } from '../tools/confirm-gate.js';
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

function confirmMessage(commandLog: string, cmd: CommandDef, humanConfirm: boolean): string {
  const impact = cmd.affectsNetwork ? 'network-affecting' : 'configuration change';
  const danger = cmd.dangerous
    ? '\n⚠️ **DANGEROUS** — this write can drop connectivity, lock out router management, or reboot the router.'
    : '';
  const base = [
    '🛑 **Router write — your approval is required**',
    '',
    'The assistant wants to execute this on the router:',
    '',
    `\`\`\`\n${commandLog}\n\`\`\``,
    '',
    `• Type: write / ${impact}`,
    '• The confirmation is single-use and expires in 60 seconds.',
    danger,
  ].join('\n');
  if (humanConfirm) {
    return (
      base +
      '\n\nReply with **yes** and your **confirmation code** to approve — the code is the value of `VIGOR_CONFIRM_PASSPHRASE` configured on the server. Without it, the write cannot run.'
    );
  }
  return base + '\n\nReply with **yes** to approve.';
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
  const secretArgs = cmd.secretArgs ?? [];
  const redactedCommand = (args: Record<string, unknown>): string =>
    redactCommand(cmd.render(args), args, secretArgs);

  server.tool(cmd.id, `${cmd.desc} (write — requires confirmation)`, schema, async (args: Record<string, unknown>) => {
    const { confirm_token, confirmation_id, user_code, acknowledge, ...rest } = args;
    const token = typeof confirm_token === 'string' ? confirm_token : undefined;
    const cid = typeof confirmation_id === 'string' ? confirmation_id : undefined;
    const code = typeof user_code === 'string' ? user_code : undefined;
    const command = cmd.render(rest);
    const commandLog = redactedCommand(rest);
    const argsLog = redactArgs(rest, secretArgs);
    const started = Date.now();
    const message = confirmMessage(commandLog, cmd, humanConfirm);

    const hasConfirmation = token !== undefined || cid !== undefined;
    if (!hasConfirmation) {
      const { token: newToken, confirmationId } = gate.create(cmd.id, command);
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
            human_confirm: humanConfirm,
            message,
            ...(humanConfirm
              ? { confirmation_id: confirmationId, note: 'Present the message to the user; the confirm call needs confirmation_id + user_code.' }
              : { confirm_token: newToken, note: 'Call this tool again with the same arguments and confirm_token to execute.' }),
          }),
        }],
      };
    }

    // Dangerous writes need an explicit acknowledge (checked BEFORE consuming
    // the confirmation so a failed acknowledge does not void it).
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

    // Human-confirm mode: token is hidden; the call must present the
    // confirmation_id and the correct user_code (the human's passphrase).
    if (humanConfirm) {
      if (!cid || !code) {
        throw new ConfirmError('invalid_token', 'human confirmation requires confirmation_id and user_code');
      }
      const intent = gate.getByConfirmationId(cid);
      if (!intent) {
        throw new ConfirmError('invalid_token', 'confirmation not found or expired');
      }
      if (code !== confirmPassphrase) {
        const msg = 'wrong confirmation code';
        store.request({
          toolId: cmd.id,
          kind: 'write',
          command: commandLog,
          argsJson: argsLog,
          outcome: 'denied',
          errorCode: 'bad_user_code',
          errorMsg: msg,
          durationMs: Date.now() - started,
        });
        store.writeAudit({
          requestId: null,
          toolId: cmd.id,
          command: commandLog,
          status: 'denied',
          success: null,
          errorCode: 'bad_user_code',
          errorMsg: msg,
        });
        throw new ConfirmError('invalid_token', msg);
      }
      try {
        gate.validate(intent.token, command);
      } catch (e) {
        const ec = errCode(e) ?? 'denied';
        store.request({
          toolId: cmd.id,
          kind: 'write',
          command: commandLog,
          argsJson: argsLog,
          outcome: 'denied',
          errorCode: ec,
          errorMsg: e instanceof Error ? e.message : String(e),
          durationMs: Date.now() - started,
        });
        store.writeAudit({
          requestId: null,
          toolId: cmd.id,
          command: commandLog,
          status: ec === 'expired' ? 'expired' : 'denied',
          success: null,
          errorCode: ec,
          errorMsg: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
    } else if (token === undefined) {
      throw new ConfirmError('invalid_token', 'confirmation token required');
    } else {
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
  const humanConfirm = opts.humanConfirm ?? false;
  for (const cmd of allCommands()) {
    if (!isToolEnabled(cmd, opts)) continue;
    if (cmd.kind === 'read') registerRead(server, client, store, cmd, outputLimit);
    else registerWrite(server, client, gate, store, cmd, autoCommit, humanConfirm, opts.confirmPassphrase);
  }
}