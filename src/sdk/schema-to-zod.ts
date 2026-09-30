import { z } from 'zod';
import type { ZodRawShape, ZodType } from 'zod';
import type { JsonSchema } from '@jooservices/vigor3912s-sdk/schemas';

export type { JsonSchema } from '@jooservices/vigor3912s-sdk/schemas';

const KNOWN_KEYS = new Set([
  'type',
  'properties',
  'required',
  'additionalProperties',
  'enum',
  'const',
  'oneOf',
  'items',
  'description',
  'minimum',
  'maximum',
  'minItems',
  'maxItems',
]);

function checkKnownKeys(schema: JsonSchema, path: string): void {
  for (const key of Object.keys(schema)) {
    if (!KNOWN_KEYS.has(key)) {
      throw new Error(`schema-to-zod: unsupported keyword "${key}" at ${path}`);
    }
  }
}

function buildEnum(values: readonly unknown[], path: string): ZodType {
  if (values.length === 0) {
    throw new Error(`schema-to-zod: enum at ${path} must not be empty`);
  }
  if (values.every((v): v is string => typeof v === 'string')) {
    return z.enum(values as [string, ...string[]]);
  }
  if (values.length === 1) return z.literal(values[0] as never);
  const literals = values.map((v) => z.literal(v as never)) as unknown as [ZodType, ZodType, ...ZodType[]];
  return z.union(literals);
}

function convertObjectShape(schema: JsonSchema, path: string): ZodRawShape {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const shape: ZodRawShape = {};
  for (const [key, propSchema] of Object.entries(properties)) {
    const zType = convertSchema(propSchema, `${path}.${key}`);
    shape[key] = required.has(key) ? zType : zType.optional();
  }
  return shape;
}

function convertSchema(schema: JsonSchema, path: string): ZodType {
  checkKnownKeys(schema, path);
  let zType: ZodType;
  if (schema.const !== undefined) {
    zType = z.literal(schema.const as never);
  } else if (schema.enum !== undefined) {
    zType = buildEnum(schema.enum, path);
  } else if (schema.oneOf !== undefined) {
    if (schema.oneOf.length === 0) {
      throw new Error(`schema-to-zod: oneOf at ${path} must not be empty`);
    }
    const branches = schema.oneOf.map((b, i) => convertSchema(b, `${path}.oneOf[${i}]`));
    zType = branches.length === 1 ? branches[0]! : z.union(branches as [ZodType, ZodType, ...ZodType[]]);
  } else {
    switch (schema.type) {
      case 'object': {
        const shape = convertObjectShape(schema, path);
        zType = schema.additionalProperties === false ? z.object(shape).strict() : z.object(shape);
        break;
      }
      case 'string':
        zType = z.string();
        break;
      case 'number':
      case 'integer': {
        let numberType = schema.type === 'integer' ? z.number().int() : z.number();
        if (schema.minimum !== undefined) numberType = numberType.min(schema.minimum);
        if (schema.maximum !== undefined) numberType = numberType.max(schema.maximum);
        zType = numberType;
        break;
      }
      case 'boolean':
        zType = z.boolean();
        break;
      case 'array': {
        const itemType = schema.items ? convertSchema(schema.items, `${path}[]`) : z.unknown();
        let arrayType = z.array(itemType);
        if (schema.minItems !== undefined) arrayType = arrayType.min(schema.minItems);
        if (schema.maxItems !== undefined) arrayType = arrayType.max(schema.maxItems);
        zType = arrayType;
        break;
      }
      default:
        throw new Error(`schema-to-zod: unsupported or missing "type" at ${path}`);
    }
  }
  if (schema.description) zType = zType.describe(schema.description);
  return zType;
}

/**
 * A property key that is present in every branch and declared `const` in
 * every branch — the discriminator for a `z.discriminatedUnion`. Candidate
 * keys are tried in the first branch's property order (deterministic); the
 * first key that is `const` in every branch wins. `null` when no such key
 * exists (branches must then be unioned without a discriminator). Callers
 * must first ensure every branch is `type: "object"` with `properties`.
 */
function findCommonConstDiscriminator(branches: readonly JsonSchema[]): string | null {
  const first = branches[0]!;
  for (const key of Object.keys(first.properties!)) {
    const isConstEverywhere = branches.every((b) => b.properties?.[key]?.const !== undefined);
    if (isConstEverywhere) return key;
  }
  return null;
}

/**
 * Flatten `oneOf` branches (all `type: "object"`, per the caller's
 * `allObjectBranches` check) into a single raw shape for `server.tool`: the
 * discriminator (when found by `findCommonConstDiscriminator`, so it is
 * guaranteed `const` in every branch) becomes an enum of its branch consts,
 * and every other property across branches becomes optional (unioned when
 * its type differs across branches).
 */
