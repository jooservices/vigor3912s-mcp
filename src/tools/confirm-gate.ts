import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { digestCommand, verifyApprovalSignature } from './approve-crypto.js';

export type ConfirmErrorCode =
  | 'invalid_token'
  | 'token_used'
  | 'token_expired'
  | 'mismatch'
  | 'bad_signature'
  | 'rate_limited';

export class ConfirmError extends Error {
  readonly code: ConfirmErrorCode;
  constructor(code: ConfirmErrorCode, message: string) {
    super(message);
    this.name = 'ConfirmError';
    this.code = code;
  }
}

export interface WriteIntent {
  confirmationId: string;
  toolId: string;
  /** SHA-256 hex of the exact CLI that will run (secrets hashed, not stored). */
  commandDigest: string;
  /** Human-readable preview with secrets redacted. */
  commandPreview: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/** Public view of a pending intent for the approve CLI / model preview. */
export interface PendingIntentView {
  confirmationId: string;
  toolId: string;
  commandDigest: string;
  commandPreview: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
}

export interface CreateIntentResult {
  confirmationId: string;
  nonce: string;
  commandDigest: string;
  expiresAt: number;
}

/**
 * Signature-gated confirmation for write commands.
 *
 * Preview creates a pending intent (digest + redacted preview + nonce).
 * Execute requires `confirmation_id` + Ed25519 `signature` over the canonical
 * payload; the model never receives a reusable approve secret.
 */
export class ConfirmGate {
  private intents = new Map<string, WriteIntent>();
  /** Consumed confirmation ids kept until expiry for replay detection. */
  private used = new Map<string, number>();
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly ttlMs = 60000,
    private readonly maxPending = 100,
    private readonly pendingFile?: string,
    private readonly approvePublicKey?: string,
  ) {}

  /**
   * Serialize write confirm→execute workflows so snapshot/write/commit
   * cannot interleave across concurrent tool calls.
   */
  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  create(toolId: string, command: string, commandPreview: string): CreateIntentResult {
    this.prune();
    if (this.intents.size >= this.maxPending) {
      throw new ConfirmError(
        'invalid_token',
        `too many pending confirmations (max ${this.maxPending}); confirm or wait`,
      );
    }
    let confirmationId = randomBytes(8).toString('hex');
    while (this.intents.has(confirmationId) || this.used.has(confirmationId)) {
      confirmationId = randomBytes(8).toString('hex');
    }
    const now = Date.now();
    const nonce = randomBytes(16).toString('hex');
    const commandDigest = digestCommand(command);
    const expiresAt = now + this.ttlMs;
    this.intents.set(confirmationId, {
      confirmationId,
      toolId,
      commandDigest,
      commandPreview,
      nonce,
      createdAt: now,
      expiresAt,
      used: false,
    });
    this.persist();
    return { confirmationId, nonce, commandDigest, expiresAt };
  }

  getByConfirmationId(id: string): WriteIntent | undefined {
    this.prune();
    return this.intents.get(id);
  }

  /**
   * Verify signature + command digest, then consume the intent (single-use).
   */
  consumeSigned(confirmationId: string, command: string, signature: string): void {
    if (!this.approvePublicKey) {
      throw new ConfirmError('bad_signature', 'VIGOR_APPROVE_PUBKEY is not configured');
    }
    const usedExpiry = this.used.get(confirmationId);
    if (usedExpiry !== undefined) {
      if (Date.now() > usedExpiry) {
        this.used.delete(confirmationId);
      } else {
        throw new ConfirmError('token_used', 'confirmation has already been used');
      }
    }
    const intent = this.intents.get(confirmationId);
    if (!intent) throw new ConfirmError('invalid_token', 'confirmation not found');
    if (intent.used) throw new ConfirmError('token_used', 'confirmation has already been used');
    if (Date.now() > intent.expiresAt) {
      this.intents.delete(confirmationId);
      this.persist();
      throw new ConfirmError('token_expired', 'confirmation has expired');
    }
    const digest = digestCommand(command);
    if (digest !== intent.commandDigest) {
      throw new ConfirmError('mismatch', 'confirmed command does not match the change');
    }
    const ok = verifyApprovalSignature(
      this.approvePublicKey,
      signature,
      intent.confirmationId,
      intent.nonce,
      intent.commandDigest,
      intent.expiresAt,
    );
    if (!ok) {
      throw new ConfirmError('bad_signature', 'approval signature is invalid');
    }
    intent.used = true;
    this.intents.delete(confirmationId);
    this.used.set(confirmationId, Date.now() + this.ttlMs);
    this.persist();
  }

  pendingViews(): PendingIntentView[] {
    this.prune();
    return [...this.intents.values()].map((i) => ({
      confirmationId: i.confirmationId,
      toolId: i.toolId,
      commandDigest: i.commandDigest,
      commandPreview: i.commandPreview,
      nonce: i.nonce,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    }));
  }

  static loadPending(file: string): PendingIntentView[] {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
      if (!Array.isArray(raw)) return [];
      return raw.filter(
        (i): i is PendingIntentView =>
          !!i &&
          typeof i === 'object' &&
          typeof (i as PendingIntentView).confirmationId === 'string' &&
          typeof (i as PendingIntentView).commandDigest === 'string' &&
          typeof (i as PendingIntentView).commandPreview === 'string' &&
          typeof (i as PendingIntentView).nonce === 'string' &&
          typeof (i as PendingIntentView).expiresAt === 'number',
      );
    } catch {
      return [];
    }
  }

  private persist(): void {
    if (!this.pendingFile) return;
    try {
      fs.mkdirSync(path.dirname(this.pendingFile), { recursive: true });
      const body = JSON.stringify(this.pendingViews(), null, 2) + '\n';
      fs.writeFileSync(this.pendingFile, body, { mode: 0o600 });
      fs.chmodSync(this.pendingFile, 0o600);
    } catch {
      /* best-effort */
    }
  }

  prune(): void {
    const now = Date.now();
    let changed = false;
    for (const [id, intent] of this.intents) {
      if (now > intent.expiresAt) {
        this.intents.delete(id);
        changed = true;
      }
    }
    for (const [id, expiry] of this.used) {
      if (now > expiry) this.used.delete(id);
    }
    if (changed) this.persist();
  }

  get size(): number {
    return this.intents.size;
  }
}
