import { R } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const nandFamily: FamilyDef = {
    family: 'nand',
    desc: 'NAND storage diagnostics.',
    commands: [
      R('nand_usage', 'nand', 'nand usage', 'NAND storage usage'),
      R('nand_bad', 'nand', 'nand bad', 'NAND bad blocks'),
    ],
  };
