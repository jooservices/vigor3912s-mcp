import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';

// Both tools bind to the single shared `cli.nand.bad.nand.usage` op (one
// discriminated-by-action TypedOperation covering both `nand bad` and
// `nand usage`), each pinning one action — partial.
export const nandFamily: FamilyDef = {
  family: 'nand',
  desc: 'NAND storage diagnostics.',
  commands: [
    S('nand_usage', 'nand', 'cli.nand.bad.nand.usage', 'NAND storage usage', {
        args: {},
        toInput: () => ({ action: 'usage' }),
        partial: true,
      }),
    S('nand_bad', 'nand', 'cli.nand.bad.nand.usage', 'NAND bad blocks', {
        args: {},
        toInput: () => ({ action: 'bad' }),
        partial: true,
      }),
  ],
};
