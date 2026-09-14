import { R } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const serviceFamily: FamilyDef = {
    family: 'service',
    desc: 'MyVigor service.',
    commands: [
      R('service_show', 'service', 'service show', 'MyVigor service status'),
      R('service_get', 'service', 'service get', 'MyVigor service data'),
    ],
  };
