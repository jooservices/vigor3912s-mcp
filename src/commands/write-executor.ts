import { LogStore } from '../db/log.js';
import type { VigorClient } from '../ssh/client.js';
import { buildSignPayload } from '../tools/approve-crypto.js';
import { ConfirmError, type ConfirmGate } from '../tools/confirm-gate.js';
import { redactArgs, redactCommand } from '../tools/redaction.js';
import { errCode, errMsg, iso, logWriteOutcome, timingOf } from './tool-log.js';
import type { CommandDef } from './registry/index.js';
import { findCommand } from './registry/index.js';
import { isRouterCliFailure } from './router-cli-result.js';
import { resolveSdkInput } from './sdk-invoke.js';

/** Map ConfirmGate error codes onto write_audit status values. */
function auditDenyStatus(code: string): 'expired' | 'mismatch' | 'denied' {
  if (code === 'token_expired' || code === 'expired') return 'expired';
  if (code === 'mismatch') return 'mismatch';
  return 'denied';
}

async function snapshot(client: VigorClient, snapshotRead: string | undefined): Promise<string | null> {
  if (!snapshotRead) return null;
  const cmd = findCommand(snapshotRead);
  if (!cmd || cmd.kind !== 'read') return null;
  try {
    if (cmd.sdk) {
      return await client.runOperation(cmd.sdk.manifestId, resolveSdkInput(cmd.sdk, {}));
    }
    return await client.runCommand(cmd.render({}));
  } catch {
    return null;
  }
}

function canPersistSnapshots(cmd: CommandDef): boolean {
  if (!cmd.snapshotRead) return true;
  return findCommand(cmd.snapshotRead)?.sensitiveOutput !== true;
}

async function runCommit(client: VigorClient, store: LogStore): Promise<'ok' | 'failed' | 'skipped'> {
  const started = Date.now();
  try {
    client.authorizeWrite('sys commit');
    const raw = await client.runWriteCommand('sys commit');
    if (isRouterCliFailure(raw)) {
      throw new Error(`router rejected commit: ${raw.trim().slice(0, 200)}`);
    }
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
      errorMsg: errMsg(e),
      durationMs: Date.now() - started,
    });
    return 'failed';
  }
}

function confirmMessage(commandLog: string, cmd: CommandDef, ttlMs: number): string {
  const impact = cmd.affectsNetwork ? 'network-affecting' : 'configuration change';
  const danger =
    cmd.confirm === 'dual'
      ? '\n⚠️ **DUAL confirm** — requires acknowledge: true in addition to a valid approval signature (can drop connectivity, lock out management, or reboot).'
      : '';
  return [
    '🛑 **Router write — cryptographic approval required**',
    '',
    'The assistant wants to execute this on the router:',
    '',
    `\`\`\`\n${commandLog}\n\`\`\``,
    '',
    `• Type: write / ${impact} / confirm=${cmd.confirm ?? 'confirm'}`,
    '• Sign the returned payload with your approve private key (`node tools/approve.mjs …`).',
    `• The signature is single-use and bound to this exact command digest (expires in ${Math.round(ttlMs / 1000)} seconds).`,
    danger,
    '',
    'Reply is not enough — paste the signature into the next tool call as `signature`.',
  ].join('\n');
}

export interface ExecuteWriteOptions {
  gate: ConfirmGate;
  store: LogStore;
  autoCommit: boolean;
  signal?: AbortSignal;
}

function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw Object.assign(new Error('request cancelled before router execution'), { code: 'cancelled' });
}

/**
 * Confirm → snapshot → execute → commit → audit for one write tool call.
 * Transport-agnostic: returns a JSON-serializable body, or throws on deny/error.
 */
export async function executeWrite(
  cmd: CommandDef,
  args: Record<string, unknown>,
  client: VigorClient,
  opts: ExecuteWriteOptions,
): Promise<Record<string, unknown>> {
  return opts.gate.runExclusive(() => executeWriteLocked(cmd, args, client, opts));
}

async function executeWriteLocked(
  cmd: CommandDef,
  args: Record<string, unknown>,
  client: VigorClient,
  opts: ExecuteWriteOptions,
): Promise<Record<string, unknown>> {
  const started = Date.now();
  const { confirmation_id, signature, acknowledge, ...rest } = args;
  const argsLog = redactArgs(rest, cmd.secretArgs ?? []);
  let prepared: PreparedWrite;
  try {
    prepared = prepareWrite(cmd, rest);
  } catch (error) {
    recordPreparationFailure(cmd, opts.store, argsLog, started, error);
    throw error;
  }
  const cid = typeof confirmation_id === 'string' ? confirmation_id : undefined;
  const sig = typeof signature === 'string' ? signature : undefined;
  const context: WriteContext = {
    cmd, client, ...opts, started, argsLog, ...prepared, cid, sig, acknowledge,
  };
  const preview = previewWrite(context);
  if (preview !== null) return preview;
  verifyApproval(context);
  return recordWrite(context, await performWrite(context));
}