function flattenObjectOneOf(
  branches: readonly JsonSchema[],
  discriminatorKey: string | null,
  path: string,
): ZodRawShape {
  const discriminantConsts: unknown[] = [];
  const propTypes = new Map<string, ZodType[]>();
  branches.forEach((branch, i) => {
    checkKnownKeys(branch, `${path}.oneOf[${i}]`);
    const properties = branch.properties!;
    if (discriminatorKey) {
      discriminantConsts.push(properties[discriminatorKey]!.const);
    }
    for (const [key, propSchema] of Object.entries(properties)) {
      if (key === discriminatorKey) continue;
      const zType = convertSchema(propSchema, `${path}.oneOf[${i}].${key}`);
      const list = propTypes.get(key) ?? [];
      list.push(zType);
      propTypes.set(key, list);
    }
  });
  const shape: ZodRawShape = {};
  if (discriminatorKey) {
    shape[discriminatorKey] = buildEnum(discriminantConsts, path);
  }
  for (const [key, types] of propTypes) {
    const merged = types.length === 1 ? types[0]! : z.union(types as [ZodType, ZodType, ...ZodType[]]);
    shape[key] = merged.optional();
  }
  return shape;
}

interface ConvertedSchema {
  /** Flattened `ZodRawShape` for `server.tool(...)` (raw MCP args). */
  shape: ZodRawShape;
  /** Strict `ZodType` used to validate the exact typed input before `sdk.invoke()`. */
  full: ZodType;
  /**
   * Set when the schema's top-level shape cannot be represented as MCP raw
   * args directly (non-object, or a `oneOf` with a non-object branch): the
   * whole typed input is carried under a single `input` arg, and callers
   * must unwrap `args.input` before invoking the SDK operation.
   */
  wrap?: 'input';
}

function buildTopLevelOneOf(schema: JsonSchema, path: string): ConvertedSchema {
  const branches = schema.oneOf!;
  if (branches.length < 2) {
    throw new Error(`schema-to-zod: top-level oneOf must have at least 2 branches`);
  }
  const allObjectBranches = branches.every((b) => b.type === 'object' && b.properties);
  if (!allObjectBranches) {
    // Mixed/literal oneOf (e.g. `oneOf: [{const:'on'}, {const:'off'}, {type:'object',...}]`):
    // MCP tool args must be an object, so carry the whole typed value as `input`.
    const zType = convertSchema(schema, path);
    return { shape: { input: zType }, full: zType, wrap: 'input' };
  }
  const discriminatorKey = findCommonConstDiscriminator(branches);
  const shape = flattenObjectOneOf(branches, discriminatorKey, path);
  const zodBranches = branches.map((b, i) => convertSchema(b, `${path}.oneOf[${i}]`) as z.AnyZodObject);
  let full: ZodType = discriminatorKey
    ? z.discriminatedUnion(
        discriminatorKey,
        zodBranches as [z.AnyZodObject, z.AnyZodObject, ...z.AnyZodObject[]],
      )
    : z.union(zodBranches as unknown as [ZodType, ZodType, ...ZodType[]]);
  if (schema.description) full = full.describe(schema.description);
  return { shape, full };
}

/**
 * Convert an SDK `JsonSchema` (or `null` for a void operation) into:
 * - `shape` — flattened `ZodRawShape` for `server.tool(...)` (raw MCP args).
 * - `full` — strict `ZodType` used to validate the exact typed input before
 *   `sdk.invoke()` (a `z.discriminatedUnion`/`z.union` for top-level `oneOf`).
 * - `wrap` — `'input'` when the whole typed value must be carried under a
 *   single `input` arg (top-level non-object / mixed `oneOf`).
 */
export function jsonSchemaToZod(schema: JsonSchema | null): ConvertedSchema {
  if (schema === null) return { shape: {}, full: z.undefined() };
  checkKnownKeys(schema, '$');
  if (schema.oneOf !== undefined) {
    return buildTopLevelOneOf(schema, '$');
  }
  if (schema.type === 'object') {
    const shape = convertObjectShape(schema, '$');
    let full: ZodType = z.object(shape);
    if (schema.additionalProperties === false) full = (full as z.AnyZodObject).strict();
    if (schema.description) full = full.describe(schema.description);
    return { shape, full };
  }
  // Top-level non-object, non-oneOf (string/number/integer/boolean/array): MCP
  // tool args must be an object, so carry the whole typed value as `input`.
  const zType = convertSchema(schema, '$');
  return { shape: { input: zType }, full: zType, wrap: 'input' };
}
