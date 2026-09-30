import type { ZodRawShape } from 'zod';
import { inputSchemaFor } from '@jooservices/vigor3912s-sdk/schemas';
import { operationFor } from '../../sdk/operation-index.js';
import { jsonSchemaToZod } from '../../sdk/schema-to-zod.js';
import { VigorCommandError } from '../../ssh/client.js';
import { defaultToInput } from '../sdk-invoke.js';
import type { CommandDef, CommandKind } from './types.js';

export const R = (
  id: string,
  family: string,
  cli: string,
  desc: string,
  format?: CommandDef['format'],
): CommandDef => ({
  id,
  family,
  kind: 'read',
  desc,
  render: () => cli,
  args: {},
  ...(format ? { format } : {}),
});

export const Ra = (
  id: string,
  family: string,
  render: CommandDef['render'],
  args: ZodRawShape,
  desc: string,
  format?: CommandDef['format'],
): CommandDef => ({
  id,
  family,
  kind: 'read',
  render,
  args,
  desc,
  ...(format ? { format } : {}),
});

/** Catalog-only write entry. Safety flags live in write-policy.ts. */
export const W = (
  id: string,
  family: string,
  render: CommandDef['render'],
  args: ZodRawShape,
  desc: string,
): CommandDef => ({ id, family, kind: 'write', render, args, desc });

export interface SdkCommandOptions {
  args?: ZodRawShape;
  toInput?: (args: Record<string, unknown>) => unknown;
  validate?: (input: unknown) => unknown;
  format?: CommandDef['format'];
  secretArgs?: string[];
  snapshotRead?: string;
  skipCommit?: boolean;
  partial?: boolean;
}

function issuesOf(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues.map((i) => `${i.path.join('.') || '$'}: ${i.message}`).join('; ');
}

/**
 * SDK-backed command: `render` is DERIVED from the SDK op's `buildFrames`, so
 * the confirm gate/audit log/redaction/approval signature all operate on the
 * exact string later sent via `sdk.invoke()`. `kind` derives from SDK
 * classification (`read` → read; `write`/`destructive` → write).
 *
 * Tool `args`, `toInput`, and `validate` are all derived from the SDK's
 * published input schema (`inputSchemaFor(manifestId)`) unless the caller
 * overrides `args`/`toInput` (e.g. a curated tool with a hand-shaped legacy
 * arg surface) — `validate` (the schema's `full` zod parse against the
 * *mapped* SDK input) is always attached, so overriding `toInput` still gets
 * SDK-schema validation on its output.
 */
export const S = (
  id: string,
  family: string,
  manifestId: string,
  desc: string,
  opts: SdkCommandOptions = {},
): CommandDef => {
  const op = operationFor(manifestId);
  if (!op) {
    throw new Error(`registry: unknown SDK manifestId "${manifestId}" for tool "${id}"`);
  }
  const kind: CommandKind = op.classification === 'read' ? 'read' : 'write';
  const schema = inputSchemaFor(manifestId) ?? null;
  const converted = jsonSchemaToZod(schema);

  const autoToInput = (args: Record<string, unknown>): unknown =>
    converted.wrap === 'input' ? args.input : defaultToInput(args);
  const toInput = opts.toInput ?? autoToInput;

  const autoValidate = (input: unknown): unknown => {
    const result = converted.full.safeParse(input);
    if (!result.success) {
      throw new VigorCommandError(
        'invalid',
        `invalid input for SDK operation "${manifestId}": ${issuesOf(result.error)}`,
      );
    }
    return result.data;
  };
  const validate = opts.validate ?? autoValidate;

  const render: CommandDef['render'] = (args) => {
    const input = toInput(args);
    return op.buildFrames(input).map((f) => f.command).join('\n');
  };
  return {
    id,
    family,
    kind,
    desc,
    render,
    args: opts.args ?? converted.shape,
    ...(opts.format ? { format: opts.format } : {}),
    ...(opts.secretArgs ? { secretArgs: opts.secretArgs } : {}),
    ...(opts.snapshotRead ? { snapshotRead: opts.snapshotRead } : {}),
    ...(opts.skipCommit ? { skipCommit: opts.skipCommit } : {}),
    sdk: { manifestId, toInput, validate, ...(opts.partial ? { partial: true } : {}) },
  };
};
