import { R, S } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const serviceFamily: FamilyDef = {
  family: 'service',
  desc: 'MyVigor service.',
  commands: [
    // Divergence D3: `service show` doesn't exist — the documented status
    // display sub-form is `service -s` (CLI reference:
    // docs/05-3912s-reference/cli-reference-raw.txt:13042). SDK is correct.
    S('service_show', 'service', 'cli.service', 'MyVigor service status'),
    // No SDK op: `service get` matches none of the documented sub-forms
    // (-s/-r/-l/-i/-t/-c, CLI reference lines 13042-13047) and the SDK
    // deliberately narrows `cli.service` to `-s` only
    // (../vigor3912s-sdk/src/domains/service.ts). Left raw.
    R('service_get', 'service', 'service get', 'MyVigor service data'),
  ],
};