interface PreparedWrite {
  command: string;
  sdkInput: unknown;
  commandLog: string;
  redactedFields: string[];
}

interface WriteContext extends PreparedWrite, ExecuteWriteOptions {
  cmd: CommandDef;
  client: VigorClient;
  started: number;
  argsLog: string;
  cid?: string;
  sig?: string;
  acknowledge: unknown;
}

interface PerformedWrite {
  before: string | null;
  after: string | null;
  persistSnapshots: boolean;
  raw: string;
  writeTiming: ReturnType<typeof timingOf>;
  commitStatus: 'ok' | 'failed' | 'skipped';
}

function prepareWrite(cmd: CommandDef, args: Record<string, unknown>): PreparedWrite {
  const command = cmd.render(args);
  const redacted = redactCommand(command, args, cmd.secretArgs ?? []);
  return {
    command,
    commandLog: redacted.preview,
    redactedFields: redacted.fields,
    sdkInput: cmd.sdk ? resolveSdkInput(cmd.sdk, args) : undefined,
  };
}

function recordPreparationFailure(
  cmd: CommandDef,
  store: LogStore,
  argsLog: string,
  started: number,
  error: unknown,
): void {
  const code = errCode(error) ?? 'invalid';
  const message = errMsg(error);
  logWriteOutcome(store, {
    toolId: cmd.id, kind: 'write', command: cmd.id, argsJson: argsLog,
    outcome: 'denied', errorCode: code, errorMsg: message, durationMs: Date.now() - started,
  }, {
    toolId: cmd.id, command: cmd.id, status: 'denied', success: null,
    errorCode: code, errorMsg: message,
  });
}

function previewWrite(ctx: WriteContext): Record<string, unknown> | null {
  if (ctx.cid !== undefined || ctx.sig !== undefined) return null;
  const created = ctx.gate.create(ctx.cmd.id, ctx.command, ctx.commandLog, ctx.redactedFields);
  const tier = ctx.cmd.confirm === 'auto' ? 'confirm' : (ctx.cmd.confirm ?? 'confirm');
  const message = confirmMessage(ctx.commandLog, ctx.cmd, ctx.gate.ttlMs);
  logWriteOutcome(ctx.store, {
    toolId: ctx.cmd.id, kind: 'write', command: ctx.commandLog, argsJson: ctx.argsLog,
    outcome: 'needs_confirmation', durationMs: Date.now() - ctx.started,
    requestedAt: iso(ctx.started), respondedAt: iso(Date.now()),
  }, {
    toolId: ctx.cmd.id, command: ctx.commandLog, status: 'preview', success: null,
  });
  return {
    status: 'needs_confirmation',
    preview: ctx.commandLog,
    redacted_fields: ctx.redactedFields,
    confirmation_id: created.confirmationId,
    nonce: created.nonce,
    command_digest: created.commandDigest,
    expires_at: created.expiresAt,
    sign_payload: buildSignPayload(
      created.confirmationId, created.nonce, created.commandDigest, created.expiresAt,
    ).toString('utf8'),
    affects_network: ctx.cmd.affectsNetwork ?? false,
    confirm_tier: tier,
    dangerous: tier === 'dual',
    message,
    note: 'Sign sign_payload with your approve key (tools/approve.mjs), then call again with confirmation_id + signature.',
  };
}

