import { R } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const objectFamily: FamilyDef = {
    family: 'object',
    desc: 'Objects (IP/service/keyword groups).',
    commands: [
      R('object_ip_view', 'object', 'object ip obj show', 'IP objects view'),
      R('object_service_view', 'object', 'object service obj show', 'Service objects view'),
    ],
  };
