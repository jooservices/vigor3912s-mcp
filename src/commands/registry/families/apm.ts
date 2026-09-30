import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const apmFamily: FamilyDef = {
  family: 'apm',
  desc: 'AP management.',
  commands: [
    S('apm_show', 'apm', 'cli.apm.show', 'AP management status'),
    S('apm_query', 'apm', 'cli.apm.query', 'AP query'),
    // Divergence D3: `apm stanum` requires <AP_Index> per CLI reference
    // (docs/05-3912s-reference/cli-reference-raw.txt:12246); the legacy
    // bare-no-arg render was wrong. SDK is correct; arg added to match.
    S('apm_stanum', 'apm', 'cli.apm.stanum', 'AP station number', {
      args: { apIndex: z.number().int().positive() },
    }),
    S('apm_enable', 'apm', 'cli.apm.enable', 'Enable AP management'),
    S('apm_disable', 'apm', 'cli.apm.disable', 'Disable AP management'),
  ],
};
