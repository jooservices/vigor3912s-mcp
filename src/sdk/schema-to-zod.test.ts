import { describe, expect, it } from 'vitest';
import { jsonSchemaToZod, type JsonSchema } from './schema-to-zod.js';

describe('jsonSchemaToZod', () => {
  it('converts null (void op) to an empty shape and z.undefined() full schema', () => {
    const { shape, full } = jsonSchemaToZod(null);
    expect(Object.keys(shape)).toEqual([]);
    expect(full.safeParse(undefined).success).toBe(true);
    expect(full.safeParse({}).success).toBe(false);
  });

  it('marks required properties required and others optional', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
      required: ['name'],
      additionalProperties: false,
    };
    const { shape, full } = jsonSchemaToZod(schema);
    expect(shape.name!.isOptional()).toBe(false);
    expect(shape.age!.isOptional()).toBe(true);
    expect(full.safeParse({ name: 'x' }).success).toBe(true);
    expect(full.safeParse({ age: 1 }).success).toBe(false);
    expect(full.safeParse({ name: 'x', extra: true }).success).toBe(false);
  });

  it('converts string/number/integer/boolean/array leaf types', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        s: { type: 'string' },
        n: { type: 'number' },
        i: { type: 'integer' },
        b: { type: 'boolean' },
        arr: { type: 'array', items: { type: 'string' } },
      },
      required: ['s', 'n', 'i', 'b', 'arr'],
    };
    const { full } = jsonSchemaToZod(schema);
    expect(
      full.safeParse({ s: 'x', n: 1.5, i: 2, b: true, arr: ['a', 'b'] }).success,
    ).toBe(true);
    expect(full.safeParse({ s: 'x', n: 1.5, i: 2.5, b: true, arr: ['a'] }).success).toBe(false);
    expect(full.safeParse({ s: 'x', n: 1.5, i: 2, b: true, arr: [1] }).success).toBe(false);
  });

  it('falls back to z.unknown() items for an array with no "items" schema', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { arr: { type: 'array' } },
      required: ['arr'],
    };
    const { full } = jsonSchemaToZod(schema);
    expect(full.safeParse({ arr: ['a', 1, true] }).success).toBe(true);
    expect(full.safeParse({ arr: 'not-an-array' }).success).toBe(false);
  });

  it('converts inclusive numeric and array length bounds', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        percentage: { type: 'number', minimum: 0, maximum: 100 },
        ports: { type: 'integer', minimum: 1, maximum: 65535 },
        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 2 },
      },
      required: ['percentage', 'ports', 'tags'],
    };
    const { full } = jsonSchemaToZod(schema);

    expect(full.safeParse({ percentage: 0, ports: 1, tags: ['a'] }).success).toBe(true);
    expect(full.safeParse({ percentage: 100, ports: 65535, tags: ['a', 'b'] }).success).toBe(true);
    expect(full.safeParse({ percentage: -1, ports: 1, tags: ['a'] }).success).toBe(false);
    expect(full.safeParse({ percentage: 1, ports: 65536, tags: ['a'] }).success).toBe(false);
    expect(full.safeParse({ percentage: 1, ports: 1, tags: [] }).success).toBe(false);
    expect(full.safeParse({ percentage: 1, ports: 1, tags: ['a', 'b', 'c'] }).success).toBe(false);
  });

  it('converts enum to z.enum for strings and z.union of literals for mixed values', () => {
    const strEnum: JsonSchema = {
      type: 'object',
      properties: { mode: { type: 'string', enum: ['on', 'off'] } },
      required: ['mode'],
    };
    const { full: strFull } = jsonSchemaToZod(strEnum);
    expect(strFull.safeParse({ mode: 'on' }).success).toBe(true);
    expect(strFull.safeParse({ mode: 'maybe' }).success).toBe(false);

    const mixedEnum: JsonSchema = {
      type: 'object',
      properties: { level: { enum: [1, 2, 'auto'] } },
      required: ['level'],
    };
    const { full: mixedFull } = jsonSchemaToZod(mixedEnum);
    expect(mixedFull.safeParse({ level: 2 }).success).toBe(true);
    expect(mixedFull.safeParse({ level: 'auto' }).success).toBe(true);
    expect(mixedFull.safeParse({ level: 3 }).success).toBe(false);
  });

  it('converts const to a literal', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { kind: { const: 'fixed' } },
      required: ['kind'],
    };
    const { full } = jsonSchemaToZod(schema);
    expect(full.safeParse({ kind: 'fixed' }).success).toBe(true);
    expect(full.safeParse({ kind: 'other' }).success).toBe(false);
  });

  it('flattens top-level oneOf into a raw shape and validates via discriminatedUnion in full', () => {
    const schema: JsonSchema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            action: { const: 'add' },
            name: { type: 'string' },
          },
          required: ['action', 'name'],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: {
            action: { const: 'remove' },
            id: { type: 'integer' },
          },
          required: ['action', 'id'],
          additionalProperties: false,
        },
      ],
    };
    const { shape, full } = jsonSchemaToZod(schema);

    // Shape flattening: action enum of all consts + every other prop, optional.
    expect(shape.action).toBeDefined();
    expect(shape.name!.isOptional()).toBe(true);
    expect(shape.id!.isOptional()).toBe(true);
    expect(shape.action!.safeParse('add').success).toBe(true);
    expect(shape.action!.safeParse('remove').success).toBe(true);
    expect(shape.action!.safeParse('bogus').success).toBe(false);

    // Full: strict discriminated union — accepts exactly-shaped branches, rejects cross-branch mixing.
    expect(full.safeParse({ action: 'add', name: 'x' }).success).toBe(true);
    expect(full.safeParse({ action: 'remove', id: 1 }).success).toBe(true);
    expect(full.safeParse({ action: 'add', id: 1 }).success).toBe(false);
    expect(full.safeParse({ action: 'add', name: 'x', id: 1 }).success).toBe(false);
    expect(full.safeParse({ action: 'bogus' }).success).toBe(false);
  });

  it('unions a property that has different schemas across oneOf branches', () => {
    const schema: JsonSchema = {
      oneOf: [
        {
          type: 'object',
          properties: { action: { const: 'a' }, value: { type: 'string' } },
          required: ['action'],
        },
        {
          type: 'object',
          properties: { action: { const: 'b' }, value: { type: 'integer' } },
          required: ['action'],
        },
      ],
    };
    const { shape } = jsonSchemaToZod(schema);
    expect(shape.value!.safeParse('x').success).toBe(true);
    expect(shape.value!.safeParse(1).success).toBe(true);
    expect(shape.value!.safeParse(true).success).toBe(false);
  });

  it('carries description via .describe()', () => {
    const schema: JsonSchema = {
      type: 'object',
      description: 'top level',
      properties: {
        name: { type: 'string', description: 'the name' },
      },
      required: ['name'],
    };
    const { shape, full } = jsonSchemaToZod(schema);
    expect(shape.name!.description).toBe('the name');
    expect(full.description).toBe('top level');
  });

  it('throws with a path when it encounters an unsupported keyword', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', $ref: '#/definitions/x' },
      },
    } as unknown as JsonSchema;
    expect(() => jsonSchemaToZod(schema)).toThrow(/\$ref/);
    expect(() => jsonSchemaToZod(schema)).toThrow(/\$\.name/);
  });

  it('wraps a top-level non-object schema under a single "input" arg', () => {
    const { shape, full, wrap } = jsonSchemaToZod({ type: 'string' });
    expect(wrap).toBe('input');
    expect(Object.keys(shape)).toEqual(['input']);
    expect(shape.input!.safeParse('x').success).toBe(true);
    expect(shape.input!.safeParse(1).success).toBe(false);
    expect(full.safeParse('x').success).toBe(true);
  });

  it('wraps a mixed literal/object top-level oneOf under a single "input" arg', () => {
    const schema: JsonSchema = {
      oneOf: [
        { const: 'on' },
        { const: 'off' },
        {
          type: 'object',
          properties: { hours: { type: 'number' } },
          required: ['hours'],
          additionalProperties: false,
        },
      ],
    };
    const { shape, full, wrap } = jsonSchemaToZod(schema);
    expect(wrap).toBe('input');
    expect(Object.keys(shape)).toEqual(['input']);
    expect(full.safeParse('on').success).toBe(true);
    expect(full.safeParse('off').success).toBe(true);
    expect(full.safeParse({ hours: 3 }).success).toBe(true);
    expect(full.safeParse('bogus').success).toBe(false);
  });

  it('finds a common const discriminator by any name, not just "action"', () => {
    const schema: JsonSchema = {
      oneOf: [
        {
          type: 'object',
          properties: { option: { const: 'enable' }, enabled: { type: 'boolean' } },
          required: ['option', 'enabled'],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: { option: { const: 'ip' }, ipAddress: { type: 'string' } },
          required: ['option', 'ipAddress'],
          additionalProperties: false,
        },
      ],
    };
    const { shape, full } = jsonSchemaToZod(schema);
    expect(shape.option).toBeDefined();
    expect(shape.enabled!.isOptional()).toBe(true);
    expect(shape.ipAddress!.isOptional()).toBe(true);
    expect(full.safeParse({ option: 'enable', enabled: true }).success).toBe(true);
    expect(full.safeParse({ option: 'ip', ipAddress: '1.2.3.4' }).success).toBe(true);
    expect(full.safeParse({ option: 'enable', ipAddress: '1.2.3.4' }).success).toBe(false);
  });

  it('unions object oneOf branches without a common const discriminator', () => {
    const schema: JsonSchema = {
      oneOf: [
        {
          type: 'object',
          properties: { index: { type: 'number' } },
          required: ['index'],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: { all: { const: true } },
          required: ['all'],
          additionalProperties: false,
        },
      ],
    };
    const { shape, full, wrap } = jsonSchemaToZod(schema);
    expect(wrap).toBeUndefined();
    expect(shape.index!.isOptional()).toBe(true);
    expect(shape.all!.isOptional()).toBe(true);
    expect(full.safeParse({ index: 1 }).success).toBe(true);
    expect(full.safeParse({ all: true }).success).toBe(true);
    expect(full.safeParse({ index: 1, all: true }).success).toBe(false);
    expect(full.safeParse({}).success).toBe(false);
  });

  it('throws on an empty enum', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { mode: { enum: [] } },
    };
    expect(() => jsonSchemaToZod(schema)).toThrow(/enum.*must not be empty/);
  });

  it('converts a single-value enum to a literal', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { mode: { enum: ['only'] } },
      required: ['mode'],
    };
    const { full } = jsonSchemaToZod(schema);
    expect(full.safeParse({ mode: 'only' }).success).toBe(true);
    expect(full.safeParse({ mode: 'other' }).success).toBe(false);
  });

  it('converts a nested (non-top-level) oneOf property', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        value: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
      },
      required: ['value'],
    };
    const { full } = jsonSchemaToZod(schema);
    expect(full.safeParse({ value: 'x' }).success).toBe(true);
    expect(full.safeParse({ value: 1 }).success).toBe(true);
    expect(full.safeParse({ value: true }).success).toBe(false);
  });

  it('collapses a single-branch nested oneOf to that branch directly', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        value: { oneOf: [{ type: 'string' }] },
      },
      required: ['value'],
    };
    const { full } = jsonSchemaToZod(schema);
    expect(full.safeParse({ value: 'x' }).success).toBe(true);
    expect(full.safeParse({ value: 1 }).success).toBe(false);
  });

  it('throws on an empty nested oneOf', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { value: { oneOf: [] } },
    };
    expect(() => jsonSchemaToZod(schema)).toThrow(/oneOf.*must not be empty/);
  });

  it('throws for a property schema with no recognized keyword or type', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { value: {} },
    };
    expect(() => jsonSchemaToZod(schema)).toThrow(/unsupported or missing "type"/);
  });

  it('throws when a top-level oneOf has fewer than 2 branches', () => {
    const schema: JsonSchema = {
      oneOf: [{ type: 'object', properties: { action: { const: 'only' } } }],
    };
    expect(() => jsonSchemaToZod(schema)).toThrow(/at least 2 branches/);
  });

  it('carries description on a top-level oneOf full schema', () => {
    const schema: JsonSchema = {
      description: 'union of actions',
      oneOf: [
        { type: 'object', properties: { action: { const: 'a' } }, required: ['action'] },
        { type: 'object', properties: { action: { const: 'b' } }, required: ['action'] },
      ],
    };
    const { full } = jsonSchemaToZod(schema);
    expect(full.description).toBe('union of actions');
  });

  it('wraps a oneOf with a non-object branch under a single "input" arg', () => {
    const schema: JsonSchema = {
      oneOf: [
        { type: 'string' },
        { type: 'object', properties: { action: { const: 'b' } }, required: ['action'] },
      ],
    };
    const { shape, full, wrap } = jsonSchemaToZod(schema);
    expect(wrap).toBe('input');
    expect(Object.keys(shape)).toEqual(['input']);
    expect(full.safeParse('x').success).toBe(true);
    expect(full.safeParse({ action: 'b' }).success).toBe(true);
  });

  it('unions object oneOf branches with no property shared as const in every branch', () => {
    const schema: JsonSchema = {
      oneOf: [
        { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
        { type: 'object', properties: { action: { const: 'b' } }, required: ['action'] },
      ],
    };
    const { shape, full } = jsonSchemaToZod(schema);
    expect(shape.name!.isOptional()).toBe(true);
    expect(shape.action!.isOptional()).toBe(true);
    expect(full.safeParse({ name: 'x' }).success).toBe(true);
    expect(full.safeParse({ action: 'b' }).success).toBe(true);
  });
});
