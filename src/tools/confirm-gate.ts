import { randomBytes } from 'node:crypto';

export type ConfirmErrorCode = 'invalid_token' | 'token_used' | 'token_expired' | 'mismatch';

export class ConfirmError extends Error {
  readonly code: ConfirmErrorCode;
  constructor(code: ConfirmErrorCode, message: string) {
    super(message);
    this.name = 'ConfirmError';
    this.code = code;
  }
}

interface WriteIntent {
  token: string;
  toolId: string;
  command: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/**
 * Two-step confirmation gate for write commands. A write tool first creates an
 * intent and returns a short-lived, single-use token bound to the exact
 * rendered command; the confirmed second call must present that token and
 * reconstruct the identical command before it is sent to the router.
 */
export class ConfirmGate {
  private intents = new Map<string, WriteIntent>();
  /** tokens that were already consumed (kept until their expiry for audit). */
  private used = new Map<string, number>();

  constructor(
    private readonly ttlMs = 60000,
    private readonly maxPending = 100,
  ) {}

  create(toolId: string, command: string): { token: string } {
    this.prune();
    if (this.intents.size >= this.maxPending) {
      throw new ConfirmError(
        'invalid_token',
        `too many pending confirmations (max ${this.maxPending}); confirm or wait`,
      );
    }
    const token = randomBytes(16).toString('hex');
    const now = Date.now();
    this.intents.set(token, {
      token,
      toolId,
      command,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      used: false,
    });
    return { token };
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
      throw new ConfirmError('token_expired', 'confirmation token has expired');
    }
    if (intent.command !== command) {
      throw new ConfirmError('mismatch', 'confirmed command does not match the change');
    }
    intent.used = true;
    this.intents.delete(token);
    this.used.set(token, Date.now() + this.ttlMs);
  }

  /** Remove expired intents and consumed tokens to bound memory. */
  prune(): void {
    const now = Date.now();
    for (const [token, intent] of this.intents) {
      if (now > intent.expiresAt) this.intents.delete(token);
    }
    for (const [token, expiry] of this.used) {
      if (now > expiry) this.used.delete(token);
    }
  }

  get size(): number {
    return this.intents.size;
  }
}