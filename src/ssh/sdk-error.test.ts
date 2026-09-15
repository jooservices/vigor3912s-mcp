import { Vigor3912SError, sdkErrorCodes } from '@jooservices/vigor3912s-sdk';
import { describe, expect, it } from 'vitest';
import { VigorCommandError } from './client.js';
import { formatInvokeResult, mapSdkError } from './sdk-error.js';

describe('mapSdkError', () => {
  it('returns VigorCommandError unchanged', () => {
    const err = new VigorCommandError('timeout', 'already mapped');
    expect(mapSdkError(err)).toBe(err);
  });

  it.each([
    [sdkErrorCodes.executionTimeout, 'timeout'],
    [sdkErrorCodes.sessionClosed, 'closed'],
    [sdkErrorCodes.commandFramingRejected, 'invalid'],
    [sdkErrorCodes.outputLimitExceeded, 'invalid'],
    [sdkErrorCodes.operationNotImplemented, 'connect'],
  ] as const)('maps Vigor3912SError %s to %s', (sdkCode, vigorCode) => {
    const err = new Vigor3912SError(sdkCode, `sdk:${sdkCode}`);
    expect(mapSdkError(err)).toMatchObject({ code: vigorCode, message: `sdk:${sdkCode}` });
  });

  it('maps plain Error message to connect', () => {
    expect(mapSdkError(new Error('boom'))).toMatchObject({ code: 'connect', message: 'boom' });
  });

  it('maps non-Error values via String()', () => {
    expect(mapSdkError('raw-fail')).toMatchObject({ code: 'connect', message: 'raw-fail' });
  });
});

describe('formatInvokeResult', () => {
  it('returns strings as-is', () => {
    expect(formatInvokeResult('ok')).toBe('ok');
  });

  it('returns empty string for nullish', () => {
    expect(formatInvokeResult(undefined)).toBe('');
    expect(formatInvokeResult(null)).toBe('');
  });

  it('prefers a string raw field on objects', () => {
    expect(formatInvokeResult({ raw: 'from-parser', extra: 1 })).toBe('from-parser');
  });

  it('JSON-stringifies objects without a string raw field', () => {
    expect(formatInvokeResult({ raw: 12 })).toBe(JSON.stringify({ raw: 12 }, null, 2));
    expect(formatInvokeResult({ ok: true })).toBe(JSON.stringify({ ok: true }, null, 2));
  });

  it('JSON-stringifies non-object primitives', () => {
    expect(formatInvokeResult(42)).toBe('42');
  });
});
