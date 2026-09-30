import { describe, expect, it } from 'vitest';
import { defaultToInput, resolveSdkInput } from './sdk-invoke.js';

describe('defaultToInput', () => {
  it('maps empty args to undefined (void op input)', () => {
    expect(defaultToInput({})).toBeUndefined();
  });

  it('passes non-empty args through unchanged', () => {
    expect(defaultToInput({ a: 1 })).toEqual({ a: 1 });
  });
});

describe('resolveSdkInput', () => {
  it('uses defaultToInput when sdk.toInput is not set', () => {
    expect(resolveSdkInput({ manifestId: 'x' }, {})).toBeUndefined();
    expect(resolveSdkInput({ manifestId: 'x' }, { a: 1 })).toEqual({ a: 1 });
  });

  it('uses sdk.toInput when provided', () => {
    const sdk = { manifestId: 'x', toInput: (args: Record<string, unknown>) => ({ wrapped: args }) };
    expect(resolveSdkInput(sdk, { a: 1 })).toEqual({ wrapped: { a: 1 } });
  });

  it('applies sdk.validate to the resolved input when provided', () => {
    const sdk = {
      manifestId: 'x',
      toInput: (args: Record<string, unknown>) => args,
      validate: (input: unknown) => ({ ...(input as Record<string, unknown>), validated: true }),
    };
    expect(resolveSdkInput(sdk, { a: 1 })).toEqual({ a: 1, validated: true });
  });
});
