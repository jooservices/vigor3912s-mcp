import { LogStore, redactArgs, redactCommand } from '../db/log.js';
import type { VigorClient } from '../ssh/client.js';
import { ConfirmError, type ConfirmGate } from '../tools/confirm-gate.js';
import type { CommandDef } from './registry/index.js';
import { findCommand } from './registry/index.js';
import { isRouterCliFailure } from './router-cli-result.js';

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
    return await client.runCommand(cmd.render({}));
  } catch {
    return null;
  }
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
      errorMsg: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - started,
    });
    return 'failed';
  }
}

function confirmMessage(commandLog: string, cmd: CommandDef): string {
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
    '• The signature is single-use and bound to this exact command digest (expires in 60 seconds).',
    danger,
    '',
    'Reply is not enough — paste the signature into the next tool call as `signature`.',
  ].join('\n');
}

export interface ExecuteWriteOptions {
  gate: ConfirmGate;
  store: LogStore;
  autoCommit: boolean;
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
  const { gate, store, autoCommit } = opts;
  const { confirmation_id, signature, acknowledge, confirm_token, user_code, ...rest } = args;
  void confirm_token;
  void user_code;
  const cid = typeof confirmation_id === 'string' ? confirmation_id : undefined;
  const sig = typeof signature === 'string' ? signature : undefined;
  const secretArgs = cmd.secretArgs ?? [];
  const command = cmd.render(rest);
  const commandLog = redactCommand(command, rest, secretArgs);
  const argsLog = redactArgs(rest, secretArgs);
  const started = Date.now();
  const message = confirmMessage(commandLog, cmd);
  // Writes never use `auto` as a confirm bypass (reads never reach here).
  const tier = cmd.confirm === 'auto' ? 'confirm' : (cmd.confirm ?? 'confirm');

  const hasConfirmation = cid !== undefined || sig !== undefined;
  if (!hasConfirmation) {
    const created = gate.create(cmd.id, command, commandLog);
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
      status: 'needs_confirmation',
      preview: commandLog,
      confirmation_id: created.confirmationId,
      nonce: created.nonce,
      command_digest: created.commandDigest,
      expires_at: created.expiresAt,
      sign_payload: `${created.confirmationId}\n${created.nonce}\n${created.commandDigest}\n${created.expiresAt}`,
      affects_network: cmd.affectsNetwork ?? false,
      confirm_tier: tier,
      dangerous: tier === 'dual',
      message,
      note: 'Sign sign_payload with your approve key (tools/approve.mjs), then call again with confirmation_id + signature.',
    };
  }

  if (!cid || !sig) {
    throw new ConfirmError(
      'invalid_token',
      'approval requires confirmation_id and signature (Ed25519 over sign_payload)',
    );
  }

  if (tier === 'dual' && acknowledge !== true) {
    const msg = 'dual-confirm write requires acknowledge: true';
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
    gate.consumeSigned(cid, command, sig);
  } catch (e) {
    const denyCode = errCode(e) ?? 'denied';
    store.request({
      toolId: cmd.id,
      kind: 'write',
      command: commandLog,
      argsJson: argsLog,
      outcome: 'denied',
      errorCode: denyCode,
      errorMsg: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - started,
    });
    store.writeAudit({
      requestId: null,
      toolId: cmd.id,
      command: commandLog,
      status: auditDenyStatus(denyCode),
      success: null,
      errorCode: denyCode,
      errorMsg: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

  const before = await snapshot(client, cmd.snapshotRead);
  let raw: string;
  try {
    client.authorizeWrite(command);
    raw = await client.runWriteCommand(command);
    if (isRouterCliFailure(raw)) {
      throw Object.assign(new Error(`router rejected command: ${raw.trim().slice(0, 200)}`), {
        code: 'router_error',
      });
    }
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
  const success = commitStatus !== 'failed';
  const storeOutput = secretArgs.length === 0 ? raw : undefined;
  store.request({
    toolId: cmd.id,
    kind: 'write',
    command: commandLog,
    argsJson: argsLog,
    outcome: success ? 'ok' : 'error',
    errorCode: success ? undefined : 'commit_failed',
    errorMsg: success ? undefined : 'sys commit failed after write',
    durationMs: ended - started,
    output: storeOutput,
    requestedAt: iso(started),
    respondedAt: iso(ended),
    ...writeTiming,
  });
  const row = store.lastRequestId;
  store.writeAudit({
    requestId: row,
    toolId: cmd.id,
    command: commandLog,
    status: success ? 'executed' : 'failed',
    success,
    beforeSnapshot: before ?? undefined,
    afterSnapshot: after ?? undefined,
    commitStatus,
    errorCode: success ? undefined : 'commit_failed',
    errorMsg: success ? undefined : 'sys commit failed after write',
  });
  if (!success) {
    return {
      status: 'commit_failed',
      command: commandLog,
      before: before ?? undefined,
      after: after ?? undefined,
      output: raw,
      commit: commitStatus,
    };
  }
  return {
    status: 'done',
    command: commandLog,
    before: before ?? undefined,
    after: after ?? undefined,
    output: raw,
    commit: autoCommit ? commitStatus : 'skipped',
  };
}
