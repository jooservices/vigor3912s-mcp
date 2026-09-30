import type { VigorClient } from '../ssh/client.js';

export const iso = (ms: number): string => new Date(ms).toISOString();

export function timingOf(client: VigorClient): {
  sendAt?: string | null;
  recvAt?: string | null;
  connectMs?: number | null;
} {
  const timing = client.lastCommandTiming;
  if (!timing) return { sendAt: null, recvAt: null, connectMs: null };
  return {
    sendAt: iso(timing.sendAt),
    recvAt: iso(timing.recvAt),
    connectMs: timing.connectMs,
  };
}

export function errCode(error: unknown): string | undefined {
  return error instanceof Error && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

export function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
