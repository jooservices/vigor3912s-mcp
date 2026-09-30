import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';

// Divergence D3: `object ip obj show` / `object service obj show` don't
// exist — the heading's documented view sub-form is `object ip obj INDEX
// -v` / `object service obj INDEX -v` (CLI reference:
// docs/05-3912s-reference/cli-reference-raw.txt:5581-5592, 5810-5822). SDK
// is correct; `index` arg added to match.
export const objectFamily: FamilyDef = {
  family: 'object',
  desc: 'Objects (IP/service/keyword groups).',
  commands: [
    S('object_ip_view', 'object', 'cli.object.ip.obj', 'IP objects view', {
      args: { index: z.number().int().min(1).max(255) },
    }),
    S('object_service_view', 'object', 'cli.object.service.obj', 'Service objects view', {
      args: { index: z.number().int().min(1).max(255) },
    }),
  ],
};
