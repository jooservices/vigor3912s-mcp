import type { ZodRawShape } from 'zod';
import type { CommandDef } from './types.js';

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
