import { describe, expect, it } from 'vitest';
import type { JsonSchema } from './schema-to-zod.js';
import { secretFieldsOf, SECRET_FIELD } from './secret-fields.js';

describe('secretFieldsOf', () => {
  it('finds string secret fields in oneOf branches', () => {
    const schema: JsonSchema = {
      oneOf: [
        { type: 'object', properties: { action: { const: 'set' } } },
        { type: 'object', properties: { key: { type: 'string' } } },
      ],
    };

    expect(secretFieldsOf(schema)).toEqual(['key']);
  });

  it('ignores secret-looking boolean fields', () => {
    expect(secretFieldsOf({ type: 'object', properties: { pass: { type: 'boolean' } } })).toEqual(
      [],
    );
  });

  it('matches only the documented secret field names', () => {
    expect(SECRET_FIELD.test('private_key')).toBe(true);
    expect(SECRET_FIELD.test('pass2')).toBe(true);
    expect(SECRET_FIELD.test('passwordHint')).toBe(false);
  });
});