function verifyApproval(ctx: WriteContext): void {
  if (!ctx.cid || !ctx.sig) {
    throw new ConfirmError(
      'invalid_token',
      'approval requires confirmation_id and signature (Ed25519 over sign_payload)',
    );
  }
  const tier = ctx.cmd.confirm === 'auto' ? 'confirm' : (ctx.cmd.confirm ?? 'confirm');
  if (tier === 'dual' && ctx.acknowledge !== true) {
    const message = 'dual-confirm write requires acknowledge: true';
    logWriteOutcome(ctx.store, {
      toolId: ctx.cmd.id, kind: 'write', command: ctx.commandLog, argsJson: ctx.argsLog,
      outcome: 'denied', errorCode: 'not_acknowledged', errorMsg: message,
      durationMs: Date.now() - ctx.started,
    }, {
      toolId: ctx.cmd.id, command: ctx.commandLog, status: 'denied', success: null,
      errorCode: 'not_acknowledged', errorMsg: message,
    });
    throw new Error(message);
  }
  try {
    throwIfCancelled(ctx.signal);
    ctx.gate.consumeSigned(ctx.cid, ctx.command, ctx.sig);
  } catch (error) {
    const code = ctx.signal?.aborted ? 'cancelled' : (errCode(error) ?? 'denied');
    logWriteOutcome(ctx.store, {
      toolId: ctx.cmd.id, kind: 'write', command: ctx.commandLog, argsJson: ctx.argsLog,
      outcome: 'denied', errorCode: code, errorMsg: errMsg(error),
      durationMs: Date.now() - ctx.started,
    }, {
      toolId: ctx.cmd.id, command: ctx.commandLog, status: auditDenyStatus(code), success: null,
      errorCode: code, errorMsg: errMsg(error),
    });
    throw error;
  }
}

async function performWrite(ctx: WriteContext): Promise<PerformedWrite> {
  const before = await snapshot(ctx.client, ctx.cmd.snapshotRead);
  const persistSnapshots = canPersistSnapshots(ctx.cmd);
  let raw: string;
  try {
    throwIfCancelled(ctx.signal);
    ctx.client.authorizeWrite(ctx.command);
    raw = ctx.cmd.sdk
      ? await ctx.client.runWriteOperation(ctx.cmd.sdk.manifestId, ctx.sdkInput)
      : await ctx.client.runWriteCommand(ctx.command);
    if (isRouterCliFailure(raw)) {
      throw Object.assign(new Error(`router rejected command: ${raw.trim().slice(0, 200)}`), {
        code: 'router_error',
      });
    }
  } catch (error) {
    const ended = Date.now();
    const cancelled = errCode(error) === 'cancelled';
    logWriteOutcome(ctx.store, {
      toolId: ctx.cmd.id, kind: 'write', command: ctx.commandLog, argsJson: ctx.argsLog,
      outcome: cancelled ? 'denied' : 'error', errorCode: errCode(error), errorMsg: errMsg(error),
      durationMs: ended - ctx.started, requestedAt: iso(ctx.started), respondedAt: iso(ended),
      ...timingOf(ctx.client),
    }, {
      toolId: ctx.cmd.id, command: ctx.commandLog, status: cancelled ? 'denied' : 'failed',
      success: cancelled ? null : false,
      beforeSnapshot: persistSnapshots ? before ?? undefined : undefined,
      errorCode: errCode(error), errorMsg: errMsg(error),
    });
    throw error;
  }
  const writeTiming = timingOf(ctx.client);
  const after = await snapshot(ctx.client, ctx.cmd.snapshotRead);
  const commitStatus = ctx.autoCommit && !ctx.cmd.skipCommit
    ? await runCommit(ctx.client, ctx.store)
    : 'skipped';
  return { before, after, persistSnapshots, raw, writeTiming, commitStatus };
}

function recordWrite(ctx: WriteContext, result: PerformedWrite): Record<string, unknown> {
  const ended = Date.now();
  const success = result.commitStatus !== 'failed';
  logWriteOutcome(ctx.store, {
    toolId: ctx.cmd.id, kind: 'write', command: ctx.commandLog, argsJson: ctx.argsLog,
    outcome: success ? 'ok' : 'error', errorCode: success ? undefined : 'commit_failed',
    errorMsg: success ? undefined : 'sys commit failed after write', durationMs: ended - ctx.started,
    output: (ctx.cmd.secretArgs ?? []).length === 0 ? result.raw : undefined,
    requestedAt: iso(ctx.started), respondedAt: iso(ended), ...result.writeTiming,
  }, {
    toolId: ctx.cmd.id, command: ctx.commandLog, status: success ? 'executed' : 'failed',
    success,
    beforeSnapshot: result.persistSnapshots ? result.before ?? undefined : undefined,
    afterSnapshot: result.persistSnapshots ? result.after ?? undefined : undefined,
    commitStatus: result.commitStatus,
    errorCode: success ? undefined : 'commit_failed',
    errorMsg: success ? undefined : 'sys commit failed after write',
  }, true);
  if (!success) {
    return {
      status: 'commit_failed', command: ctx.commandLog,
      before: result.before ?? undefined, after: result.after ?? undefined,
      output: result.raw, commit: result.commitStatus,
    };
  }
  return {
    status: 'done', command: ctx.commandLog,
    before: result.before ?? undefined, after: result.after ?? undefined,
    output: result.raw, commit: ctx.autoCommit ? result.commitStatus : 'skipped',
  };
}
