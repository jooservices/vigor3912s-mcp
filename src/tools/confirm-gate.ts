import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type ConfirmErrorCode = 'invalid_token' | 'token_used' | 'token_expired' | 'mismatch';

export class ConfirmError extends Error {
  readonly code: ConfirmErrorCode;
  constructor(code: ConfirmErrorCode, message: string) {
    super(message);
    this.name = 'ConfirmError';
    this.code = code;
  }
}

export interface WriteIntent {
  token: string;
  confirmationId: string;
  toolId: string;
  command: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/** Public view of a pending intent (no token) for the human-confirm CLI. */
export interface PendingIntentView {
  confirmationId: string;
  toolId: string;
  command: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Two-step confirmation gate for write commands.
 *
 * Default behavior: a write tool creates an intent and returns a short-lived,
 * single-use token bound to the exact rendered command; the confirmed second
 * call must present that token and reconstruct the identical command.
 *
 * Human-confirm mode (`pendingFile` set): intents are persisted to a JSON file
 * and the token is NOT returned to the model. A human retrieves and approves
 * it via the CLI (`node tools/confirm.mjs <confirmationId>`).
 */
export class ConfirmGate {
  private intents = new Map<string, WriteIntent>();
  /** tokens that were already consumed (kept until their expiry for audit). */
  private used = new Map<string, number>();

  constructor(
    private readonly ttlMs = 60000,
    private readonly maxPending = 100,
    private readonly pendingFile?: string,
  ) {}

  create(toolId: string, command: string): { token: string; confirmationId: string } {
    this.prune();
    if (this.intents.size >= this.maxPending) {
      throw new ConfirmError(
        'invalid_token',
        `too many pending confirmations (max ${this.maxPending}); confirm or wait`,
      );
    }
    const token = randomBytes(16).toString('hex');
    let confirmationId = randomBytes(3).toString('hex');
    while (this.getByConfirmationId(confirmationId) !== undefined) {
      confirmationId = randomBytes(3).toString('hex');
    }
    const now = Date.now();
    this.intents.set(token, {
      token,
      confirmationId,
      toolId,
      command,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      used: false,
    });
    this.persist();
    return { token, confirmationId };
  }

  validate(token: string, command: string): void {
    const usedExpiry = this.used.get(token);
    if (usedExpiry !== undefined) {
      if (Date.now() > usedExpiry) {
        this.used.delete(token);
      } else {
        throw new ConfirmError('token_used', 'confirmation token has already been used');
      }
    }
    const intent = this.intents.get(token);
    if (!intent) throw new ConfirmError('invalid_token', 'confirmation token not found');
    if (intent.used) throw new ConfirmError('token_used', 'confirmation token has already been used');
    if (Date.now() > intent.expiresAt) {
      this.intents.delete(token);
      this.persist();
      throw new ConfirmError('token_expired', 'confirmation token has expired');
    }
    if (intent.command !== command) {
      throw new ConfirmError('mismatch', 'confirmed command does not match the change');
    }
    intent.used = true;
    this.intents.delete(token);
    this.used.set(token, Date.now() + this.ttlMs);
    this.persist();
  }

  /** Look up a pending intent by its short confirmation id. */
  getByConfirmationId(id: string): WriteIntent | undefined {
    this.prune();
    for (const intent of this.intents.values()) {
      if (intent.confirmationId === id) return intent;
    }
    return undefined;
  }

  /** Pending intents without tokens (for the human-confirm CLI). */
  pendingViews(): PendingIntentView[] {
    this.prune();
    return [...this.intents.values()].map((i) => ({
      confirmationId: i.confirmationId,
      toolId: i.toolId,
      command: i.command,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    }));
  }

  /** Load pending intents persisted by another process (e.g. the CLI). */
  static loadPending(file: string): PendingIntentView[] {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(raw)) return [];
      return raw.filter(
        (i) =>
          i && typeof i.confirmationId === 'string' && typeof i.command === 'string',
      );
    } catch {
      return [];
    }
  }

  private persist(): void {
    if (!this.pendingFile) return;
    try {
      fs.mkdirSync(path.dirname(this.pendingFile), { recursive: true });
      fs.writeFileSync(this.pendingFile, JSON.stringify(this.pendingViews(), null, 2) + '\n');
    } catch {
      /* best-effort */
    }
  }

  /** Remove expired intents and consumed tokens to bound memory. */
  prune(): void {
    const now = Date.now();
    let changed = false;
    for (const [token, intent] of this.intents) {
      if (now > intent.expiresAt) {
        this.intents.delete(token);
        changed = true;
      }
    }
    for (const [token, expiry] of this.used) {
      if (now > expiry) this.used.delete(token);
    }
    if (changed) this.persist();
  }

  get size(): number {
    return this.intents.size;
  }
}