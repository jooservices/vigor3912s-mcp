import { Vigor3912SError, sdkErrorCodes } from '@jooservices/vigor3912s-sdk';
import { VigorCommandError, type VigorErrorCode } from './client.js';

export function mapSdkError(err: unknown): VigorCommandError {
  if (err instanceof VigorCommandError) return err;
  if (err instanceof Vigor3912SError) {
    const code: VigorErrorCode =
      err.code === sdkErrorCodes.executionTimeout
        ? 'timeout'
        : err.code === sdkErrorCodes.sessionClosed
          ? 'closed'
          : err.code === sdkErrorCodes.commandFramingRejected ||
              err.code === sdkErrorCodes.outputLimitExceeded
            ? 'invalid'
            : 'connect';
    return new VigorCommandError(code, err.message);
  }
  const msg = err instanceof Error ? err.message : String(err);
  return new VigorCommandError('connect', msg);
}

export function formatInvokeResult(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  if (typeof value === 'object' && value !== null && 'raw' in value) {
    const raw = (value as { raw?: unknown }).raw;
    if (typeof raw === 'string') return raw;
  }
  return JSON.stringify(value, null, 2);
}
