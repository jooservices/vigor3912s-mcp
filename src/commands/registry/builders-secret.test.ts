import { describe, expect, it, vi } from 'vitest';

const wrappedSecretSchema = {
  oneOf: [
    { const: 'off' },
    {
      type: 'object',
      properties: { password: { type: 'string' } },
      required: ['password'],
      additionalProperties: false,
    },
  ],
} as const;

vi.mock('@jooservices/vigor3912s-sdk/schemas', async (importOriginal) => {
  const original = await importOriginal<typeof import('@jooservices/vigor3912s-sdk/schemas')>();
  return {
    ...original,
    inputSchemaFor: (manifestId: string) =>
      manifestId === 'cli.sys.autoreboot'
        ? wrappedSecretSchema
        : original.inputSchemaFor(manifestId),
  };
});

import { S } from './builders.js';

describe('S secret arguments', () => {
  it('redacts the whole input wrapper when a wrapped schema has a secret field', () => {
    const cmd = S('sys_autoreboot_secret', 'sys', 'cli.sys.autoreboot', 'Auto-reboot schedule');
    expect(cmd.secretArgs).toEqual(['input']);
  });
});
